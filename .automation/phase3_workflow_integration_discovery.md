# Workflow Phase 3 — Discovery Note (WF3-W31)

Last Updated: 2025-10-14  
Scope: Backend runtime integration (`src/server.ts`)

## Integration Points and Current Implementation

- **Workflow imports** — `src/server.ts` (top of file)
  ```ts
  import { generateJSON } from "./llm/index.js";
  import { withTraceContext } from "./llm/trace.js";
  // PhaseState utilities will join this block to keep runtime centralized.
  ```
  *Reason:* Need to import `loadPhaseState`, `suggestNextAction`, and `formatHumanSummary` so the runtime can share the same workflow insights as CLI tooling.

- **setProgress(sessionId, stage, progress, data, done)** — `src/server.ts:210`
  ```ts
  progressSessions.set(sessionId, {
    stage,
    progress,
    data,
    updatedAt: Date.now(),
    done,
    state: session.machine.state,
    paused: session.paused,
    questions: session.questions,
    checkpointUpdatedAt: session.checkpointUpdatedAt
  });
  ```
  *Reason:* Progress cache is the natural place to memoize workflow metadata so SSE + polling stay in sync.

- **snapshotFromSession(sessionId, fallback)** — `src/server.ts:270`
  ```ts
  return {
    stage: baseStage,
    progress: existing?.progress ?? 0,
    data: existing?.data,
    updatedAt: Date.now(),
    done: existing?.done ?? false,
    state: session.machine.state,
    paused: session.paused,
    questions: session.questions,
    checkpointUpdatedAt: session.checkpointUpdatedAt
  };
  ```
  *Reason:* Builder should surface memoized workflow context so `/api/progress`, `/api/progress/snapshot`, and SSE remain authoritative.

- **app.post("/api/execute", …)** — `src/server.ts:1505`
  ```ts
  const providedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
  const sessionId = providedSessionId || randomUUID();
  setProgress(sessionId, "analyzing", 10);
  ```
  *Reason:* Prime workflow context as soon as a session spins up.

- **Pause/Resume routes** — `src/server.ts:1899` and `:2002`
  *Reason:* Paused sessions must keep workflow metadata aligned when generating checkpoints and resuming execution.

## Dependencies & Impacts

- **Primary dependency:** `src/state/phaseState.ts` (already provides normalized gates/tasks + helper APIs).
- **No new packages.** Memoization will live entirely in `src/server.ts`.
- **Performance consideration:** Avoid repeated disk reads by caching per session and clearing when TTL expires.

## Stack Compliance

- Language: TypeScript (Node.js 20 runtime)
- Framework: Express backend only (no frontend impact)
- Tests: Existing Vitest suite continues to enforce ≥80%/75%
- Lint: ESLint (0 warnings tolerance)
- Forbidden tech: No Python, no frontend frameworks introduced

## Open Questions / Follow-ups

1. Where should validation snapshots live? (Candidate: `.automation/validation_results.json` or StepQueue memory.)
2. When enriching responses in WF3-W32, confirm payload shape with UI to avoid breaking `/public/script.js` consumers.

