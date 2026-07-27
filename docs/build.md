# Build instructions

Tectonic has two build chains: the TypeScript application (Vite) and the Rust geometric
kernel (wasm-pack). The generated WASM package is checked into the repository, so you only
need the Rust toolchain when you change kernel source.

---

## Requirements

| Tool          | Version                     | Needed for                       |
| ------------- | --------------------------- | -------------------------------- |
| Node.js       | 20 or newer                 | Everything                       |
| npm           | Ships with Node             | Everything                       |
| Rust          | Stable, 1.75 or newer       | Rebuilding the kernel            |
| wasm-pack     | 0.12 or newer               | Rebuilding the kernel            |
| Browser       | Latest 2 majors of Chrome, Edge, Firefox, Safari | Running the app |

---

## Application

### Install

```bash
git clone https://github.com/radaiko/Tectonic.git
cd Tectonic
npm install
```

### Develop

```bash
npm run dev
```

Vite serves the app on `http://localhost:5173` with hot module reload.

### Build

```bash
npm run build
```

Runs `tsc -b` and then `vite build`. Output lands in `dist/`. A type error fails the
build — the type check is not optional.

Preview the production bundle:

```bash
npm run preview
```

### Verify

```bash
npm test                    # Vitest, single run
npm run test:watch          # Vitest, watch mode
npm test -- --coverage      # coverage report, 90% threshold enforced
npx tsc --noEmit            # type check only
npm run lint                # ESLint
npm run format              # Prettier, writes in place
```

Coverage thresholds are set in `vite.config.ts` at 90% for lines, functions, branches and
statements. `src/3d/**` is excluded because it needs a real WebGL context, which jsdom
cannot provide.

---

## Rust kernel

The kernel lives in `kernel/` as a Cargo workspace with two crates:

| Crate              | Role                                                    |
| ------------------ | ------------------------------------------------------- |
| `tectonic-kernel`  | Pure Rust geometry: math, B-Rep, operations, meshing     |
| `tectonic-wasm`    | wasm-bindgen bindings that expose 14 operations to JS    |

### Toolchain

```bash
# Rust, if you do not have it
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# WASM target and wasm-pack
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### Test the kernel

```bash
cd kernel
cargo test              # 447 unit tests
cargo clippy --all-targets
cargo fmt --check
```

### Rebuild the WASM package

```bash
cd kernel/tectonic-wasm
wasm-pack build --target web --out-dir pkg
```

This regenerates `kernel/tectonic-wasm/pkg/`:

```
pkg/
├── package.json
├── tectonic_wasm.js          # JS glue
├── tectonic_wasm.d.ts        # TypeScript types
├── tectonic_wasm_bg.wasm     # the kernel
└── tectonic_wasm_bg.wasm.d.ts
```

The release profile in `kernel/Cargo.toml` optimizes for size (`opt-level = "s"`, LTO,
one codegen unit, `panic = "abort"`) because the kernel is fetched over the wire.

### Why `pkg/` is committed

`.gitignore` excludes `*.wasm` in general but re-includes
`kernel/tectonic-wasm/pkg/*.wasm`. The generated package is what the app ships, and a
clone without a Rust toolchain still has to type-check, build and test. Commit the
regenerated `pkg/` alongside any kernel change.

If the WASM module fails to load at runtime, the kernel bridge falls back to the
TypeScript `StubKernel`, so the app stays usable with reduced geometry support.

---

## Documentation site

`docs/` is a static site with no build step — `docs/index.html` is standalone with all CSS
inline and no external dependencies. Open it directly:

```bash
open docs/index.html
```

It deploys to GitHub Pages on every push to `main` via
`.github/workflows/docs.yml`, which uploads `docs/` with
`actions/upload-pages-artifact` and publishes it with `actions/deploy-pages`. Nothing is
compiled, so what you see locally is what ships.

To enable it on a fresh fork: repository **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

---

## Full check before pushing

```bash
npx tsc --noEmit
npm run lint
npm test
cd kernel && cargo test
```
