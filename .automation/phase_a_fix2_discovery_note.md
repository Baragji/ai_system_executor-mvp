# Phase A-FIX-2 Discovery Note: Dependency Validation Preflight

**Created**: 2025-10-10  
**Phase**: A-FIX-2 (Dependency Validation Preflight)  
**Contract**: contracts/Roadmap_execution/PA-FIX2_dependency_preflight.json

---

## Executive Summary

This discovery phase identifies the exact integration point for dependency validation in the executor's install flow. The goal is to add a **preflight check** that validates all package.json dependencies exist in npm registry **before** running `npm install`, preventing failures from invalid versions hallucinated by GPT-5-mini.

---

## Current Execution Flow

### 1. Entry Point: `runInSandbox()` in `src/runner/runInSandbox.ts`

**Lines 111-125**: Dependency installation step

```typescript
let installSummary = "[install] skipped (node_modules present or package.json missing)";
let installPerformed = false;
try {
  const installResult = await ensureDependencies(projectRoot, timeoutMs);
  if (installResult.installed) {
    installPerformed = true;
    installSummary = `[install] ran ${installResult.command}`;
    combinedOutput += `${installSummary}\n`;
    safeWrite(`${installSummary}\n`);
    if (installResult.stdout) {
      combinedOutput += installResult.stdout;
      safeWrite(installResult.stdout);
    }
    if (installResult.stderr) {
      combinedOutput += installResult.stderr;
      safeWrite(installResult.stderr);
    }
```

**Current behavior**:
- Calls `ensureDependencies(projectRoot, timeoutMs)` 
- No validation before install attempt
- Failures caught after npm process exits with code !== 0

### 2. Install Logic: `ensureDependencies()` in `src/runner/installDeps.ts`

**Lines 28-45**: Read package.json and determine if install needed

```typescript
export async function ensureDependencies(
  projectRoot: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<EnsureDependenciesResult> {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const nodeModulesPath = path.join(projectRoot, "node_modules");

  const hasPackageJson = await pathExists(packageJsonPath);
  if (!hasPackageJson) {
    return { installed: false, command: null };
  }

  const hasNodeModules = await pathExists(nodeModulesPath);

  // Determine if declared deps are missing from node_modules (e.g., subtasks added new deps)
  let missingDeps: string[] = [];
  let allDepsCount = 0;
```

**Lines 48-64**: Parse package.json to extract dependencies

```typescript
  try {
    const pkgRaw = await fs.readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(pkgRaw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {})
    ];
    allDepsCount = allDeps.length;
    if (allDeps.length > 0) {
      const checks = await Promise.all(
        allDeps.map(async (name) => {
          const depPath = path.join(nodeModulesPath, name);
          return (await pathExists(depPath)) ? null : name;
        })
      );
      missingDeps = checks.filter((n): n is string => Boolean(n));
    }
  } catch {
    // ignore parse errors; fall back to node_modules heuristic
  }
```

**Current behavior**:
- Reads package.json
- Checks which deps are missing from node_modules
- **No validation that versions exist in npm registry**
- Proceeds directly to npm install/ci

### 3. Error Handling: Lines 123-162

**Lines 123-145**: Initial install failure handling

```typescript
  if (code !== 0) {
    const output = (stdout + "\n" + stderr).trim();
    const lockfileMismatch = /npm ci can only install packages|EUSAGE|Invalid: lock file|Missing: .* from lock file/i.test(output);
    if (hasLockfile && lockfileMismatch) {
      // Fallback to a standard install to update lockfile and proceed
      args = NPM_INSTALL_ARGS;
      stdout = "";
      stderr = "";
      timedOut = false;
      const fallback = spawn("npm", args, {
        cwd: projectRoot,
        env: { ...process.env, CI: process.env.CI ?? "1" },
        stdio: ["ignore", "pipe", "pipe"]
      });
```

**Current behavior**:
- Only detects failures **after** npm process completes
- Has lockfile mismatch fallback (npm ci → npm install)
- No version validation fallback

