/** How a viewport projects the scene. */
export type ProjectionMode = 'perspective' | 'orthographic'

/**
 * How bodies are drawn. These are display-only: nothing here changes the model,
 * so a viewport may switch style at any time without a rebuild.
 */
export type VisualStyle = 'shaded' | 'shadedEdges' | 'wireframe' | 'xray' | 'hiddenLine' | 'technical'

/** The canned camera orientations reachable from the view cube and the menus. */
export type StandardView =
  | 'front'
  | 'back'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'isometric'
  | 'dimetric'
  | 'trimetric'

/** Arrangement of the viewport panes inside the 3D frame. */
export type ViewportLayoutId = 'single' | 'twoHorizontal' | 'twoVertical' | 'quad'

/** How much of the model a section view cuts away. */
export type SectionMode = 'off' | 'half' | 'quarter' | 'octant'
