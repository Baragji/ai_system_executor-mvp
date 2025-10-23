# Phase 21 — Session 1 Discovery Note (P21-S1-02, P21-S1-03)

Last updated: 2025-10-22

## Integration Points (with code snippets)

### 1) /api/clarify route (to extract)
- File: `src/server.ts`
- Lines: ~1504–1534

```ts
app.post("/api/clarify", (req, res) => {
  try {
    const promptRaw = req.body?.prompt;
    const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
    if (!prompt) {
      respondWithProblem(res, 400, "BadRequest", "prompt required", req.originalUrl || req.url || "/api/clarify");
      return;
    }

    const missing = detectMissing(prompt);
    const questions = generateQuestions(missing, prompt);
    rememberClarificationQuestions(prompt, questions);
    const payload = { questions };
    const validation = validateClarificationRequest(payload);
    if (!validation.ok) {
      console.error("Clarification payload failed validation", validation.errors);
      respondWithProblem(
        res,
        500,
        "ClarificationContractViolation",
        "clarification contract violation",
        req.originalUrl || req.url || "/api/clarify"
      );
      return;
    }

    return res.json(payload);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    respondWithProblem(res, 500, "InternalServerError", message, req.originalUrl || req.url || "/api/clarify");
    return;
  }
});
```

Dependencies used by this handler:
- `detectMissing` from `src/clarification/detectMissing.ts`
- `generateQuestions` from `src/clarification/generateQuestions.ts`
- `rememberClarificationQuestions` from `src/domains/clarify/session.ts`
- `validateClarificationRequest` from `src/contracts/validators.ts`
- `respondWithProblem` from `src/middleware/problemDetails.ts`

### 2) Progress endpoints (to extract with DI)
- File: `src/server.ts`
- Lines: ~2276–2311

```ts
app.get("/api/progress/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  openProgressStream(req, res, sessionId);
});

// JSON snapshot endpoint retained for polling fallbacks
app.get("/api/progress/snapshot/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  const snap = getProgress(sessionId);
  if (!snap) {
    return res.status(404).json({ error: "session not found" });
  }
  return res.json(snap);
});

// Legacy SSE alias for compatibility
app.get("/api/progress/stream/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  openProgressStream(req, res, sessionId);
});
```

Helper functions consumed by these routes (remain in `server.ts` and injected):
- `getProgress` (lines ~271–296)
- `openProgressStream` (lines ~356–389)

```ts
function getProgress(sessionId: string): ProgressSnapshot | null { /* ... */ }

function openProgressStream(req: Request, res: Response, sessionId: string): void {
  res.setHeader("Content-Type", "text/event-stream");
  /* interval send(getProgress(sessionId)); end when done */
}
```

## Proposed Changes

- Extract `POST /api/clarify` into `src/domains/clarify/routes.ts` and mount via `mountClarifyRoutes(app)`.
- Extract the three progress endpoints into `src/domains/progress/routes.ts` and mount via `mountProgressRoutes(app, { openProgressStream, getProgress })`.
- Remove the inlined route definitions from `server.ts` to avoid duplication.
- Do not modify any helper functions or public API paths.

## Compliance Check (ai-stack.json + repo rules)
- Language: TypeScript only — OK
- Backend: Express on Node 20+ — OK (no framework changes)
- Frontend: untouched — OK
- New dependencies: none — OK
- Protected files: not modified — OK
- Feature flags: untouched — OK
- Error handling: continues to use `respondWithProblem` where applicable — OK

## Justification
- Clarify route is a pure handler with stable dependencies; safe to move wholesale.
- Progress routes depend on internal helpers (`getProgress`, `openProgressStream`). To keep helpers in place and minimize churn, inject them into the new progress router. This preserves behavior and isolates surface routes for future modularization.

## Expected Validation Gates
- `npm run lint` — must be 0 (no warnings policy enforced here as per repo; current rules warn on TS unused vars only)
- `npm run typecheck` — must be 0
- `npm test` — must be 0 with existing coverage thresholds

Evidence of mounts will be visible in `src/server.ts` imports and calls:
- `mountClarifyRoutes(app)` near where routes begin
- `mountProgressRoutes(app, { openProgressStream, getProgress })` replacing inline progress handlers

---

