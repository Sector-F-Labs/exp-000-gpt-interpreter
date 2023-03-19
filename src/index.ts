import * as readline from 'readline'
import { createOpenAiClient, OpenAiClient } from './clients/openAiClient'
import { executeCommand } from './clients/terminalClient'

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

const logger = {
  info: console.log,
  error: console.error
}
export type Logger = typeof logger

async function evaluate(input: string, openai: OpenAiClient): Promise<string> {
  async function assistantExecute(message: string): Promise<string> {
    const gptResponse = await openai.chatCompletion(message)
    if (gptResponse?.includes('```')) {
      const commands = getCodeFromMarkdown(gptResponse)
      let combinedCommandOutput = ''

      for (const code of commands) {
        logger.info('Executing code: ', code)
        const commandResponse = await executeCommand(code)
        if (commandResponse.status === 'failure') {
          logger.error('Code execution error: ', commandResponse.error)
          return `Error executing command: ${commandResponse.error}`
        }
        logger.info('Code execution response: ', commandResponse.output)
        combinedCommandOutput += commandResponse.output + '\n'
      }

      const gptResponseToCodeOutput = await openai.chatCompletion(
        JSON.stringify(combinedCommandOutput.trim())
      )
      return assistantExecute(gptResponseToCodeOutput ?? 'completed')
    }
    return gptResponse ?? 'assistant output was not a string'
  }

  try {
    const parsed = input.toString()
    const assistantOutput = await assistantExecute(parsed)

    // const commandResult = await executeCommand(parsed)
    // const assistantOutput = JSON.stringify(commandResult)

    return assistantOutput //?.trim() ?? 'output was not a string'
  } catch (error: any) {
    console.error(error)
    return error.message
  }
}

async function runRepl(openai: OpenAiClient): Promise<void> {
  rli.question('> ', async (input: string) => {
    const userInput = await evaluate(input, openai)
    console.log(`The user input was: ${userInput}`)
    runRepl(openai)
  })
}

async function main() {
  const openai = createOpenAiClient(logger)
  await runRepl(openai)
}

main()
