import * as readline from 'readline'
import { createOpenAiClient, OpenAiClient } from './clients/openAiClient'
import { executeCommand } from './clients/terminalClient'
import { Logger, logger } from './Logger'

const rli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function getCodeFromMarkdown(markdown: string): string[] {
  const codeBlockRegex = /```([\s\S]*?)```/gm
  const codeBlock = codeBlockRegex.exec(markdown)
  if (codeBlock) {
    const code = codeBlock[1]
    const commands = code.split('\n').filter((cmd) => cmd.trim() !== '')
    return commands
  }
  return []
}

async function executeCommands(
  commands: string[],
  logger: Logger
): Promise<string> {
  let combinedCommandOutput = ''

  for (const code of commands) {
    logger.info(`Executing code: "${code}"`)
    const commandResponse = await executeCommand(code)
    if (commandResponse.status === 'failure') {
      logger.error('Code execution error: ', commandResponse.error)
      return `Error executing command: ${commandResponse.error}`
    }
    logger.info('Code execution response: ', commandResponse.output)
    combinedCommandOutput += commandResponse.output + '\n'
  }

  return combinedCommandOutput.trim()
}

async function assistantExecute(
  openaiClient: OpenAiClient,
  message: string,
  logger: Logger
): Promise<string> {
  const gptResponse = await openaiClient.chatCompletion(message)

  if (gptResponse?.includes('```')) {
    const commands = getCodeFromMarkdown(gptResponse)
    const combinedCommandOutput = await executeCommands(commands, logger)

    const gptResponseToCodeOutput = await openaiClient.chatCompletion(
      JSON.stringify(combinedCommandOutput)
    )
    return assistantExecute(
      openaiClient,
      gptResponseToCodeOutput ?? 'completed',
      logger
    )
  }

  return gptResponse ?? 'assistant output was not a string'
}

async function evaluate(input: string, openai: OpenAiClient): Promise<string> {
  try {
    const parsed = input.toString()
    const assistantOutput = await assistantExecute(openai, parsed, logger)
    return assistantOutput
  } catch (error: any) {
    console.error(error)
    return error.message
  }
}

async function runRepl(openai: OpenAiClient): Promise<void> {
  rli.question('user> ', async (input: string) => {
    const userInput = await evaluate(input, openai)
    console.log(`assistant> ${userInput}`)
    runRepl(openai)
  })
}

async function main() {
  const openai = createOpenAiClient(logger)
  await runRepl(openai)
}

main()
