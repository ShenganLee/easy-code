export interface EasyCodeErrorOptions {
  readonly code?: string
  readonly exitCode?: number
  readonly cause?: unknown
}

export class EasyCodeError extends Error {
  readonly code: string
  readonly exitCode: number

  constructor(message: string, options: EasyCodeErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'EasyCodeError'
    this.code = options.code ?? 'EASY_CODE_ERROR'
    this.exitCode = options.exitCode ?? 1
  }
}
