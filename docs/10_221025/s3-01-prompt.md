# S3-01 — Extract Fixtures/Replay/Plan/Runner routes into domain routers (TypeScript, Express, DI)

Last updated: 2025-10-22
Phase: 19 (Autonomous Transition)
Scope: No API or behavior changes. No feature flag changes. No new dependencies.

---

## Context

- Backend: Node.js 20 + Express + TypeScript
- Current monolith routes live in `src/server.ts`
- We’ve already extracted `execute` and `sessions` routers with DI.
- This task extracts remaining utility routes around fixtures, replay, and plan operations, plus the manual test runner endpoint, following the same DI style.
- Quality gates must remain green after each slice: lint, typecheck, tests (coverage thresholds), contracts, SBOM (SPDX + CycloneDX), provenance.

## Scope and anchors (server.ts)

Move these exact endpoints from `src/server.ts` into domain routers. Line numbers reflect the current codebase state and are provided with unique anchors to avoid drift:

1) POST /api/run-tests
   - Anchor: `app.post("/api/run-tests",`
   - Nearby refs: `const projectRoot = path.join(OUTPUT_DIR, slug);` (≈ line 1754)
   - Notes: uses `slugify`, `OUTPUT_DIR`, `fs.access`, `runInSandbox`, `logEvent`.

2) GET /api/fixtures/:project
   - Anchor: `app.get("/api/fixtures/:project",`
   - Nearby refs: `const sessions = await listFixtures(slug);` (≈ line 1776)
   - Notes: uses `slugify`, `listFixtures`.

3) POST /api/replay/repair
   - Anchor: `app.post("/api/replay/repair",`
   - Nearby refs: `readFixture<MultiTurnContext>(slug, sessionId, path.join("repair", "context.json"))` (≈ line 1793)
   - Notes: uses `slugify`, `readFixture`, `multiTurnRepair`, returns `{ project, sessionId, history }`.

4) POST /api/replay/subtask
   - Anchor: `app.post("/api/replay/subtask",`
   - Nearby refs: `await writeFiles(projectRoot, output.files);` (≈ line 1824), `ensureDefaultExportForApp(projectRoot)` (≈ line 1825)
   - Notes: uses `slugify`, `OUTPUT_DIR`, `fs.access`, `readFixture`, `writeFiles`, `ensureDefaultExportForApp`, `runInSandbox`, `logEvent`.

5) GET /api/plan/:project/failed-subtasks
   - Anchor: `app.get("/api/plan/:project/failed-subtasks",`
   - Nearby refs: `const metaPath = path.join(projectRoot, "_executor_meta.json");` (≈ lines 1841–1855)
   - Notes: reads `_executor_meta.json`, returns `{ project, failed: Array<{ subtaskId, status, reason }> }`.

6) POST /api/plan/:project/retest-subtask
   - Anchor: `app.post("/api/plan/:project/retest-subtask",`
   - Nearby refs: `const run = await runInSandbox({ projectRoot, projectSlug: slug });` (≈ line 1864)
   - Notes: uses `slugify`, `OUTPUT_DIR`, `fs.access`, `runInSandbox`, `logEvent`.

Keep the JSON error response shapes exactly as-is (e.g., `{ error: string }`) to preserve API behavior.

## New files (routers)

Create the following domain routers with fully typed DI surfaces. Follow the existing style used in `src/domains/sessions/routes.ts`.

- `src/domains/runner/routes.ts`
  - export: `mountRunnerRoutes(app: Application, deps: RunnerDeps): void`
- `src/domains/fixtures/routes.ts`
  - export: `mountFixturesRoutes(app: Application, deps: FixturesDeps): void`
- `src/domains/replay/routes.ts`
  - export: `mountReplayRoutes(app: Application, deps: ReplayDeps): void`
- `src/domains/plan/routes.ts`
  - export: `mountPlanRoutes(app: Application, deps: PlanDeps): void`

All four files must be self-contained, import only types from internal modules, and rely on DI for behavior. Use Node.js built-ins (path/fs) directly as needed; do not introduce new runtime dependencies.

## DI surfaces (TypeScript)

Types below reference existing project types.

- Common types you can import from existing modules:
  - `RunInSandboxOptions`, `RunResult` from `src/runner/runInSandbox.ts`
  - `MultiTurnContext` from `src/repair/multiTurnRepair.ts`
  - `RepairHistory` from `src/repair/multiTurnRepair.ts`
  - `ExecutorFile` (param) from `src/executor/writeFiles.ts`

### RunnerDeps (for /api/run-tests)

```ts
export type RunnerDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  outputDir: string; // pass the resolved OUTPUT_DIR
  runTests: (options: RunInSandboxOptions) => Promise<RunResult>; // wrap runInSandbox
  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
};
```

- Behavior:
  - 400 when `project` missing
  - 404 when project folder absent
  - On success: run tests and return the `RunResult`; emit `test_run` event `{ project, stage: "manual", status }`.

### FixturesDeps (for /api/fixtures/:project)

```ts
export type FixturesDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  listFixtures: (slug: string) => Promise<Record<string, string[]>>;
};
```

- Behavior:
  - Returns `{ project: slug, sessions }`.

### ReplayDeps (for /api/replay/repair and /api/replay/subtask)

