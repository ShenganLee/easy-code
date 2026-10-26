export type LogLevel = 'silent' | 'info' | 'debug'

export interface EasyCodeConfig {
  readonly plugins?: readonly string[]
  readonly logLevel?: LogLevel
}

export function defineConfig<T extends EasyCodeConfig>(config: T): T {
  return config
}
