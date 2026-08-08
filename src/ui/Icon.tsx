import './Icon.css'

/**
 * The application's icon set.
 *
 * Every glyph is drawn as vector art on a 24-unit grid and stroked in
 * `currentColor`, so one definition serves a ribbon button, a browser row and a
 * disabled control without a second asset — the colour comes from whatever the
 * icon is sitting inside. This replaces the text glyphs (`▣`, `◉`, `✎`) the
 * panels used to wear: those are font-dependent, un-styleable, read aloud by
 * screen readers as whatever Unicode calls them, and are the single clearest
 * signal that an interface was assembled rather than designed.
 *
 * The drawings say what the command *does* — a shape being pushed along an
 * arrow for extrude, a corner losing its edge for chamfer — rather than
 * abbreviating its name.
 */

/**
 * Stroked path — the default for anything that reads as line art.
 *
 * Takes the rest of the SVG path attributes so a glyph can dash a construction
 * line or nudge a shape into place without dropping out of the shorthand.
 */
function P(props: React.SVGProps<SVGPathElement> & { readonly d: string }): React.ReactElement {
  return <path {...props} />
}

/** Filled dot, for handles and status marks. */
function Dot({
  x,
  y,
  r = 1.6,
}: {
  readonly x: number
  readonly y: number
  readonly r?: number
}): React.ReactElement {
  return <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />
}

