import { exec } from 'child_process'

interface CommandResult {
  status: 'success' | 'failure'
  output?: string
  error?: string
}

export async function executeCommand(command: string): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve, reject) => {
    const cwd = process.cwd()
    process.chdir('./sandbox')
    exec(command, (error, stdout, stderr) => {
      process.chdir(cwd)
      if (error) {
        reject({
          status: 'failure',
          error: error.message.trim()
        })
        return
      }
      if (stderr) {
        resolve({
          status: 'failure',
          error: stderr.trim()
        })
        return
      }
      resolve({
        status: 'success',
        output: stdout.trim()
      })
    })
  })
}
