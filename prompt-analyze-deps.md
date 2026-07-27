Analyze all direct npm dependencies of the Tectonic project at ~/dev/private/Tectonic and determine which ones we can replace with our own implementation.

Read package.json first, then for each dependency:
1. Check what parts of it we actually use across the entire src/ codebase
2. Estimate the effort to implement those features ourselves in pure TypeScript
3. Recommend whether to KEEP or REPLACE

Scoring:
- **KEEP**: Dependency is too complex to reimplement (e.g., three.js's 3D math, React's virtual DOM, testing framework, TypeScript compiler)
- **REPLACE**: We only use a tiny fraction of the library's API, and the replacement is < 500 lines of simple code
- **OPTIONAL**: Borderline — could go either way, give reasoning

Current dependencies from package.json:
- react, react-dom
- three
- @types/* (type definitions — exclude these, they're just types)
- vite, @vitejs/plugin-react
- typescript
- vitest, @vitest/coverage-v8
- @testing-library/react, @testing-library/dom, @testing-library/user-event, jsdom
- eslint, prettier, eslint-config-prettier, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals

For each dependency, search the src/ codebase to see how many imports and which specific APIs we use. Be specific about what we import and use.

Output a summary table with columns: Package, Our Usage, Replace Effort, Recommendation