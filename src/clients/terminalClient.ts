import { exec, spawn } from 'child_process'

interface CommandResult {
  status: 'success' | 'failure'
  output?: string
  error?: string
}

export async function executeCommand(command: string): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve) => {
    const cwd = process.cwd()
    process.chdir('./sandbox')

    const [cmd, ...args] = command.split(' ')
    const childProcess = spawn(cmd, args, { stdio: 'inherit' })

    childProcess.on('exit', (code) => {
      process.chdir(cwd)
      if (code === 0) {
        resolve({
          status: 'success',
          output: 'Command executed successfully'
        })
      } else {
        resolve({
          status: 'failure',
          error: `Command exited with code ${code}`
        })
      }
    })
  })
}