const GLYPHS = {
  /* --- Application ------------------------------------------------------- */
  'file-new': (
    <>
      <P d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z" />
      <P d="M13 3v6h6" />
    </>
  ),
  'folder-open': (
    <>
      <P d="M3 8V6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v2" />
      <P d="M3 8h17.2a1 1 0 0 1 .97 1.24l-2 8A1 1 0 0 1 18.2 18H4a1 1 0 0 1-1-1Z" />
    </>
  ),
  save: (
    <>
      <P d="M5 3h11l3 3v15H5Z" />
      <P d="M8 3v6h7V3" />
      <P d="M8 21v-7h8v7" />
    </>
  ),
  export: (
    <>
      <P d="M12 3v11" />
      <P d="M8 10.5 12 14.5 16 10.5" />
      <P d="M4 17v3h16v-3" />
    </>
  ),
  close: <P d="M6 6 18 18M18 6 6 18" />,
  undo: (
    <>
      <P d="M4 9h10a5 5 0 0 1 0 10h-6" />
      <P d="M8 5 4 9l4 4" />
    </>
  ),
  redo: (
    <>
      <P d="M20 9H10a5 5 0 0 0 0 10h6" />
      <P d="M16 5l4 4-4 4" />
    </>
  ),
  help: (
    <>
      <circle cx={12} cy={12} r={9} />
      <P d="M9.4 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.2-2.6 3.9" />
      <Dot x={12} y={17.2} r={1.1} />
    </>
  ),
  search: (
    <>
      <circle cx={10.5} cy={10.5} r={6.5} />
      <P d="M15.2 15.2 20.5 20.5" />
    </>
  ),
  warning: (
    <>
      <P d="M12 3.5 22 20H2Z" />
      <P d="M12 10v4.5" />
      <Dot x={12} y={17.4} r={1.1} />
    </>
  ),

  /* --- Browser and structure --------------------------------------------- */
  'chevron-right': <P d="M9.5 5.5 16 12l-6.5 6.5" />,
  'chevron-down': <P d="M5.5 9.5 12 16l6.5-6.5" />,
  eye: (
    <>
      <P d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx={12} cy={12} r={3} />
    </>
  ),
  'eye-off': (
    <>
      <P d="M4 5.5 20 18.5" />
      <P d="M9.6 6.1A9.6 9.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.3 3.9" />
      <P d="M6.5 8.2A16.6 16.6 0 0 0 2.5 12s3.5 6.2 9.5 6.2a9.7 9.7 0 0 0 3.2-.55" />
      <P d="M10.2 10.4a2.9 2.9 0 0 0 3.7 4.1" />
    </>
  ),
  isolate: (
    <>
      <P d="M12 4.5 19 8.5v7L12 19.5 5 15.5v-7Z" />
      <P d="M3 3.5h2.5M3 3.5V6M21 3.5h-2.5M21 3.5V6M3 20.5h2.5M3 20.5V18M21 20.5h-2.5M21 20.5V18" />
    </>
  ),
  folder: <P d="M3 6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />,
  origin: (
    <>
      <P d="M12 4v16M4 12h16" />
      <Dot x={12} y={12} r={2} />
    </>
  ),
  plane: (
    <>
      <P d="M3.5 8.5 14 4.5l6.5 3.5L10 12Z" />
      <P d="M10 12v7.5l10.5-4V8" />
    </>
  ),
  axis: (
    <>
      <P d="M4 20 20 4" />
      <P d="M20 4v5M20 4h-5" />
      <Dot x={4} y={20} />
    </>
  ),
  point: (
    <>
      <P d="M12 5v3.5M12 15.5V19M5 12h3.5M15.5 12H19" />
      <Dot x={12} y={12} r={2.2} />
    </>
  ),
  body: (
    <>
      <P d="M12 3 21 8v8l-9 5-9-5V8Z" />
      <P d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  component: (
    <>
      <P d="M4 4h7v7H4ZM13 4h7v7h-7ZM4 13h7v7H4Z" />
      <P d="M13 13h7v7h-7Z" strokeDasharray="2.6 2.2" />
    </>
  ),
  document: (
    <>
      <P d="M6 3h8l4 4v14H6Z" />
      <P d="M14 3v4h4" />
      <P d="M9 12h6M9 16h6" />
    </>
  ),
  timeline: (
    <>
      <P d="M3 12h18" />
      <Dot x={7} y={12} r={2.4} />
      <Dot x={13} y={12} r={2.4} />
      <P d="M17.6 9.6h3.4v4.8h-3.4Z" />
    </>
  ),
  suppressed: (
    <>
      <circle cx={12} cy={12} r={8.5} strokeDasharray="2.5 2.5" />
      <P d="M8.5 12h7" />
    </>
  ),

  /* --- Sketch ------------------------------------------------------------ */
  sketch: (
    <>
      <P d="M3.5 17.5 13 8l3.5 3.5L7 21H3.5Z" />
      <P d="M14.6 6.4 17 4a1.6 1.6 0 0 1 2.3 0l1.3 1.3a1.6 1.6 0 0 1 0 2.3l-2.4 2.4Z" />
    </>
  ),
  'sketch-finish': (
    <>
      <P d="M4 16.5 11 9.5l3 3L21 5.5" />
      <P d="M4 20.5h17" />
      <P d="M15.5 5.5H21v5.5" />
    </>
  ),
  dimension: (
    <>
      <P d="M4 6v12M20 6v12" />
      <P d="M4 12h16" />
      <P d="M7 9.5 4 12l3 2.5M17 9.5 20 12l-3 2.5" />
    </>
  ),
  constraint: (
    <>
      <P d="M9.5 14.5 4.8 19.2a3.1 3.1 0 0 1-4.3-4.4l0 0" transform="translate(3 -1)" />
      <P d="M9 15 15 9" />
      <P d="M14.5 9.5 19.2 4.8a3.1 3.1 0 0 1 4.4 4.4l0 0" transform="translate(-3 1)" />
    </>
  ),

  /* --- Create ------------------------------------------------------------- */
  extrude: (
    <>
      <P d="M4 15.5h7v5H4Z" strokeDasharray="2.6 2.2" />
      <P d="M4 15.5 8 12h7l-4 3.5M11 20.5l4-3.5v-5" />
      <P d="M18 13V4.5" />
      <P d="M15.4 7.1 18 4.5l2.6 2.6" />
    </>
  ),
  revolve: (
    <>
      <P d="M6 20V4" strokeDasharray="3 2.4" />
      <P d="M10 18.5c4.6 0 8.4-2.9 8.4-6.5S14.6 5.5 10 5.5" />
      <P d="M10 5.5v13" />
      <P d="M12.6 8.1 10 5.5l2.6-2.6" transform="translate(0 2.6)" />
    </>
  ),
  sweep: (
    <>
      <P d="M3.5 18.5c4-8 9.5-10.5 17-11" />
      <P d="M1.8 15.6 5.2 17l-1.4 3.4Z" />
      <P d="M14.6 4.6h6v6h-6Z" transform="rotate(-14 17.6 7.6)" />
    </>
  ),
  loft: (
    <>
      <P d="M4 18h9l-2.5 3H2Z" />
      <P d="M11.5 4.5h8.5L18 8h-8.5Z" />
      <P d="M4 18 9.5 8M13 18l7-9.5" strokeDasharray="2.6 2.2" />
    </>
  ),
  hole: (
    <>
      <P d="M3.5 6.5h17v11h-17Z" />
      <ellipse cx={12} cy={12} rx={3.4} ry={5} />
      <P d="M12 7v10" strokeDasharray="2.4 2" />
    </>
  ),
  rib: (
    <>
      <P d="M4 20V8M20 20V8" />
      <P d="M4 20h16" />
      <P d="M11 20V6h2v14" />
    </>
  ),

  /* --- Modify -------------------------------------------------------------- */
  fillet: (
    <>
      <P d="M4 20V11A7 7 0 0 1 11 4h9" />
      <P d="M4 4h7" strokeDasharray="2.4 2" />
      <P d="M4 4v7" strokeDasharray="2.4 2" />
      <Dot x={11} y={4} r={1.3} />
    </>
  ),
  chamfer: (
    <>
      <P d="M4 20V12L12 4h8" />
      <P d="M4 4h8M4 4v8" strokeDasharray="2.4 2" />
    </>
  ),
  shell: (
    <>
      <P d="M3.5 4.5h17v15h-17Z" />
      <P d="M7.5 8.5h9v11h-9Z" strokeDasharray="2.6 2.2" />
    </>
  ),
  draft: (
    <>
      <P d="M6 20 9 5h6l3 15Z" />
      <P d="M9 5v15M15 5v15" strokeDasharray="2.4 2" />
    </>
  ),
  pattern: (
    <>
      <P d="M3.5 3.5h6v6h-6ZM14.5 3.5h6v6h-6ZM3.5 14.5h6v6h-6Z" />
      <P d="M14.5 14.5h6v6h-6Z" strokeDasharray="2.4 2" />
    </>
  ),
  mirror: (
    <>
      <P d="M12 3v18" strokeDasharray="3 2.4" />
      <P d="M9.5 6.5 3 12l6.5 5.5Z" />
      <P d="M14.5 6.5 21 12l-6.5 5.5Z" strokeDasharray="2.4 2" />
    </>
  ),
  scale: (
    <>
      <P d="M4 20V9h11v11Z" />
      <P d="M9 15V4h11v11h-5" strokeDasharray="2.6 2.2" />
    </>
  ),
  combine: (
    <>
      <circle cx={9} cy={12} r={6} />
      <circle cx={15} cy={12} r={6} />
    </>
  ),
  split: (
    <>
      <P d="M12 3v18" strokeDasharray="3 2.4" />
      <P d="M9.5 6h-6v12h6Z" />
      <P d="M14.5 6h6v12h-6Z" />
    </>
  ),
  'direct-edit': (
    <>
      <P d="M12 3 20.5 8v8L12 21 3.5 16V8Z" />
      <P d="M8 13.5 12 9.5l4 4" />
      <Dot x={12} y={9.5} r={1.6} />
    </>
  ),
  'sheet-metal': (
    <>
      <P d="M3 16h9a4 4 0 0 0 4-4V6" />
      <P d="M3 19h9a7 7 0 0 0 7-7V6" />
      <P d="M13.4 8.4 16 6l2.6 2.4" transform="translate(0 -2)" />
    </>
  ),
  surface: (
    <>
      <P d="M3 15c4.5-6 6.5 3 11-3s5.5-1.5 7-3" />
      <P d="M3 19c4.5-6 6.5 3 11-3s5.5-1.5 7-3" strokeDasharray="2.6 2.2" />
    </>
  ),
  mesh: (
    <>
      <P d="M12 3 21 8.5v7L12 21 3 15.5v-7Z" />
      <P d="M3 8.5 12 14l9-5.5M12 14v7M12 3 7.5 11.2M12 3l4.5 8.2" />
    </>
  ),
  assemble: (
    <>
      <circle cx={7} cy={7} r={3.5} />
      <circle cx={17} cy={17} r={3.5} />
      <P d="M9.6 9.6 14.4 14.4" />
    </>
  ),
  measure: (
    <>
      <P d="M2.8 14.4 14.4 2.8l6.8 6.8L9.6 21.2Z" />
      <P d="M7 10.2 8.8 12M10.2 7 12 8.8M13.4 3.8l1.8 1.8" />
    </>
  ),
  section: (
    <>
      <P d="M4 4h16v16H4Z" />
      <P d="M4 15.5 20 8.5" />
      <P d="M4 15.5 20 8.5 20 20H4Z" fill="currentColor" opacity={0.18} stroke="none" />
    </>
  ),
  make: (
    <>
      <P d="M7 9V4h10v5" />
      <P d="M4.5 9h15v6h-15Z" />
      <P d="M7 15v5h10v-5" />
    </>
  ),
  view: (
    <>
      <P d="M12 3.5 20 8v8l-8 4.5L4 16V8Z" />
      <P d="M4 8l8 4.5L20 8M12 12.5v8" />
      <P d="M12 3.5 20 8" strokeWidth={2.2} />
    </>
  ),
  grid: (
    <>
      <P d="M3.5 3.5h17v17h-17Z" />
      <P d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
    </>
  ),
  kernel: (
    <>
      <P d="M8.5 8.5h7v7h-7Z" />
      <P d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21M5.6 5.6l2.9 2.9M18.4 5.6l-2.9 2.9M5.6 18.4l2.9-2.9M18.4 18.4l-2.9-2.9" />
    </>
  ),
} as const

export type IconName = keyof typeof GLYPHS

export interface IconProps {
  readonly name: IconName
  /** Edge length in pixels. The grid is 24, so anything scales cleanly. */
  readonly size?: number
  readonly className?: string
  /**
   * A name for the accessibility tree. Left out — which is the common case,
   * because the icon sits beside its own label — the glyph is hidden from it
   * rather than being announced as decoration nobody asked about.
   */
  readonly title?: string
}

export function Icon({ name, size = 16, className, title }: IconProps): React.ReactElement {
  return (
    <svg
      className={['icon', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      focusable="false"
    >
      {GLYPHS[name]}
    </svg>
  )
}

/** Whether a name is one this set actually draws. */
export function hasIcon(name: string): name is IconName {
  return name in GLYPHS
}

export const ICON_NAMES = Object.keys(GLYPHS) as readonly IconName[]