```ts
export type ReplayDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  outputDir: string;
  readFixture: <T = unknown>(slug: string, sessionId: string, relPath: string) => Promise<T>;
  multiTurnRepair: (context: MultiTurnContext) => Promise<RepairHistory>;
  writeFiles: (rootDir: string, files: ExecutorFile[]) => Promise<void>;
  ensureDefaultExportForApp: (rootDir: string) => Promise<void>;
  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
};
```

- Behavior (repair):
  - 400 when `project` or `sessionId` missing
  - 404 when repair context fixture missing
  - 200 `{ project, sessionId, history }`

- Behavior (subtask):
  - 400 when `project`, `sessionId`, or `subtaskId` missing
  - 404 when project folder absent
  - 404 when subtask output fixture missing/invalid
  - Writes files, normalizes exports, runs tests, logs `test_run` with stage `replay-subtask:${subtaskId}`
  - 200 `{ ok: true, project, subtaskId, result }`

### PlanDeps (for /api/plan/:project/failed-subtasks and /api/plan/:project/retest-subtask)

```ts
export type PlanDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  outputDir: string;
  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
};
```

- Behavior (failed-subtasks):
  - Reads `${outputDir}/${slug}/_executor_meta.json`
  - Extracts `subtaskResults` and filters where `status !== "completed"`
  - Maps to `{ subtaskId, status, reason }` with reason from `testResult?.errorMessage || notes || "unknown"`
  - 200 `{ project: slug, failed }`

- Behavior (retest-subtask):
  - 404 when project folder absent
  - Runs tests and logs `test_run` with stage `retest-subtask`
  - 200 `{ project: slug, result }`

## Implementation steps

1) Create the four router files and implement the endpoints with identical logic and response shapes. Reuse Node.js `path` and `fs/promises` as in the monolith where appropriate.
2) In `src/server.ts`:
   - Add imports:
     ```ts
     import { mountRunnerRoutes } from "./domains/runner/routes.js";
     import { mountFixturesRoutes } from "./domains/fixtures/routes.js";
     import { mountReplayRoutes } from "./domains/replay/routes.js";
     import { mountPlanRoutes } from "./domains/plan/routes.js";
     ```
   - Mount them near the other domain mounts (around existing `mountExecuteRoutes` / `mountSessionsRoutes`):
     ```ts
     mountRunnerRoutes(app, { slugify, outputDir: OUTPUT_DIR, runTests: options => runInSandbox(options), logEvent });
     mountFixturesRoutes(app, { slugify, listFixtures });
     mountReplayRoutes(app, { slugify, outputDir: OUTPUT_DIR, readFixture, multiTurnRepair, writeFiles, ensureDefaultExportForApp, runTests: options => runInSandbox(options), logEvent });
     mountPlanRoutes(app, { slugify, outputDir: OUTPUT_DIR, runTests: options => runInSandbox(options), logEvent });
     ```
   - Remove the inlined route blocks listed in the Scope section (and only those), preserving everything else.

3) Keep imports minimal and avoid circular deps. Follow the file structure used for `execute` and `sessions` domains.

4) No new dependencies. Do not change feature flag behavior. Do not change error response shapes.

## Tests (100% module coverage for new routers)

Add focused tests to `tests/domains/`:

- `tests/domains/runner.routes.test.ts`
  - Happy path: existing project runs tests and returns result; event logged.
  - 400: missing `project`.
  - 404: project not found.

- `tests/domains/fixtures.routes.test.ts`
  - Happy path: returns sessions list from DI `listFixtures`.
  - Error path: simulate thrown error; returns `{ error: message }` with 500.

- `tests/domains/replay.routes.test.ts`
  - repair: 400 missing fields; 404 missing context; 200 with stubbed history.
  - subtask: 400 missing fields; 404 project missing; 404 invalid/missing output fixture; 200 happy path writes files, normalizes exports, runs tests, logs event, returns shape.

- `tests/domains/plan.routes.test.ts`
  - failed-subtasks: create temp project in `OUTPUT_DIR`, write `_executor_meta.json`, verify mapping.
  - retest-subtask: 404 project missing; 200 runs tests and logs event.

Use the DI pattern with lightweight stubs wherever applicable. For file-backed tests, write under the real `OUTPUT_DIR` as other tests do, and clean up in `beforeEach/afterEach`.

Coverage target: 100% for new router modules; overall repo thresholds must remain ≥ 80% line and ≥ 75% branch.

## Validation protocol

Run these after each slice and before pushing:

- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests: `npm test`
- Contracts: `npm run contract:check`
- SBOM (SPDX): `npm run sbom`
- SBOM (CycloneDX): `npm run sbom:cyclonedx`
- Provenance: `npm run provenance`

All must PASS (exit 0). Zero ESLint warnings.

## Completion checklist

- [ ] All six endpoints extracted to the new routers.
- [ ] `src/server.ts` imports and mounts added; inline route blocks removed.
- [ ] New tests added with 100% module coverage for routers.
- [ ] Lint, typecheck, tests, contracts, SBOM (both), provenance all PASS.
- [ ] Discovery note updated with integration points and justifications.
- [ ] No protected files modified without approval.

---

### Notes
- Error handling must preserve the current plain `{ error: string }` responses for these routes (Problem Details middleware remains opt-in elsewhere).
- DI mirrors established patterns (`sessions` router) including `slugify` injection to avoid duplicated imports.
- Use `path.resolve("output")` from the app as `OUTPUT_DIR` via injected `outputDir`.
