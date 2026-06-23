import { defineConfig } from 'vitest/config'

/** Runs external AI evaluations sequentially with explicit live-test settings. */
export default defineConfig({
  test: {
    include: ['tests/live/**/*.live.test.ts'],
    env: {
      RUN_AI_TRIAGE_EVAL: 'true',
    },
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    passWithNoTests: false,
  },
})
