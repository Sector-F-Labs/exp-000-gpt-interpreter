import * as fs from 'fs/promises'
import { Message, OpenAiClient } from './clients/openAiClient'
import { executeCommand } from './clients/terminalClient'
import { Logger } from './Logger'

async function writeCodeToSandbox(
  code: string,
  fileName: string
): Promise<void> {
  const filePath = `./sandbox/${fileName}`
  await fs.writeFile(filePath, code, 'utf-8')
}
function getCodeFromMarkdown(
  markdown: string
): Array<{ codeType: string; code: string; fileName?: string }> {
  const codeBlocks = []
  const multilineCodeBlockRegex = /```(.*?)\n([\s\S]*?)```/gm
  const singlelineCodeBlockRegex = /`([^`]+)`/g
  let match

  // Extract multi-line code blocks
  while ((match = multilineCodeBlockRegex.exec(markdown)) !== null) {
    const codeType = match[1].toLowerCase().split(' ')[0] || 'bash'
    const code = match[2].trim()
    const fileName = match[1].toLowerCase().split(' ')[1] || undefined
    codeBlocks.push({ codeType, code, fileName })
  }

  // Extract single-line code blocks
  while ((match = singlelineCodeBlockRegex.exec(markdown)) !== null) {
    const codeType = 'bash'
    const code = match[1].trim()
    codeBlocks.push({ codeType, code })
  }

  return codeBlocks
}

export async function assistantExecute(
  openaiClient: OpenAiClient,
  message: string,
  logger: Logger
): Promise<string> {
  if (message.includes('```')) {
    const codeBlocks = getCodeFromMarkdown(message)
    let combinedCommandOutput = ''

    for (const { codeType, code, fileName } of codeBlocks) {
      if (codeType === 'bash' || codeType === 'sh') {
        logger.info(`Executing code: "${code}"`)
        const commandResponse = await executeCommand(code)

        if (commandResponse.status === 'failure') {
          logger.error('Code execution error: ', commandResponse.error)
          return `Error executing command: ${commandResponse.error}`
        }
        logger.info('Code execution response: ', commandResponse.output)
        combinedCommandOutput += commandResponse.output + '\n'
      } else {
        const targetFileName = fileName || 'generated_code.js'
        await writeCodeToSandbox(code, targetFileName)
        logger.info(`Code written to sandbox/${targetFileName}`)
      }
    }

    const gptResponseToCodeOutput = await openaiClient.chatCompletion(
      new Message('system', JSON.stringify(combinedCommandOutput.trim()))
    )
    return assistantExecute(
      openaiClient,
      gptResponseToCodeOutput ?? 'completed',
      logger
    )
  }

  return message ?? 'assistant output was not a string'
}
