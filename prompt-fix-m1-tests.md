Fix the 2 failing tests in tests/sketch/SketchEditor.test.tsx. The errors are:

1. Test "renders sketch editor with grid" — expecting text "Grid: 10 mm" but not found. Check what the actual rendered status bar text is and adjust the assertion.

2. Test "shows DOF count after adding entities" — expecting text "4 DOF" but not found. Check what the actual DOF text format is in the status bar and adjust.

Do NOT change any source code. Only fix the test assertions in tests/sketch/SketchEditor.test.tsx so they match the actual rendered output.

After fixing, run: npm test -- --coverage
All 520+ tests must pass and coverage must be 90%+.

Do NOT ask questions.