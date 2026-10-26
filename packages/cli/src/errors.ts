export interface CliErrorOptions {
  readonly exitCode?: number
  readonly cause?: unknown
}

export class CliError extends Error {
  readonly exitCode: number

  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'CliError'
    this.exitCode = options.exitCode ?? 1
  }
}