# Phase 21 — Session 2 Discovery Note (P21-S2-01, P21-S2-02)

Last updated: 2025-10-22

## Integration Points (with code snippets)

### 1) Pure helpers referenced by /api/execute
- File: `src/domains/execute/helpers.ts`
- File: `src/services/execute.ts`

We identified duplication of the heuristic `isComplexPrompt`:

```ts
// src/services/execute.ts (before)
function isComplexPrompt(prompt: string, clarifications?: ClarificationResponse): boolean { /* ... */ }

// src/domains/execute/helpers.ts (canonical)
export function isComplexPrompt(prompt: string, clarifications?: ClarificationResponse): boolean { /* ... */ }
```

Action (P21-S2-01): Removed the local definition in `src/services/execute.ts` and imported the canonical helper:

```ts
import { isComplexPrompt } from "../domains/execute/helpers.js";
```

Rationale: This helper is pure and has no heavy dependencies; deduping reduces drift with no behavior change.

### 2) /api/execute route extraction with DI

- Source (before): `src/server.ts` lines ~1453–1815
- Target (after): `src/domains/execute/routes.ts` mounting via `makeExecuteHandler` from `src/services/execute.ts`

```ts
// src/domains/execute/routes.ts
import { makeExecuteHandler } from "../../services/execute.js";
export function mountExecuteRoutes(app: Application, deps: ExecuteDeps): void {
  app.post("/api/execute", makeExecuteHandler(deps));
}

// src/server.ts (mount)
mountExecuteRoutes(app, { setProgress, ensureOrchestrationSession, consumeClarificationQuestions, captureFixture, stepQueue });
```

The original inline handler in `server.ts` is removed (now commented out for traceability in this slice) and functionally replaced by the mounted router. All dependencies are injected, preserving runtime behavior, flags, and SSE semantics.

## Compliance Check
- Language/stack unchanged — OK
- No new dependencies — OK
- APIs unchanged (`POST /api/execute`) — OK
- Feature flags preserved (`AGENTS_RUNTIME`) — OK
- Error handling continues via `respondWithProblem` — OK

## Validation Gates (S2)
- After S2-01 (helper dedupe): lint/typecheck/tests — PASS
- After S2-02 (route extraction): lint/typecheck/tests — PASS

## Notes
- We also tightened ESLint ignore to exclude nested `dist` folders (`**/dist/**`) to prevent warnings from compiled artifacts in subpackages. This does not affect source linting and respects the zero-warning policy.

---

# Session 2 — S2-03 (Pause/Resume extraction)

Last updated: 2025-10-22

## Integration Points (with code snippets)

### 1) Legacy pause/resume handlers in `server.ts`
- File: `src/server.ts`
- Lines (pre-extraction): ~1870–2160

These handlers managed `POST /api/sessions/:id/pause` and `POST /api/sessions/:id/resume`, directly mutating `progressSessions` and `orchestrationSessions`. They relied on helpers such as `ensureOrchestrationSession`, `snapshotFromSession`, `raiseInterrupt`, `resumeFromCheckpoint`, `captureManifest`, `getManifest`, and the orchestrator `stepQueue` instance. The inline code also touched filesystem helpers (`fs.readFile` for the system prompt, `captureFixture`) and state machine transitions when restarting execution.

### 2) New domain router: `src/domains/sessions/routes.ts`

```ts
export function mountSessionsRoutes(app: Application, deps: SessionsDeps): void {
  app.post("/api/sessions/:id/pause", async (req, res) => {
    const session = deps.ensureOrchestrationSession(sessionId);
    const questions = deps.normalizeInterruptQuestions(body?.questions);
    const checkpoint = await deps.raiseInterrupt({ sessionId, machine: session.machine, reason, questions, checkpointPayload });
    session.paused = true;
    deps.setProgress(sessionId, deps.stateToStage(session.machine.state), snapshot.progress, snapshot.data, false);
    return res.status(201).json({ checkpoint });
  });

  app.post("/api/sessions/:id/resume", async (req, res) => {
    const result = await deps.resumeFromCheckpoint(sessionId, answers, { machine: session.machine, reason });
    const manifest = await deps.getManifest(sessionId);
    const prompts = deps.buildResumePrompts(await deps.readSystemPrompt(), { projectSlug, checkpoint: result.checkpoint, answeredQuestions: result.answeredQuestions, manifest });
    deps.setProgress(sessionId, deps.stateToStage(session.machine.state), snapshot.progress, data, false);
    deps.stepQueue.runWorkflow(sessionId, descriptors, { resume: true }).catch(...);
    return res.json({ checkpoint: result.checkpoint, answeredQuestions: result.answeredQuestions, resumed: true });
  });
}
```

