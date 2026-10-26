export type LoggerLevel = 'info' | 'warn' | 'debug'

export type LogSink = (level: LoggerLevel, message: string) => void

export interface Logger {
  info(message: string): void
  warn(message: string): void
  debug(message: string): void
}

export function createLogger(sink: LogSink, prefix = 'easy-code'): Logger {
  const emit = (level: LoggerLevel, message: string): void => {
    sink(level, `[${prefix}] ${message}`)
  }

  return {
    info: (message: string): void => emit('info', message),
    warn: (message: string): void => emit('warn', message),
    debug: (message: string): void => emit('debug', message),
  }
}
