import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Aucune dépendance entre tests, aucun ordre implicite (testing-strategy.md §7).
afterEach(() => {
  cleanup()
})
