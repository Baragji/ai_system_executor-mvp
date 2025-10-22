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
