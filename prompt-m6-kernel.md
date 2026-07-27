=== CURRENT STATE ===
- ✅ StubKernel (three.js-based, temporary)
- ✅ IKernel interface
- ❌ Real B-Rep kernel — all operations use approximate three.js geometry
- 1,159 tests passing

=== BUILD — Real B-Rep Kernel with OpenCascade WASM ===

The StubKernel uses three.js for all geometric operations. This produces approximate, non-watertight, non-manifold geometry that will fail on real CAD operations (complex fillets, shells, booleans). Replace it with OpenCascade via WASM.

=== 1. RESEARCH & INTEGRATE OpenCascade WASM ===

Research the best WASM OpenCascade option. Options:
- opencascade.js (https://github.com/donalffons/opencascade.js) — full OpenCascade compiled to WASM
- OCCT WASM builds from the OpenCascade project itself
- Any maintained fork that works in browser

For each option check:
- Is it maintained? (last commit < 1 year)
- Does it compile cleanly for browser WASM?
- Is the bundle size reasonable?
- Does it expose B-Rep operations via a JS API?

Pick the best option and write the integration in src/kernel/wasm/:

**WasmLoader.ts**:
- Async load of OpenCascade WASM module
- Progress callback for loading status
- Error handling if WASM fails to load (fallback to StubKernel with warning)
- Singleton pattern (load once, reuse)

=== 2. OpenCascadeKernel ===

Create `src/kernel/OpenCascadeKernel.ts` implementing IKernel:

Wire each IKernel method to the OpenCascade equivalent:

| IKernel method | OpenCascade API |
|---|---|
| createBox(w, h, d) | BRepPrimAPI_MakeBox |
| extrude(profile, dist) | BRepPrimAPI_MakePrism |
| revolve(profile, axis, angle) | BRepPrimAPI_MakeRevol |
| sweep(profile, path) | BRepOffsetAPI_MakePipeShell |
| loft(profiles) | BRepOffsetAPI_ThruSections |
| booleanUnion(a, b) | BRepAlgoAPI_Fuse |
| booleanSubtract(a, b) | BRepAlgoAPI_Cut |
| booleanIntersect(a, b) | BRepAlgoAPI_Common |
| fillet(body, edges, radius) | BRepFilletAPI_MakeFillet |
| chamfer(body, edges, d1, d2) | BRepFilletAPI_MakeChamfer |
| shell(body, faces, thickness) | BRepOffsetAPI_MakeThickSolid |
| thicken(surface, thickness) | BRepOffsetAPI_MakeThickSolid |
| stitch(surfaces) | BRepBuilderAPI_Sewing |
| split(body, plane) | BRepAlgoAPI_Split |
| triangulate(body, quality) | BRepMesh_IncrementalMesh |
| getMassProperties(body) | GProp_GProps + BRepGProp |
| getFaces(body), getEdges(body) | TopExp_Explorer |
| getCenterOfMass(body) | BRepGProp_FluidProperties |

Each method returns the standard IKernel result: { vertices, indices, normals } for rendering.

=== 3. KERNEL SWITCH ===

Modify `src/kernel/index.ts` to export a kernel factory:

```typescript
async function createKernel(): Promise<IKernel> {
  try {
    const wasmKernel = await OpenCascadeKernel.create()
    return wasmKernel
  } catch (e) {
    console.warn('OpenCascade WASM failed to load, falling back to StubKernel', e)
    return new StubKernel()
  }
}
```

The app tries to load OpenCascade WASM on startup. If it fails (or while WASM is loading), it falls back to StubKernel. This keeps the app functional during development.

=== 4. TESTS ===

Create `tests/kernel/OpenCascadeKernel.test.ts`:
- Test that the WASM module loads
- Test basic operations: createBox, extrude, boolean operations
- Test that results are valid (non-zero face count, closed solid)
- Test triangulation produces valid mesh data
- Test mass properties return sensible values

=== CROSS-CUTTING ===
- TypeScript strict mode
- WASM loading is async with progress indication
- Fallback to StubKernel is graceful (user sees a warning, app continues)
- Bundle: OpenCascade WASM is loaded separately from the main app bundle (code-split)
- npm test passes

=== AFTER ===
- Verify: npx tsc --noEmit
- Verify: npm test
- Commit: git add -A && git commit -m "feat: OpenCascade WASM B-Rep kernel — real NURBS geometry for all solid operations"

Do NOT ask questions. Build it.