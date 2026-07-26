/**
 * Identity for sketch entities and constraints. Ids are opaque strings so the
 * .tectonic format never depends on ordering or array indices.
 */
export function newId(): string {
  const webCrypto = globalThis.crypto as Crypto | undefined
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID()

  // Older Safari and non-secure contexts do not expose randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
