import * as readline from 'readline'

import {
  createOpenAiClient,
  Message,
  OpenAiClient
} from './clients/openAiClient'
import { logger } from './Logger'
import { assistantExecute } from './assistantExecute'

const rli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function evaluate(
  input: string,
  openAiClient: OpenAiClient
): Promise<string> {
  try {
    const parsed = input.toString()
    const gptResponse = await openAiClient.chatCompletion(
      new Message('user', parsed)
    )
    const assistantOutput = await assistantExecute(
      openAiClient,
      gptResponse ?? 'completed',
      logger
    )
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
