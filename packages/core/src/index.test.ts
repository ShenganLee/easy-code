import { describe, expect, it } from 'vitest'
import { defineConfig } from './config.js'
import { EasyCodeError } from './errors.js'
import { createLogger } from './logger.js'
import { definePlugin } from './plugin.js'
import { createPluginRegistry } from './registry.js'

describe('defineConfig', () => {
  it('returns the same object', () => {
    const config = defineConfig({ plugins: ['alpha'], logLevel: 'debug' })

    expect(config.plugins).toEqual(['alpha'])
    expect(config.logLevel).toBe('debug')
  })
})

describe('definePlugin', () => {
  it('returns the same plugin', () => {
    const plugin = definePlugin({
      name: 'alpha',
      setup: () => {},
    })

    expect(plugin.name).toBe('alpha')
  })
})

describe('createPluginRegistry', () => {
  it('registers, reads, and lists plugins', () => {
    const registry = createPluginRegistry()
    const plugin = definePlugin({ name: 'alpha', setup: () => {} })

    registry.register(plugin)

    expect(registry.get('alpha')).toBe(plugin)
    expect(registry.list()).toEqual([plugin])
  })

  it('rejects duplicate names', () => {
    const registry = createPluginRegistry()
    const plugin = definePlugin({ name: 'alpha', setup: () => {} })

    registry.register(plugin)

    expect(() => registry.register(plugin)).toThrowError(EasyCodeError)
  })
})

describe('createLogger', () => {
  it('prefixes messages and forwards the level', () => {
    const messages: string[] = []
    const logger = createLogger((level, message) => {
      messages.push(`${level}:${message}`)
    }, 'test')

    logger.info('hello')
    logger.warn('careful')
    logger.debug('details')

    expect(messages).toEqual(['info:[test] hello', 'warn:[test] careful', 'debug:[test] details'])
  })
})

describe('EasyCodeError', () => {
  it('carries code and exit code', () => {
    const error = new EasyCodeError('boom', { code: 'BOOM', exitCode: 2 })

    expect(error.message).toBe('boom')
    expect(error.code).toBe('BOOM')
    expect(error.exitCode).toBe(2)
  })
})
