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

type CodeFromMDResponse = {
  codeType: string
  code: string
  fileName?: string
  execution?: boolean
}

function getCodeFromMarkdown(markdown: string): Array<CodeFromMDResponse> {
  const codeBlockRegex = /```(?:([\w.]+(?:\/[\w.]+)?)\s+)?([\s\S]*?)```/gm
  const codeBlocks: Array<CodeFromMDResponse> = []

  let match
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const codeType = match[1] || 'bash'
    const code = match[2]
    const commands = code.split('\n').filter((cmd) => cmd.trim() !== '')
    const fileName = codeType !== 'bash' ? codeType : undefined
    const execution = codeType === 'bash'

    codeBlocks.push({
      codeType,
      code: commands.join('\n'),
      fileName,
      execution
    })
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

    for (const { codeType, code, fileName, execution } of codeBlocks) {
      if (execution) {
        logger.info(`Executing ${codeType} code: "${code}"`)
        const commandResponse = await executeCommand(code)
        if (commandResponse.status === 'failure') {
          logger.error('Code execution error: ', commandResponse.error)
          return `Error executing command: ${commandResponse.error}`
        }
        logger.info('Code execution response: ', commandResponse.output)
        combinedCommandOutput += commandResponse.output + '\n'
      } else {
        const targetFileName = fileName || 'generated_code.txt'
        await writeCodeToSandbox(code, targetFileName)
        logger.info(
          `Code of type ${codeType} written to ./sandbox/${targetFileName}`
        )
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