Key DI surface (`SessionsDeps`) mirrors the server helpers so behavior remains unchanged:
- `getProgress`, `snapshotFromSession`, `stateToStage`, `setProgress`
- `ensureOrchestrationSession`, `getOrchestrationSession`
- `raiseInterrupt`, `resumeFromCheckpoint`
- `captureManifest`, `getManifest`, `buildResumePrompts`
- `normalizeInterruptQuestions`, `normalizeResumeAnswers`
- `captureFixture`, `slugify`, `stepQueue`
- `createAbortSignal`, `cleanupAbortSignal`
- `readSystemPrompt` (wrapper over `fs.readFile`)
- `resolveSessionPrompts` (accesses saved clarify fixture / session cache)

### 3) Mount point in `server.ts`

```ts
import { mountSessionsRoutes } from "./domains/sessions/routes.js";

mountSessionsRoutes(app, {
  getProgress,
  ensureOrchestrationSession,
  getOrchestrationSession,
  snapshotFromSession,
  stateToStage,
  setProgress,
  abortSession,
  raiseInterrupt,
  resumeFromCheckpoint,
  captureManifest,
  getManifest,
  buildResumePrompts,
  normalizeInterruptQuestions,
  normalizeResumeAnswers,
  captureFixture,
  slugify,
  stepQueue,
  createAbortSignal,
  cleanupAbortSignal,
  readSystemPrompt: () => fs.readFile("src/executor/systemPrompt.md", "utf-8"),
  resolveSessionPrompts
});
```

## Tests & Coverage
- New unit suite: `tests/domains/sessions/routes.test.ts` exercises pause/resume happy paths, DI error handling, queue metadata branches, manifest capture, workflow failure scenarios, and validation guards.
- The suite stubs every injected dependency, verifying call contracts and ensuring 100% coverage on `src/domains/sessions/routes.ts`.

## Compliance Check
- Language / platform unchanged (TypeScript on Express) — OK
- No new dependencies introduced — OK
- API surface preserved (`/api/sessions/:id/pause`, `/api/sessions/:id/resume`) — OK
- Feature flag usage untouched (AGENTS_RUNTIME, PROBLEM_DETAILS) — OK
- Error shapes match legacy JSON responses — OK

## Validation Gates
- `npm run -s lint`
- `npm run -s typecheck`
- `npm -s test`
- `npm run -s contract:check`
- `npm run -s sbom`
- `npm run -s sbom:cyclonedx`
- `npm run -s provenance`

All gates must return green prior to PR.

---

# Session 3 — S3-01 (Fixtures/Replay/Plan/Runner extraction)

Last updated: 2025-10-22

## Integration Points (with code snippets)

### 1) Manual runner endpoint `/api/run-tests`
- File: `src/server.ts`
- Lines: ~1748–1771

```ts
app.post("/api/run-tests", async (req, res) => {
  try {
    const project: string = (req.body?.project || "").toString();
    if (!project) {
      return res.status(400).json({ error: "project required" });
    }
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try {
      await fs.access(projectRoot);
    } catch {
      return res.status(404).json({ error: "project not found" });
    }

    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
    return res.json(run);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    return res.status(500).json({ error: message });
  }
});
```

Dependencies: `slugify`, `OUTPUT_DIR`, `fs.access`, `runInSandbox`, `logEvent`.

### 2) Fixtures + replay endpoints
- File: `src/server.ts`
- Lines: ~1773–1850

