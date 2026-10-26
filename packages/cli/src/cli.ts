#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { cac } from 'cac'
import pc from 'picocolors'
import { CliError } from './errors.js'

function readVersion(): string {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version?: string }

  return manifest.version ?? '0.0.0'
}

const cli = cac('easy-code')
const version = readVersion()

cli
  .command('doctor', 'Print environment and configuration diagnostics')
  .option('--json', 'Output JSON')
  .option('--cwd <dir>', 'Working directory')
  .action(async (options: { json?: boolean; cwd?: string }) => {
    const { doctor } = await import('./commands/doctor.js')
    await doctor(options, version)
  })

cli.help()
cli.version(version)

try {
  const parsed = cli.parse(process.argv, { run: false })
  const unknownCommand = !cli.matchedCommand && parsed.args[0]

  if (unknownCommand) {
    process.stderr.write(`${pc.red('error')} Unknown command: ${unknownCommand}\n`)
    process.exitCode = 2
  } else {
    await cli.runMatchedCommand()
  }
} catch (error) {
  if (error instanceof CliError) {
    process.stderr.write(`${pc.red('error')} ${error.message}\n`)
    process.exitCode = error.exitCode
  } else {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${pc.red('error')} ${message}\n`)
    if (process.env.DEBUG) {
      process.stderr.write(`${error instanceof Error ? `${error.stack ?? ''}\n` : ''}`)
    }
    process.exitCode = 1
  }
}
