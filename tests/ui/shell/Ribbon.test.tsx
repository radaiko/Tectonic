import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Ribbon } from '../../../src/ui/shell'
import type { RibbonTab } from '../../../src/ui/shell'

/**
 * The ribbon is the application's command surface, so the things worth pinning
 * down are the ones a user would notice going wrong: which tab is showing, that
 * the whole strip is reachable from the keyboard, and — above all — that a
 * command which cannot run says so rather than pretending.
 */
function tabs(overrides: Partial<RibbonTab>[] = []): RibbonTab[] {
  const base: RibbonTab[] = [
    {
      id: 'solid',
      label: 'Solid',
      groups: [
        {
          id: 'create',
          label: 'Create',
          commands: [{ id: 'c:extrude', label: 'Extrude', icon: 'extrude' }],
        },
      ],
    },
    {
      id: 'surface',
      label: 'Surface',
      groups: [
        {
          id: 'surface-create',
          label: 'Create',
          commands: [{ id: 'c:patch', label: 'Patch', icon: 'surface' }],
        },
      ],
    },
    { id: 'mesh', label: 'Mesh', groups: [], placeholder: 'Mesh editing is not in this editor.' },
  ]
  return base.map((tab, index) => ({ ...tab, ...overrides[index] }))
}

function renderRibbon(props: Partial<Parameters<typeof Ribbon>[0]> = {}) {
  const onTabChange = vi.fn()
  const result = render(
    <Ribbon
      tabs={tabs()}
      activeTabId="solid"
      onTabChange={onTabChange}
      label="Workspace"
      {...props}
    />,
  )
  return { ...result, onTabChange }
}

describe('Ribbon workspaces', () => {
  it('shows only the active tab’s commands', () => {
    renderRibbon()

    expect(screen.getByRole('button', { name: 'Extrude' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Patch' })).toBeNull()
  })

  it('marks the active tab and asks for the one that was clicked', async () => {
    const { onTabChange } = renderRibbon()

    expect(screen.getByRole('tab', { name: 'Solid' }).getAttribute('aria-selected')).toBe('true')
    await userEvent.click(screen.getByRole('tab', { name: 'Surface' }))

    // Controlled: the ribbon asks, the editor decides. Nothing has switched yet.
    expect(onTabChange).toHaveBeenCalledWith('surface')
  })

  it('is one tab stop, with the arrows moving inside it', async () => {
    const { onTabChange } = renderRibbon()

    // The pattern a tablist owes a keyboard user: the inactive tabs are out of
    // the tab order, and the arrows are what walk the strip.
    expect(screen.getByRole('tab', { name: 'Solid' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('tab', { name: 'Surface' }).getAttribute('tabindex')).toBe('-1')

    screen.getByRole('tab', { name: 'Solid' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onTabChange).toHaveBeenLastCalledWith('surface')

    await userEvent.keyboard('{End}')
    expect(onTabChange).toHaveBeenLastCalledWith('mesh')

    // And it wraps, so the last tab is one key from the first.
    await userEvent.keyboard('{ArrowLeft}')
    expect(onTabChange).toHaveBeenLastCalledWith('mesh')
  })

  it('says what an unbuilt workspace is for instead of showing an empty strip', () => {
    renderRibbon({ activeTabId: 'mesh' })

    expect(screen.getByText('Mesh editing is not in this editor.')).toBeDefined()
  })
})

describe('Ribbon command states', () => {
  it('groups commands under a caption, named for assistive technology too', () => {
    renderRibbon()

    const group = screen.getByRole('group', { name: 'Create' })
    expect(within(group).getByRole('button', { name: 'Extrude' })).toBeDefined()
  })

  it('takes a command that is not usable right now out of the tab order', () => {
    renderRibbon({
      tabs: tabs([
        {
          groups: [
            {
              id: 'create',
              label: 'Create',
              commands: [{ id: 'c:extrude', label: 'Extrude', icon: 'extrude', disabled: true }],
            },
          ],
        },
      ]),
    })

    // "Not right now" resolves itself as soon as there is a sketch, so there is
    // nothing to learn from stopping on it.
    expect(screen.getByRole('button', { name: 'Extrude' })).toHaveProperty('disabled', true)
  })

  it('keeps an unsupported command reachable, and puts the reason in its name', async () => {
    const onSelect = vi.fn()
    renderRibbon({
      tabs: tabs([
        {
          groups: [
            {
              id: 'create',
              label: 'Create',
              commands: [
                {
                  id: 'c:extrude',
                  label: 'Fillet',
                  icon: 'fillet',
                  unavailable: 'not available on the "stub" kernel',
                  onSelect,
                },
              ],
            },
          ],
        },
      ]),
    })

    const button = screen.getByRole('button', { name: /^Fillet — not available/ })
    // `aria-disabled`, not `disabled`: the reason is worth being able to reach.
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.getAttribute('aria-disabled')).toBe('true')

    await userEvent.click(button)

    // And pressing it does nothing at all, rather than reporting success.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reports a stateful command as pressed', () => {
    renderRibbon({
      tabs: tabs([
        {
          groups: [
            {
              id: 'create',
              label: 'Create',
              commands: [{ id: 'c:line', label: 'Line', icon: 'sketch', active: true }],
            },
          ],
        },
      ]),
    })

    expect(screen.getByRole('button', { name: 'Line' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('names the command region a toolbar when the commands are one setting', () => {
    renderRibbon({ commandsRole: 'toolbar', commandsLabel: 'Sketch tools' })

    expect(screen.getByRole('toolbar', { name: 'Sketch tools' })).toBeDefined()
  })

  it('pins a trailing action outside the scrolling command groups', () => {
    renderRibbon({ trailing: <button type="button">Finish Sketch</button> })

    expect(screen.getByRole('button', { name: 'Finish Sketch' })).toBeDefined()
  })
})
