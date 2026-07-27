/**
 * The keyboard reference behind the help overlay. This is the single place the
 * documented bindings live, so a shortcut that changes is edited once and the
 * overlay, the command palette hints and the docs site all follow.
 */

/** One documented binding: the keys to press and what they do. */
export interface KeyBinding {
  /**
   * Keys of a chord, shown as separate caps — `['Ctrl', 'Shift', 'Z']`. Mouse
   * gestures are a single entry spelled out, e.g. `['Left drag']`.
   */
  readonly keys: readonly string[]
  readonly action: string
}

export interface ShortcutSection {
  readonly title: string
  /** Where the bindings apply, shown under the title. */
  readonly scope: string
  readonly bindings: readonly KeyBinding[]
}

export const SHORTCUT_SECTIONS: readonly ShortcutSection[] = [
  {
    title: 'General',
    scope: 'Anywhere in the application',
    bindings: [
      { keys: ['?'], action: 'Toggle this help' },
      { keys: ['F1'], action: 'Toggle this help' },
      { keys: ['Ctrl', 'P'], action: 'Command palette' },
      { keys: ['Ctrl', 'N'], action: 'New document' },
      { keys: ['Ctrl', 'O'], action: 'Open file' },
      { keys: ['Ctrl', 'S'], action: 'Save / export' },
      { keys: ['Ctrl', 'Z'], action: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
      { keys: ['Esc'], action: 'Cancel the current tool' },
      { keys: ['Del'], action: 'Delete the selection' },
      { keys: ['Ctrl', 'Shift', 'D'], action: 'Toggle developer overlay' },
      { keys: ['Ctrl', 'Shift', 'F'], action: 'Toggle FPS lock' },
    ],
  },
  {
    title: 'Sketch tools',
    scope: 'While the sketch surface is active',
    bindings: [
      { keys: ['V'], action: 'Select tool' },
      { keys: ['L'], action: 'Line tool' },
      { keys: ['C'], action: 'Circle tool' },
      { keys: ['A'], action: 'Arc tool' },
      { keys: ['R'], action: 'Rectangle tool' },
      { keys: ['D'], action: 'Dimension tool' },
      { keys: ['T'], action: 'Trim tool' },
      { keys: ['F'], action: 'Fillet tool' },
      { keys: ['M'], action: 'Mirror tool' },
      { keys: ['P'], action: 'Pattern tool' },
    ],
  },
  {
    title: '3D view',
    scope: 'While the 3D surface is active',
    bindings: [
      { keys: ['Left drag'], action: 'Orbit' },
      { keys: ['Middle drag'], action: 'Pan' },
      { keys: ['Scroll'], action: 'Zoom' },
      { keys: ['F'], action: 'Fit to screen' },
    ],
  },
  {
    title: 'Profile / Sheet metal',
    scope: 'Turns the active sketch into solid geometry',
    bindings: [
      { keys: ['E'], action: 'Extrude' },
      { keys: ['S'], action: 'Shell' },
      { keys: ['B'], action: 'Base flange' },
    ],
  },
]
