Created 5 todos

Searched text for `app\.post\(.*/api/(pause|resume)` (`**/src/server.ts`), no results

Searched text for `paused|resume|checkpoint|interrupt|questions` (`**/src/server.ts`), 20 results

Searched text for `app\.(post|get|put|patch)\([^\n]*resume` (`**/src/server.ts`), 2 results

Read [](file:///Users/Yousef_1/Downloads/ai_system_executor-mvp/src/server.ts#1950-1950), lines 1950 to 2150

Read [](file:///Users/Yousef_1/Downloads/ai_system_executor-mvp/src/server.ts#2150-2150), lines 2150 to 2263

Searched text for `app\.(post|get|patch)\([^\n]*pause|/api/sessions/[^\n]*interrupt|/api/sessions/[^\n]*questions` (`**/src/server.ts`), 2 results

Read [](file:///Users/Yousef_1/Downloads/ai_system_executor-mvp/src/server.ts#1850-1850), lines 1850 to 2010

I’ll draft a complete, production-grade Codex prompt that implements S2-03 (sessions pause/resume route extraction with DI), spells out exact scope and constraints, and bakes in validation and self-checks so it lands green on all gates.

## Codex Prompt — Phase 21 S2-03: Extract sessions pause/resume routes with DI

You are implementing Phase 21 S2-03 in the UMCA Executor MVP repo. Your objective is to extract the sessions pause/resume endpoints from the monolith into a domain router with dependency injection, preserve behavior bit-for-bit, and keep all quality gates green at every step.

Follow the instructions precisely. Think through each step, verify with automated checks, and only proceed when each gate is green.

### Context and conventions

- Repo: ai_system_executor-mvp (Node.js 20, TypeScript, Express)
- Current branch: Refactor_attempt
- Forbidden: Python, frontend frameworks, breaking API changes, new dependencies (unless contract-approved)
- Feature flags: Do not change defaults. Respect AGENTS_RUNTIME, PROBLEM_DETAILS_ENABLED, etc.
- Error handling: respondWithProblem helper exists; preserve current behavior for these routes unless a helper is already used there.
- Existing extracted domains: clarify, progress, execute
- Where we are: S2-01 and S2-02 completed (execute helpers + route extracted). Now S2-03: sessions pause/resume

### Scope of work

Extract the following handlers from server.ts into a new domain router with dependency injection:

- POST /api/sessions/:id/pause — currently around lines ~1873–1950 in server.ts
- POST /api/sessions/:id/resume — currently around lines ~1976–2150 in server.ts

Behavior, return shapes, side effects, and logs must not change.

### Technical specifications

1) File and router structure
- Create a new file: routes.ts
- Export a function: mountSessionsRoutes(app: Application, deps: SessionsDeps): void
- Implement both routes inside this module
- Fully typed in TypeScript (no any). Include minimal local interfaces for request bodies and responses when helpful.

2) Dependency Injection
Define and use the following DI surface (align to existing server.ts helpers and orchestrator APIs). Provide exact types where feasible:

export type SessionsDeps = {
  // Progress/session state accessors
  getProgress: (sessionId: string) => ProgressSnapshot | null;
  ensureOrchestrationSession: (sessionId: string) => OrchestrationSession;
  getOrchestrationSession: (sessionId: string) => OrchestrationSession | undefined;

  // State helpers (reuse from server.ts, injected)
  snapshotFromSession: (sessionId: string, fallback?: ProgressSnapshot | null) => ProgressSnapshot;
  stateToStage: (state: OrchestratorState) => string;
  setProgress: (sessionId: string, stage: string, pct: number, data?: Record<string, unknown>, done?: boolean) => void;

  // Orchestrator & resume/pause services
  abortSession: (sessionId: string) => boolean;
  raiseInterrupt: (input: {
    sessionId: string;
    machine: OrchestratorStateMachine; // already instantiated in server
    reason: string;
    questions: InterruptQuestionInput[];
    machineContext?: Record<string, unknown>;
    checkpointPayload?: Omit<CheckpointPayload, "pendingQuestions">;
  }) => Promise<{
    state: string;
    updatedAt: string;
    payload?: CheckpointPayload;
  }>;
  resumeFromCheckpoint: (
    sessionId: string,
    answers: ResumeAnswer[],
    opts: { machine: OrchestratorStateMachine; reason?: string }
  ) => Promise<{
    checkpoint: { state: string; updatedAt: string; payload?: CheckpointPayload };
    answeredQuestions: Array<{ id: string; question: string; answer: unknown }>;
    machine: OrchestratorStateMachine;
  }>;

  // Workspace manifest
  captureManifest: (sessionId: string, projectSlug: string) => Promise<void>;
  getManifest: (sessionId: string) => Promise<{ summary?: { totalFiles: number; totalSize: number; topFiles: string[] } } | null>;

  // Resume prompt composition
  buildResumePrompts: (
    systemPrompt: string,
    params: {
      projectSlug: string;
      originalPrompt: string;
      effectivePrompt?: string;
      adjustment?: string;
      checkpoint: { state: string; updatedAt: string; payload?: CheckpointPayload };
      answeredQuestions: Array<{ id: string; question: string; answer: unknown }>;
      manifest: unknown;
    }
  ) => { systemPrompt: string; userPrompt: string };

  // Normalizers (reuse exact logic from server.ts)
  normalizeInterruptQuestions: (input: unknown) => InterruptQuestionInput[];
  normalizeResumeAnswers: (input: unknown) => ResumeAnswer[];

  // Misc dependencies
  captureFixture: (sessionId: string | undefined, slug: string, relPath: string, data: unknown) => Promise<void>;
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  stepQueue: StepQueue;
  createAbortSignal: (sessionId: string) => void;
  cleanupAbortSignal: (sessionId: string) => void;
  readSystemPrompt: () => Promise<string>; // wrapper for fs.readFile("src/executor/systemPrompt.md", "utf-8")
};

Also import the exact types used above from existing modules to maintain type safety:
- OrchestratorState, OrchestratorStateMachine
- InterruptQuestionInput, ResumeAnswer, CheckpointPayload
- StepQueue, StepDescriptor
- SingleExecutionOptions, ResumeContextFixture
- ProgressSnapshot, OrchestrationSession (align with server.ts definitions)

3) Behavior preservation
Implement both handlers exactly as in server.ts today:
- POST /api/sessions/:id/pause
  - Validate session id presence -> 400
  - getProgress(sessionId) must exist -> 404
  - ensureOrchestrationSession(sessionId); if session.paused -> 409
  - Normalize input: reason (string), questions (normalizeInterruptQuestions), context (plain object), payload (plain object)
  - If session.projectSlug present, ensure checkpointPayload.executor.projectSlug is populated
  - Abort: abortSession(sessionId) (log preserved)
  - Raise interrupt: raiseInterrupt({ sessionId, machine, reason, questions, machineContext, checkpointPayload })
  - Set session.paused=true, questions, checkpointUpdatedAt
  - If projectSlug, captureManifest(sessionId, projectSlug) (best-effort)
  - Update snapshot via snapshotFromSession: set stage=stateToStage(...), paused=true, questions, checkpointUpdatedAt, done=false, updatedAt=Date.now(); store via deps
  - Return 201 with { checkpoint }
  - Errors:
    - If err.message matches /Cannot raise interrupt/: 409 with { error }
    - Other Error: 400 with { error }
    - Unknown: 500 with { error: "unknown error" }
  - Preserve console logs and messages as-is

