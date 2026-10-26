import { createLogger } from '@shengan/easy-code-core'
import pc from 'picocolors'
import { loadEasyCodeConfig } from '../config.js'

export interface DoctorOptions {
  readonly json?: boolean
  readonly cwd?: string
}

export interface DoctorInfo {
  readonly name: string
  readonly version: string
  readonly node: string
  readonly platform: string
  readonly arch: string
  readonly cwd: string
  readonly config: string | null
  readonly plugins: readonly string[]
  readonly logLevel: string
}

export async function collectDoctorInfo(
  options: DoctorOptions,
  version: string,
): Promise<DoctorInfo> {
  const cwd = options.cwd ?? process.cwd()
  const loaded = await loadEasyCodeConfig(cwd)

  return {
    name: 'easy-code',
    version,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd,
    config: loaded.source ?? null,
    plugins: loaded.config.plugins ?? [],
    logLevel: loaded.config.logLevel ?? 'info',
  }
}

export async function doctor(options: DoctorOptions, version: string): Promise<void> {
  const info = await collectDoctorInfo(options, version)

  if (options.json) {
    process.stdout.write(`${JSON.stringify(info, null, 2)}\n`)
    return
  }

  const logger = createLogger((level, message) => {
    if (level === 'debug') return
    process.stdout.write(`${message}\n`)
  })

  const row = (label: string, value: string): string => `${pc.dim(label.padEnd(10))} ${value}`

  logger.info(pc.bold('doctor'))
  process.stdout.write(`${row('version', info.version)}\n`)
  process.stdout.write(`${row('node', info.node)}\n`)
  process.stdout.write(`${row('platform', `${info.platform} ${info.arch}`)}\n`)
  process.stdout.write(`${row('cwd', info.cwd)}\n`)
  process.stdout.write(`${row('config', info.config ?? 'not found')}\n`)
  process.stdout.write(
    `${row('plugins', info.plugins.length > 0 ? info.plugins.join(', ') : 'none')}\n`,
  )
  process.stdout.write(`${row('logLevel', info.logLevel)}\n`)
}