**Lines 150-162**: Final error propagation

```typescript
      if (code !== 0) {
        const out2 = stderr.trim() || stdout.trim();
        throw new Error(
          `Dependency installation failed after fallback with code ${code ?? "null"}. ${out2 || "No output"}`
        );
      }
    } else {
      const out = stderr.trim() || stdout.trim();
      throw new Error(
        `Dependency installation failed with code ${code ?? "null"}. ${out || "No output"}`
      );
    }
  }
```

**Current error message example** (from output/12testartifact):
```
Dependency installation failed with code 1. npm error code ETARGET
npm error notarget No matching version found for tailwindcss@^3.5.0.
```

---

## Integration Point Design

### Option A: Preflight in `ensureDependencies()` (RECOMMENDED)

**Location**: `src/runner/installDeps.ts` line ~65 (right after parsing package.json)

**Advantages**:
- Single responsibility: dependency installer validates before installing
- Fail-fast before spawning npm process
- Reusable validation for any caller of `ensureDependencies()`

**Code insertion point**:

```typescript
// EXISTING CODE (lines 48-68)
try {
  const pkgRaw = await fs.readFile(packageJsonPath, "utf-8");
  const pkg = JSON.parse(pkgRaw) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const allDeps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {})
  ];
  allDepsCount = allDeps.length;
  
  // ✅ INSERT PREFLIGHT HERE (line ~68)
  // Import: import { validateDependencies } from "../validation/dependencyPreflight.js";
  // Call: await validateDependencies(pkg.dependencies, pkg.devDependencies);
  // Throws DependencyValidationError on invalid versions
  
  if (allDeps.length > 0) {
    const checks = await Promise.all(
      allDeps.map(async (name) => {
        const depPath = path.join(nodeModulesPath, name);
        return (await pathExists(depPath)) ? null : name;
      })
    );
    missingDeps = checks.filter((n): n is string => Boolean(n));
  }
} catch {
  // ignore parse errors; fall back to node_modules heuristic
}
```

### Option B: Preflight in `runInSandbox()` before install

**Location**: `src/runner/runInSandbox.ts` line ~110 (before calling ensureDependencies)

**Advantages**:
- More control over error handling in sandbox context
- Can log validation results to execution trace

**Disadvantages**:
- Duplicates package.json parsing (ensureDependencies already does it)
- Less reusable
- Breaks single responsibility principle

**Recommendation**: Use Option A (preflight in `ensureDependencies()`) for cleaner architecture.

---

## Validation Interface Design

### Module: `src/validation/dependencyPreflight.ts`

```typescript
export interface DependencyValidationError {
  package: string;
  version: string;
  reason: 'NOT_FOUND' | 'DEPRECATED' | 'INVALID_SEMVER' | 'TAILWIND_V4_MISCONFIGURED';
  suggestion?: string;
  registryUrl?: string;
}

export class DependencyPreflightError extends Error {
  constructor(
    message: string,
    public errors: DependencyValidationError[]
  ) {
    super(message);
    this.name = 'DependencyPreflightError';
  }
}

export interface ValidateDependenciesOptions {
  /** Timeout for npm registry API calls (ms) */
  timeoutMs?: number;
  /** Allow deprecated packages with warning */
  allowDeprecated?: boolean;
}

/**
 * Validates that all dependencies exist in npm registry with correct versions.
 * Throws DependencyPreflightError if any validation fails.
 */
export async function validateDependencies(
  dependencies?: Record<string, string>,
  devDependencies?: Record<string, string>,
  options?: ValidateDependenciesOptions
): Promise<void>;
```

### NPM Registry API

**Endpoint**: `https://registry.npmjs.org/<package-name>`