- POST /api/sessions/:id/resume
  - Validate session id presence -> 400
  - getOrchestrationSession(sessionId) must exist -> 404
  - Normalize answers (normalizeResumeAnswers); require non-empty -> 400
  - Optional: reason, adjustment (strings)
  - Call resumeFromCheckpoint(sessionId, answers, { machine, reason? })
  - Update session: paused=false, questions=[], checkpointUpdatedAt, machine=result.machine
  - Compute projectSlug: from session.projectSlug or result.checkpoint.payload.executor.projectSlug or slugify(sessionId)
  - Read manifest: getManifest(sessionId)
  - Read system prompt via readSystemPrompt(), build prompts via buildResumePrompts(...)
  - session.effectivePrompt = prompts.userPrompt
  - Update snapshot (paused=false, questions=[], resume=true, adjustment if provided)
  - Prepare resumeFixture (as in server.ts), with manifest summary cap of 10 top files
  - If no provider configured (no OPENAI_API_KEY/ANTHROPIC_API_KEY): try captureFixture(.../resume/context.json), warn about skipping automatic resume
  - Else:
    - createAbortSignal(sessionId)
    - Build resumeOptions: SingleExecutionOptions with preserveWorkspace=true, slugOverride=projectSlug, resumeFixture, tracePhase="resume", progressMetadata includes resume=true (+queue metadata if bullmq)
    - Determine plan: stepQueue.getPlannedSteps(sessionId) ordered; build descriptors; default to single step with resumeOptions
    - stepQueue.runWorkflow(sessionId, descriptors, { resume: true })
      - catch(e): if not PausedError -> log error, setProgress(sessionId, "finalizing", 100, { resume: true, error: message }, true)
      - finally: cleanupAbortSignal(sessionId)
  - Return 200 with { checkpoint, answeredQuestions, resumed: true }
  - Errors:
    - ResumeValidationError -> 400 with { error, issues }
    - ResumeStateError -> 409 with { error }
    - Error -> 500 with { error: message }
    - Unknown -> 500 with { error: "unknown error" }
  - Preserve logs and messages as-is

4) Integration in server.ts
- Import and call mountSessionsRoutes(app, deps) near other mounts (clarify, execute, progress).
- Construct deps by passing references to existing locals/functions:
  - getProgress, ensureOrchestrationSession, getOrchestrationSession
  - snapshotFromSession, stateToStage, setProgress
  - abortSession, raiseInterrupt, resumeFromCheckpoint
  - captureManifest, getManifest
  - buildResumePrompts
  - normalizeInterruptQuestions, normalizeResumeAnswers
  - captureFixture, slugify, stepQueue
  - createAbortSignal, cleanupAbortSignal
  - readSystemPrompt: () => fs.readFile("src/executor/systemPrompt.md", "utf-8")
