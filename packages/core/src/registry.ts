import { EasyCodeError } from './errors.js'
import type { EasyCodePlugin } from './plugin.js'

export interface PluginRegistry {
  register(plugin: EasyCodePlugin): void
  get(name: string): EasyCodePlugin | undefined
  list(): readonly EasyCodePlugin[]
}

export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, EasyCodePlugin>()

  return {
    register(plugin: EasyCodePlugin): void {
      if (plugins.has(plugin.name)) {
        throw new EasyCodeError(`Plugin already registered: ${plugin.name}`, {
          code: 'PLUGIN_DUPLICATE',
        })
      }
      plugins.set(plugin.name, plugin)
    },
    get(name: string): EasyCodePlugin | undefined {
      return plugins.get(name)
    },
    list(): readonly EasyCodePlugin[] {
      return [...plugins.values()]
    },
  }
}
