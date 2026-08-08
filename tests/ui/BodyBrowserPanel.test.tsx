import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Body, Part } from '../../src/domain/Document'
import { BodyBrowserPanel } from '../../src/ui/BodyBrowserPanel'
import type { SelectionItem } from '../../src/view/selection'
import { boxMesh } from '../helpers/meshes'

function body(id: string, name: string): Body {
  return { id, name, mesh: boxMesh() }
}

const OWNERS = new Map([
  ['body-1', 'extrude-1'],
  ['body-2', 'extrude-1'],
  ['body-3', 'revolve-1'],
])

const NAMES: Record<string, string> = { 'extrude-1': 'Extrude 1', 'revolve-1': 'Revolve 1' }

function renderBrowser(overrides: Partial<Parameters<typeof BodyBrowserPanel>[0]> = {}) {
  return render(
    <BodyBrowserPanel
      bodies={[body('body-1', 'Base'), body('body-2', 'Boss'), body('body-3', 'Hub')]}
      ownerByBody={OWNERS}
      featureName={(id) => NAMES[id]}
      {...overrides}
    />,
  )
}

describe('BodyBrowserPanel', () => {
  it('says what an empty document is missing rather than just "none"', () => {
    render(<BodyBrowserPanel bodies={[]} />)

    // An empty browser is the first thing a new document shows, so it is the
    // natural place to say what the next step is.
    expect(screen.getByText(/Sketch on a plane and extrude it/)).toBeDefined()
  })

  it('gathers bodies under the feature that last wrote them', () => {
    renderBrowser()

    const fromExtrude = within(screen.getByLabelText('Bodies from Extrude 1'))
    expect(fromExtrude.getByText('Base')).toBeDefined()
    expect(fromExtrude.getByText('Boss')).toBeDefined()
    expect(fromExtrude.queryByText('Hub')).toBeNull()

    expect(within(screen.getByLabelText('Bodies from Revolve 1')).getByText('Hub')).toBeDefined()
  })

  it('keeps the groups in timeline order rather than map order', () => {
    renderBrowser()

    const headings = screen.getAllByRole('button', { name: /^(Extrude|Revolve) 1$/ })
    expect(headings.map((node) => node.textContent)).toEqual(['Extrude 1', 'Revolve 1'])
  })

  it('shows a body whose owning feature is unknown rather than hiding it', () => {
    render(<BodyBrowserPanel bodies={[body('body-9', 'Orphan')]} />)

    // An evaluation without owner information still has real bodies in it;
    // dropping them would make the browser lie about what the document holds.
    expect(within(screen.getByLabelText('Bodies from Modelled')).getByText('Orphan')).toBeDefined()
  })

  it('lists the imported bodies under their part', () => {
    const part: Part = { id: 'part-1', name: 'Bracket', bodies: [body('body-i', 'Imported')] }

    render(<BodyBrowserPanel bodies={[]} parts={[part]} />)

    expect(within(screen.getByLabelText('Bodies from Bracket')).getByText('Imported')).toBeDefined()
  })

  it('selects a body with the same item a viewport click produces', async () => {
    const onSelectionChange = vi.fn()
    renderBrowser({ onSelectionChange })

    await userEvent.click(screen.getByRole('button', { name: /^Base/ }))

    const expected: SelectionItem = { kind: 'body', bodyId: 'body-1' }
    expect(onSelectionChange).toHaveBeenCalledWith([expected])
  })

  it('adds to the selection when the click is modified', async () => {
    const onSelectionChange = vi.fn()
    const selection: readonly SelectionItem[] = [{ kind: 'body', bodyId: 'body-1' }]
    renderBrowser({ selection, onSelectionChange })

    // One session, so the held modifier is still held when the click lands.
    const user = userEvent.setup()
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /^Boss/ }))
    await user.keyboard('{/Shift}')

    expect(onSelectionChange).toHaveBeenCalledWith([
      { kind: 'body', bodyId: 'body-1' },
      { kind: 'body', bodyId: 'body-2' },
    ])
  })

  it('marks the picked body so the list and the scene agree', () => {
    renderBrowser({ selection: [{ kind: 'body', bodyId: 'body-2' }] })

    expect(screen.getByRole('button', { name: /^Boss/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /^Base/ }).getAttribute('aria-pressed')).toBe('false')
  })

  it('opens the feature that made a body from its heading', async () => {
    const onSelectFeature = vi.fn()
    renderBrowser({ onSelectFeature })

    await userEvent.click(screen.getByRole('button', { name: 'Revolve 1' }))

    // "What built this?" is the question the browser is best placed to answer,
    // so the heading is the way back into the feature's parameters.
    expect(onSelectFeature).toHaveBeenCalledWith('revolve-1')
  })
})