- Remove the inline handlers from server.ts once the router is mounted and tests pass (or temporarily comment them out for an ultra-safe diff, then fully remove after green).

5) Error handling and middleware
- Do not change route paths or default status codes/payload shapes.
- Keep problem details middleware installed globally (already done in server).
- For internal server errors where server.ts used respondWithProblem elsewhere, you may continue using the current JSON shape used by these two routes to avoid breaking tests.
- Preserve all logs and messages exactly.

### Validation protocol

At each micro-step, run and keep green:
- npm run lint — ESLint must pass with zero warnings
- npm run typecheck — TypeScript must pass
- npm test — All tests and coverage thresholds pass
- npm run contract:check — Contracts validate
- npm run sbom and npm run sbom:cyclonedx — SBOM artifacts generate
- npm run provenance — SLSA provenance generates

Note: The repository threshold is 80% lines / 75% branches. Ensure 100% test coverage for the new sessions routes module specifically, while keeping repo-wide thresholds green.

### Tests to add (100% module coverage)

Add focused unit tests for routes.ts that cover:
- Pause happy path:
  - Valid id, not already paused, questions normalized default, checkpoint persisted, snapshot updated, returns 201
- Pause error cases:
  - Missing id -> 400
  - Session not found -> 404
  - Already paused -> 409
  - raiseInterrupt throws “Cannot raise interrupt” -> 409
  - Invalid context/payload shapes -> 400
- Resume happy path:
  - Valid id, answers present, resumeFromCheckpoint result consumed, prompts built, snapshot updated, returns 200
  - Branch: provider configured vs not configured (captureFixture path)
  - Branch: planned steps present vs fallback to single step
- Resume error cases:
  - Missing id -> 400
  - Session not found -> 404
  - Empty answers -> 400
  - ResumeValidationError -> 400 with issues
  - ResumeStateError -> 409
  - Generic Error -> 500

Use stubs/mocks for injected deps to isolate behavior; assert exact status codes, payload shapes, and that injected functions were called with right arguments.

### Quality and compliance gates

- No API or feature flag changes.
- No new dependencies added.
- ESLint: zero warnings repo-wide.
- TS: strict types; no any.
- Tests: 100% module coverage for the new routes; repo thresholds met or exceeded.
- Contracts and SBOM/provenance tasks pass.

### Chain-of-thought and self-verification

Before each step:
- Quietly reason about the impact surface (DI wiring, behavior preservation, test expectations).
- Run a self-checklist:
  - Did I inject all required helpers and only those?
  - Did I preserve status codes, payload shapes, and logs?
  - Are types complete and precise?
  - Are all error branches tested?
  - Are lint/typecheck/tests/contract/sbom/provenance green?

If a check fails:
- Stop, fix the specific failure with the smallest safe change, re-run validations, and repeat.

### Completion criteria (must all be true)

- routes.ts created with fully typed router and DI surface
- server.ts mounts mountSessionsRoutes with correctly constructed deps and has no inline pause/resume handlers
- Lint/typecheck/tests/contract/sbom/provenance all pass
- New tests achieve 100% coverage for the sessions routes module and keep repo thresholds green
- No behavioral diffs on existing endpoints and logs
- No warnings, no cleanup tasks remaining
- Discovery note updated with integration points (file/line spans, DI surface, snippets) at phase21_discovery_note.md under a new “Session 2 — S2-03” section

### Hints and references

- Pause route current source: server.ts ~lines 1873–1950
- Resume route current source: server.ts ~lines 1976–2150
- Related helpers in server.ts for DI:
  - getProgress, setProgress, snapshotFromSession, stateToStage
  - ensureOrchestrationSession, getOrchestrationSession
  - abortSession, createAbortSignal, cleanupAbortSignal
  - normalizeInterruptQuestions, normalizeResumeAnswers
- Orchestrator pieces:
  - orchestrator/interrupts.ts: raiseInterrupt
  - orchestrator/resume.ts: resumeFromCheckpoint, types and errors
  - orchestrator/stepQueue.ts: StepQueue, StepDescriptor
  - orchestrator/workspaceManifest.ts: captureManifest, getManifest
  - orchestrator/resumePrompt.ts: buildResumePrompts
- System prompt path: systemPrompt.md

### Commands to run (at each checkpoint)

These are the exact commands; run them and fix issues before continuing.

```sh
npm run -s lint
npm run -s typecheck
npm -s test
npm run -s contract:check
npm run -s sbom
npm run -s sbom:cyclonedx
npm run -s provenance
```

If any step fails: halt, document the failure briefly in the discovery note updates, fix, and re-run.

---

When finished, include in the PR:
- Discovery note update for S2-03 (integration points, DI injection list, code snippets ±10 lines, compliance check)
- Evidence: all validations passing; attach coverage summary highlighting 100% for the new module
- Assure no protected files were modified

This completes S2-03 with DI, zero drift, and production-grade quality.