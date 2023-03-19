import { Configuration, OpenAIApi } from 'openai'

export type Role = 'user' | 'system' | 'assistant'
type SupportedLanguage = 'JavaScript/Node' | 'Python' | 'Rust'

class Message {
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
) => {
  return (
    `You are gpt-interpreter, a large language model based on ${model}.` +
    `Your task as an assistant is to help the user write software in ${programminglanguage}.` +
    `You have command line access to the project folder on the ${operatingsystem} operating system.` +
    `Any output you generate that is in a command line format will be interpreted as a command to run.`
  )
}
const MODEL = 'gpt-3.5-turbo'

export const createOpenAiClient = () => {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  })
  const openai = new OpenAIApi(configuration)

  const currentOs = process.platform
  const currentLanguage = 'JavaScript/Node'

  const systemPrompt = getSystemPrompt(MODEL, currentLanguage, currentOs)

  const chatCompletion = async (
    message: string
  ): Promise<string | undefined> => {
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        new Message('system', systemPrompt).toJson(),
        new Message('user', message).toJson()
      ]
    })

    const chosenOutput = completion.data.choices[0].message?.content
    console.log(chosenOutput)
    return chosenOutput
  }

  return {
    chatCompletion
  }
}

export type OpenAiClient = ReturnType<typeof createOpenAiClient>