# Phase B – WA1 Discovery Note

- Phase: B (Trust Engine v1)
- Work Area: WA1 – Seed minimal Vitest spec and enforce presence
- Date: 2025-10-09

## Integration Points

- src/utils/seedTests.ts:1
  - seedTestsInFiles(files): Ensures at least one spec at `tests/smoke.spec.ts` and guarantees a `test` script in `package.json`.
  - seedTestsOnDisk(root): Creates `tests/smoke.spec.ts` and adds/normalizes `package.json` test script.

- src/server.ts:plan path (~lines 343–360)
  - Calls `await seedTestsOnDisk(targetRoot)` immediately after plan execution and file reconciliation.

- src/server.ts:single execution (~lines 657–665)
  - Executes `output.files = seedTestsInFiles(output.files)` before writing files to disk.

- src/runner/detectTestCommand.ts
  - Returns `npm test` if a test script exists; otherwise falls back to framework-specific defaults.

## Current Implementation (Snippets)

```ts
// src/utils/seedTests.ts
export function seedTestsInFiles(files: GeneratedFile[]): GeneratedFile[] {
  const out = [...files];
  const hasTest = out.some(f => /\.(test|spec)\.[cm]?tsx?$/.test(f.path));
  if (!hasTest) {
    out.push({ path: 'tests/smoke.spec.ts', contents: `import { describe, it, expect } from 'vitest';\n` +
      `describe('smoke', () => { it('runs', () => { expect(true).toBe(true); }); });\n` });
  }
  const pkgIdx = out.findIndex(f => f.path.replace(/^\.\/?/, '') === 'package.json');
  if (pkgIdx >= 0) {
    out[pkgIdx] = { path: out[pkgIdx].path, contents: ensureTestScript(out[pkgIdx].contents) };
  } else {
    out.push({ path: 'package.json', contents: ensureTestScript('{}') });
  }
  return out;
}
```

```ts
// src/server.ts (plan path)
// Ensure seed tests exist on disk for plan-based generations
await seedTestsOnDisk(targetRoot);
```

```ts
// src/server.ts (single execution)
// Seed a minimal test and ensure test script before write
output.files = seedTestsInFiles(output.files);
```

## Justification

- Deterministic verification: Every generation gets at least one test file and a guaranteed test command.
- Minimal, non-breaking: No API changes; only adds a smoke spec/package script in generated outputs.
- Repair-friendly: If dependencies are missing, the repair loop guides completion.

## Compliance Check (ai-stack.json)

- Language: TS/JS only – compliant.
- Frontend: No `/public` changes – compliant.
- Testing: Vitest – aligned.
- No new dependencies – compliant.

## Potential Impacts

- Projects without lockfiles may skip install in sandbox; tests still seeded but could fail until dependencies are added by generation or repair.

## Validation Plan

- npm run lint
- npm run typecheck
- npm test
- npm run contract:check
- npm run sbom

