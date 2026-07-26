=== CURRENT STATE ===
- ✅ Fresh Vite + React + TypeScript + three.js project to create
- ❌ Nothing exists yet — just CLAUDE.md and .gitignore

=== WHAT TO BUILD — Phase 1/5: Project Scaffold + Minimal App Shell ===

Set up the Vite project with React, TypeScript, and three.js. Create the complete folder structure. Build the start screen and test 3D viewport.

1. Initialize the project:
   - `npm create vite@latest . -- --template react-ts`
   - Install: `three`, `@types/three`, `vitest`, `@vitest/coverage-v8`, `eslint`, `prettier`
   - Do NOT delete the existing CLAUDE.md

2. Create the folder structure:
   ```
   src/
   ├── app/       # App shell, routing, start screen
   ├── ui/        # Common UI components
   ├── domain/    # Domain models
   ├── kernel/    # Kernel interface
   ├── io/        # I/O services
   ├── 3d/        # three.js viewport
   tests/         # Tests
   docs/          # Documentation
   ```

3. Build the Start Screen (src/app/StartScreen.tsx):
   - Two large buttons: "New Document" and "Open File"
   - "Open File" triggers a file picker (.tectonic extension)
   - "New Document" creates a blank document and transitions to the editor
   - Clean, minimal design with "Tectonic" branding
   - No accounts, no cloud, no recent files list

4. Build the App Shell (src/app/AppShell.tsx):
   - Manages state: start screen vs editor mode
   - Routes between StartScreen and EditorView
   - Handles file open events from the start screen

5. Build the 3D Viewport (src/3d/ThreeViewport.tsx):
   - Uses three.js to render a 3D scene
   - OrbitControls for rotate/pan/zoom
   - Shows a test shape (a box or extruded profile)
   - Responsive to container size
   - Proper resize handling

6. Define the Kernel Interface (src/kernel/IKernel.ts):
   - Abstract interface for all geometric operations
   - Methods: createBox, extrude, booleanUnion, booleanSubtract, booleanIntersect, fillet, chamfer, triangulate
   - Returns: mesh data (vertices, indices, normals)
   - No concrete implementation yet — just the interface contract

7. Build a Kernel stub (src/kernel/StubKernel.ts):
   - Implements IKernel using three.js BufferGeometry directly
   - createBox returns a simple box mesh
   - This is temporary — will be replaced by WASM kernel later

8. Define the Document Model (src/domain/Document.ts):
   - Document: version, metadata, parts, bodies, features list
   - Part: id, name, bodies
   - Body: id, name, mesh data reference
   - Simple serializable types

9. File I/O (src/io/FileService.ts):
   - openFile(): opens file picker, reads .tectonic JSON, returns Document
   - createNewDocument(): returns empty Document
   - saveFile(document): triggers download of .tectonic JSON
   - serialize/deserialize: JSON round-trip for Document

10. Test the serialization (tests/io/FileService.test.ts):
    - Create a document, serialize it, deserialize it, verify equality
    - Test that empty document round-trips

11. Wire it all together in App.tsx

=== CROSS-CUTTING ===
- All source code in src/, tests in tests/
- Domain models must NOT import from React or three.js
- TypeScript strict mode in tsconfig.json
- npm run dev should start the dev server and show the start screen
- npm test should run the serialization test
- npm run test -- --coverage should report coverage

=== DON'T ===
- Don't delete CLAUDE.md
- Don't create any .tectonic files (these are user files)
- Don't add auto-save, localStorage, or any persistence beyond explicit file save/download
- Don't add accounts, login, or cloud features
- Don't add more complexity than what's specified

=== AFTER ===
- Verify: npm run dev starts and shows start screen
- Verify: npx tsc --noEmit passes
- Verify: npm test passes with > 0% coverage
- Commit everything: git add -A && git commit -m "feat: project scaffold, start screen, 3D viewport, kernel interface, file I/O"

Do NOT ask questions. Build it.