**Response format** (example for tailwindcss):
```json
{
  "name": "tailwindcss",
  "versions": {
    "3.0.0": { ... },
    "3.4.14": { ... },
    "4.0.0-alpha.1": { ... }
  },
  "dist-tags": {
    "latest": "3.4.14",
    "next": "4.0.0-alpha.1"
  },
  "time": {
    "3.4.14": "2024-10-01T10:00:00.000Z"
  }
}
```

**Validation logic**:
1. For each dependency, fetch metadata from registry
2. Check if package exists (404 → NOT_FOUND)
3. Extract `versions` object keys
4. Use `semver.satisfies()` to check if any version matches the requested range
5. Check `deprecated` field in version metadata (warning if true)
6. Special case: Tailwind v4 requires `@tailwindcss/cli` and CSS-first config

---

## Error Flow Design

### Current Flow (Lines 150-162 in installDeps.ts)

```
npm install fails → throw Error with stderr/stdout
```

### New Flow (with preflight)

```
validateDependencies() → DependencyPreflightError → runInSandbox catches → logs to trace → bubbles to executeTaskPlan
```

**Integration with existing error handling**:
- Preflight errors thrown **before** npm spawn
- Caught in runInSandbox's try-catch (same as current install failures)
- Logged to execution trace with structured error details
- Bubbled up to subtask executor with clear failure reason

---

## Tailwind v4 Specific Rules

**Problem**: GPT-5-mini may generate v3 config with v4 dependencies (or vice versa)

**Detection logic**:
1. Check if `tailwindcss` version starts with `4.` or includes `4.0.0-alpha`
2. If v4 detected, validate:
   - `@tailwindcss/cli` is present in dependencies
   - `tailwind.config.js` should NOT exist (v4 uses CSS-first config)
   - Main CSS should have `@import "tailwindcss";`

**Implementation**: Add special case in `validateDependencies()` to check for Tailwind v4 pattern

---

## Test Strategy

### Unit Tests (tests/validation/dependencyPreflight.test.ts)

**Mock npm registry responses**:
- Valid package with multiple versions
- 404 Not Found
- Deprecated package
- Invalid semver range
- Tailwind v4 detection

**Test cases**:
1. `validateDependencies()` succeeds with valid versions
2. Throws DependencyPreflightError on 404
3. Warns on deprecated package (if allowDeprecated=true)
4. Throws on invalid semver range
5. Throws on Tailwind v4 without @tailwindcss/cli
6. Handles registry API timeout gracefully

### Integration Test

**Test in runInSandbox with invalid package.json**:
- Create fixture with `{"dependencies": {"invalid-pkg-xyz": "^999.0.0"}}`
- Call `runInSandbox()`
- Assert DependencyPreflightError thrown before npm spawn

---

## Dependencies Required

**None!** Using Node.js built-ins:
- `node:https` for registry API calls
- `semver` (already in package.json)
- `node:fs/promises` for package.json parsing

---

## Rollback Plan

If npm registry API proves unreliable:
1. Add feature flag: `ENABLE_DEPENDENCY_PREFLIGHT=true` in .env
2. Default to disabled in production
3. Keep validation logic for future Phase 5 interrupt system
4. Document as "ready for Phase 5 INVALID_DEPENDENCY interrupt"

---

## Next Steps (WA11-WA15)

1. **WA11**: Implement `src/validation/dependencyPreflight.ts` with npm registry API
2. **WA12**: Add unit tests with mock fixtures
3. **WA13**: Wire into `ensureDependencies()` at line ~68
4. **WA14**: E2E validation with GPT-5-mini (13testartifact)
5. **WA15**: Evidence document with validation results

---

## References

- Consultant recommendation: `docs/101025_todays_status/04_conusltation_Again.md`
- npm registry API: https://docs.npmjs.com/cli/v8/commands/npm-view
- Deprecation docs: https://docs.npmjs.com/cli/v8/commands/npm-deprecate
- Tailwind v4 docs: https://tailwindcss.com/docs/upgrade-guide
- Existing failure: `output/12testartifact/_executor_meta.json`

---

**Discovery complete. Ready for implementation (WA11).**
