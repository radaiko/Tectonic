/** Raised when an assembly cannot be built or edited as described. */
export class AssemblyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssemblyError'
  }
}

/** What a node in the assembly tree stands for. */
export const COMPONENT_KINDS = ['part', 'sub-assembly'] as const
export type ComponentKind = (typeof COMPONENT_KINDS)[number]
