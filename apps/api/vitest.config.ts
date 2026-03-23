import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // API integration tests require a real DB/Redis — added in Phase 4.
    // passWithNoTests prevents CI failure until integration tests are wired.
    passWithNoTests: true,
    environment: 'node',
  },
})
