import type { EasyCodeConfig } from './config.js'

export interface PluginContext {
  readonly cwd: string
  readonly config: EasyCodeConfig
}

export interface EasyCodePlugin {
  readonly name: string
  readonly version?: string
  readonly setup: (context: PluginContext) => void | Promise<void>
}

export function definePlugin<T extends EasyCodePlugin>(plugin: T): T {
  return plugin
}
