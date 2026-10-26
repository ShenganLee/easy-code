import type { EasyCodeConfig } from '@shengan/easy-code-core'
import { loadConfig } from 'unconfig'
import * as v from 'valibot'
import { CliError } from './errors.js'

const configSchema = v.object({
  plugins: v.optional(v.array(v.string()), []),
  logLevel: v.optional(v.picklist(['silent', 'info', 'debug']), 'info'),
})

export interface LoadedConfig {
  readonly config: EasyCodeConfig
  readonly source: string | undefined
}

export async function loadEasyCodeConfig(cwd: string): Promise<LoadedConfig> {
  let loaded: Awaited<ReturnType<typeof loadConfig<EasyCodeConfig>>>

  try {
    loaded = await loadConfig<EasyCodeConfig>({
      cwd,
      sources: [
        {
          files: 'easy-code.config',
          extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', ''],
        },
      ],
    })
  } catch (error) {
    throw new CliError('Failed to load easy-code config.', {
      exitCode: 2,
      cause: error,
    })
  }

  const parsed = v.safeParse(configSchema, loaded.config ?? {})
  if (!parsed.success) {
    throw new CliError('Invalid easy-code config.', {
      exitCode: 2,
      cause: parsed.issues,
    })
  }

  return {
    config: parsed.output,
    source: loaded.sources?.[0],
  }
}
