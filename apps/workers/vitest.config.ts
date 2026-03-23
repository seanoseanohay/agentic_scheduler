import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Workers tests require a real DB/Redis — integration tests added in Phase 4.
    // passWithNoTests prevents CI failure when unit tests are not yet written.
    passWithNoTests: true,
    environment: 'node',
  },
})
