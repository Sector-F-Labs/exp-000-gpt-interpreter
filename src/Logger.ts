import * as fs from 'fs'
import * as path from 'path'

const logsDir = './logs'
const logFilePath = path.join(logsDir, 'app.log')

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir)
}

// Create a writable stream for the log file
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' })

// Custom log and error functions that write to the log file and console
const log = (message: string, ...args: any) => {
  const timestamp = new Date().toISOString()
  const p = JSON.stringify(args)
  const logMessage = `${timestamp} - INFO: ${message}\n ${p}\n`
  logStream.write(logMessage)
}

const error = (message: string, ...args: any) => {
  const timestamp = new Date().toISOString()
  const p = JSON.stringify(args)
  const errorMessage = `${timestamp} - ERROR: ${message}\n ${p}\n`
  logStream.write(errorMessage)
}

export const logger = {
  info: log,
  error: error
}

export type Logger = typeof logger
