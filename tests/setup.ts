import { afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { installCanvas2dMock } from './helpers/mockCanvas'

// jsdom has no 2D context; without one every canvas-backed component would log
// "not implemented" and render nothing.
beforeAll(() => {
  installCanvas2dMock()
})

afterEach(() => {
  cleanup()
})