```ts
app.get("/api/fixtures/:project", async (req, res) => {
  try {
    const { project } = req.params as { project: string };
    const slug = slugify(project, { lower: true, strict: true });
    const sessions = await listFixtures(slug);
    return res.json({ project: slug, sessions });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

app.post("/api/replay/repair", async (req, res) => {
  try {
    const projectRaw: string = (req.body?.project || "").toString();
    const sessionId: string = (req.body?.sessionId || "").toString();
    if (!projectRaw || !sessionId) {
      return res.status(400).json({ error: "project and sessionId required" });
    }
    const slug = slugify(projectRaw, { lower: true, strict: true });
    const ctx = await readFixture<MultiTurnContext>(slug, sessionId, path.join("repair", "context.json")).catch(() => null);
    if (!ctx) {
      return res.status(404).json({ error: "repair context fixture not found" });
    }
    const history = await multiTurnRepair(ctx);
    return res.json({ project: slug, sessionId, history });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

app.post("/api/replay/subtask", async (req, res) => {
  try {
    const projectRaw: string = (req.body?.project || "").toString();
    const sessionId: string = (req.body?.sessionId || "").toString();
    const subtaskId: string = (req.body?.subtaskId || "").toString();
    if (!projectRaw || !sessionId || !subtaskId) {
      return res.status(400).json({ error: "project, sessionId, and subtaskId required" });
    }
    const slug = slugify(projectRaw, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }

    type FixtureOutput = { files?: { path: string; contents: string }[] };
    const output = await readFixture<FixtureOutput>(slug, sessionId, path.join("subtasks", subtaskId, "output.json")).catch(() => null);
    if (!output || !Array.isArray(output.files)) {
      return res.status(404).json({ error: "subtask output fixture not found or invalid" });
    }
    await writeFiles(projectRoot, output.files);
    await ensureDefaultExportForApp(projectRoot);

    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: `replay-subtask:${subtaskId}` , status: run.status });
    return res.json({ ok: true, project: slug, subtaskId, result: run });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});
```

Dependencies: `slugify`, `listFixtures`, `readFixture`, `multiTurnRepair`, `writeFiles`, `ensureDefaultExportForApp`, `OUTPUT_DIR`, `fs.access`, `runInSandbox`, `logEvent`.

### 3) Planning helpers `/api/plan/...`
- File: `src/server.ts`
- Lines: ~1852–1897

```ts
app.get("/api/plan/:project/failed-subtasks", async (req, res) => {
  try {
    const { project } = req.params as { project: string };
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    const metaPath = path.join(projectRoot, "_executor_meta.json");
    const buf = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(buf) as { subtaskResults?: Array<{ subtaskId: string; status: string; notes?: string; testResult?: { status: string; errorMessage?: string } | null }> };
    const failed = (meta.subtaskResults ?? []).filter(r => r.status !== "completed").map(r => ({
      subtaskId: r.subtaskId,
      status: r.status,
      reason: r.testResult?.errorMessage || r.notes || "unknown"
    }));
    return res.json({ project: slug, failed });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

app.post("/api/plan/:project/retest-subtask", async (req, res) => {
  try {
    const { project } = req.params as { project: string };
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }
    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: "retest-subtask", status: run.status });
    return res.json({ project: slug, result: run });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});
```

Dependencies: `slugify`, `OUTPUT_DIR`, `fs.readFile`, `fs.access`, `runInSandbox`, `logEvent`.

## Proposed Changes

- Create dedicated routers under `src/domains/{runner,fixtures,replay,plan}/routes.ts` mirroring the DI pattern from `sessions`/`execute`.
- Inject existing helpers (`slugify`, `listFixtures`, `readFixture`, filesystem access via Node built-ins, runner helpers, event logger`).
- Mount the new routers in `src/server.ts` alongside `execute`/`sessions` mounts and remove inline route blocks.
- Ensure response payloads and error envelopes remain identical (plain `{ error: string }`).

## Compliance Check

- Stack: TypeScript + Express only — OK
- No new dependencies — OK
- APIs unchanged (`/api/run-tests`, `/api/fixtures/*`, `/api/replay/*`, `/api/plan/*`) — OK
- Feature flags untouched — OK
- Error handling remains plain JSON for these routes — OK

## Justification

- Matches ongoing modularization strategy (Phase 19) moving routes into domain modules with DI.
- Grouping by domain (`runner`, `fixtures`, `replay`, `plan`) reduces `server.ts` footprint and enables targeted tests.
- Filesystem + sandbox interactions remain in-process but encapsulated for future extraction.

## Expected Validation Gates

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run contract:check`
- `npm run sbom`
- `npm run sbom:cyclonedx`
- `npm run provenance`

All must succeed with zero warnings/errors.

---
