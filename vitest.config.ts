import { defineConfig } from 'vitest/config'

// The specs run in jsdom (per-file pragma); every src import is either a local
// module or a type-only `@deepseek-ai/cordis` import erased before resolution.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
  },
})
