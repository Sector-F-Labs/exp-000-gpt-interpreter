import { Configuration, OpenAIApi } from 'openai'
import { Logger } from '../Logger'

export type Role = 'user' | 'system' | 'assistant'
type SupportedLanguage = 'JavaScript/Node' | 'Python' | 'Rust'

export class Message {
  constructor(private role: Role, public message: string) {}

  toJson() {
    return {
      role: this.role,
      content: this.message
    }
  }
}

const getSystemPrompt = (
  model: string,
  programminglanguage: SupportedLanguage,
  operatingsystem: string
): string => {
  return `You are gpt-interpreter, an AI terminal interface based on ${model}.
  You operate as a layer between a user and the system they are running on, and turn their requests
  into executable commands.
  You have command line access to a system running ${operatingsystem} and have execution context in the correct directory.
  When you respond, if terminal commands are found found in between triple backticks they will be executed and the 
  response will be sent back to you by the system immediately, the rest of the message will be ignored. this system
  can only execute one line at a time. The user cannot read messages that are sent to the system. They only see messages that dont backticks. 
  The system will recursively respond back to you until you send a message that does not contain code.`
}

const MODEL = 'gpt-3.5-turbo'

const history: Array<Message> = []

export const createOpenAiClient = (logger: Logger) => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  })
  const openai = new OpenAIApi(configuration)

  const currentOs = process.platform
  const currentLanguage = 'JavaScript/Node'

  const systemPrompt = getSystemPrompt(MODEL, currentLanguage, currentOs)

  const chatCompletion = async (
    message: Message
  ): Promise<string | undefined> => {
    history.push(message)

    const messages = [
      new Message('system', systemPrompt).toJson(),
      ...history.map((m) => m.toJson())
    ]

    logger.info('Sending messages to GPT: ', messages)

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages
    })

    const chosenOutput = completion.data.choices[0].message?.content
    console.log(chosenOutput)
    history.push(new Message('assistant', chosenOutput ?? ''))
    return chosenOutput
  }

  return {
    chatCompletion
  }
}

export type OpenAiClient = ReturnType<typeof createOpenAiClient>
