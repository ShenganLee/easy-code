import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'

const cliPath = fileURLToPath(new URL('../../packages/cli/dist/cli.js', import.meta.url))
const cliManifest = JSON.parse(
  readFileSync(new URL('../../packages/cli/package.json', import.meta.url), 'utf8'),
) as { version: string }

describe('easy-code cli', () => {
  it('prints the version', async () => {
    const result = await execa('node', [cliPath, '--version'])

    expect(result.stdout).toContain(cliManifest.version)
  })

  it('prints help with the doctor command', async () => {
    const result = await execa('node', [cliPath, '--help'])

    expect(result.stdout).toContain('doctor')
  })

  it('runs doctor --json in a clean directory', async () => {
    const result = await execa('node', [cliPath, 'doctor', '--json'], {
      cwd: tmpdir(),
    })
    const info = JSON.parse(result.stdout) as {
      name: string
      plugins: string[]
      logLevel: string
      config: string | null
    }

    expect(info.name).toBe('easy-code')
    expect(info.plugins).toEqual([])
    expect(info.logLevel).toBe('info')
    expect(info.config).toBeNull()
  })

  it('fails on an unknown command', async () => {
    const result = await execa('node', [cliPath, 'not-a-command'], {
      reject: false,
    })

    expect(result.exitCode).not.toBe(0)
  })
})
