import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: './packages/core',
          include: ['src/**/*.test.ts'],
          environment: 'node',
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
      {
        test: {
          name: 'enum',
          root: './packages/enum',
          include: ['src/**/*.test.ts'],
          environment: 'node',
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
      {
        test: {
          name: 'cli',
          root: './packages/cli',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'e2e',
          root: './',
          include: ['tests/e2e/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
          pool: 'forks',
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Coverage gates the library packages. The CLI is exercised as a black
      // box by the e2e project; add CLI unit coverage in Phase 1.
      include: ['packages/core/src/**/*.ts', 'packages/enum/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test-d.ts', '**/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
    typecheck: {
      include: ['**/*.test-d.ts'],
    },
  },
})
