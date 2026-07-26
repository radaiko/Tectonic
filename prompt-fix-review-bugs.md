Fix the following critical bugs found by a 3-agent code review. Each was flagged by 2+ reviewers as a MUST FIX:

1. **src/assembly/Mate.ts or src/assembly/MateSolver.ts**: There is a bug where `drivenValues` incorrectly clamps angle values against distance limits, causing parts to silently mis-orient on 6 joint types (revolute, slider/prismatic, cylindrical, planar, ball/screw, gear/belt, rack-and-pinion). Find the clamping code that mixes angle/distance limits and fix it.

2. **src/assembly/MateSolver.ts**: The `conflicting` flag is set tautologically — it always returns true when there are redundant mates, making the error state unusable. Fix the conflict detection logic so it only returns true for actual over-constrained conflicts, not harmless redundant mates.

3. **src/surface/SurfaceEditing.ts or wherever TRIM_DEFAULTS is defined**: There is a shared mutable `TRIM_DEFAULTS` object where `.surfaceBodyIds` gets mutated via `.push()`, corrupting the defaults for every future trim and split operation. Make the defaults immutable or clone them before mutation.

For each fix:
- Read the relevant source files
- Identify the exact bug
- Fix only the bug — do not refactor anything else
- Run npm test to confirm all tests still pass
- Run npx tsc --noEmit to confirm TypeScript is clean

Do NOT ask questions. Fix all 3 bugs.