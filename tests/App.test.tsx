import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

// See EditorView.test.tsx — jsdom has no WebGL context.
vi.mock('../src/3d/ThreeViewport', () => ({
  ThreeViewport: () => <div data-testid="three-viewport" />,
}))

describe('App', () => {
  it('mounts the shell on the start screen', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Tectonic' })).toBeDefined()
  })
})
