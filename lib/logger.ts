// Centralized logging utility to replace console statements

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const baseMessage = `[${timestamp}] [${level}] ${message}`
    
    if (data) {
      return `${baseMessage}\n${JSON.stringify(data, null, 2)}`
    }
    
    return baseMessage
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      // In production, you might want to send this to a logging service
      if (process.env.NODE_ENV === 'development') {
        console.log(this.formatMessage('DEBUG', message, data))
      }
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      // In production, you might want to send this to a logging service
      if (process.env.NODE_ENV === 'development') {
        console.log(this.formatMessage('INFO', message, data))
      }
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      // In production, you might want to send this to a logging service
      if (process.env.NODE_ENV === 'development') {
        console.warn(this.formatMessage('WARN', message, data))
      }
    }
  }

  error(message: string, error?: Error | any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      // In production, you might want to send this to a logging service
      if (process.env.NODE_ENV === 'development') {
        console.error(this.formatMessage('ERROR', message, error))
      }
    }
  }
}

// Create logger instance
export const logger = new Logger(
  process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL) : LogLevel.INFO
)

// Export convenience functions
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: Error | any) => logger.error(message, error)
}
