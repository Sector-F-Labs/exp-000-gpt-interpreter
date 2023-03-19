import * as readline from 'readline'
import { createOpenAiClient, OpenAiClient } from './clients/openAiClient'
import { executeCommand } from './clients/terminalClient'

const rli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function getCodeFromMarkdown(markdown: string): string {
  const codeBlockRegex = /```(.*)```/gm
  const codeBlock = codeBlockRegex.exec(markdown)
  if (codeBlock) {
    return codeBlock[1]
  }
  return ''
}

const logger = {
  info: console.log
}

async function evaluate(input: string, openai: OpenAiClient): Promise<string> {
  async function assistantExecute(message: string): Promise<string> {
    const gptResponse = await openai.chatCompletion(message)
    if (gptResponse?.includes('```')) {
      const code = getCodeFromMarkdown(gptResponse)
      logger.info('Executing code: ', code)
      const commandResponse = await executeCommand(code)
      logger.info('Code execution response: ', commandResponse)
      const gptResponseToCodeOutput = await openai.chatCompletion(
        JSON.stringify(commandResponse)
      )
      return assistantExecute(gptResponseToCodeOutput ?? 'completed')
    }
    return gptResponse ?? 'assistant output was not a string'
  }

  try {
    const parsed = input.toString()
    const assistantOutput = await assistantExecute(parsed)

    return assistantOutput?.trim() ?? 'output was not a string'
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
  const openai = createOpenAiClient()
  await runRepl(openai)
}

main()
