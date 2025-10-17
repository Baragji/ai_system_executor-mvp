# Phase A Discovery Note — Pause/Resume + Planning Short-Circuit

Last updated: 2025-10-11

## Integration points verified

1) server.ts — PausedError propagation during planning and plan execution

- File: `src/server.ts`
- Context: POST `/api/execute`
- Snippets (±10 lines)

```ts
// Short-circuit: rethrow pause during plan execution
try {
  const planJob = createPlanJobPayload({ /* ... */ });
  if (executionQueue.mode === "bullmq") {
    setProgress(sessionId, "planning", 20, { queued: true, mode: "queue" });
  }
  const planResultJob = await executionQueue.submit(planJob);
  const planResult = planResultJob.type === "plan" ? planResultJob.result : null;
  if (!planResult) {
    throw new Error("Plan job returned unexpected result type");
  }
  setProgress(sessionId, "finalizing", 95);
  return res.json(planResult.response);
} catch (planError) {
  if (planError instanceof PausedError) {
    throw planError; // <- rethrow PausedError
  }
  console.error("Plan execution failed, falling back to single execution", planError);
  // transition to GENERATING and fall through
}
```

```ts
// Short-circuit: rethrow pause during decomposition
} catch (error) {
  if (error instanceof PausedError) {
    throw error; // <- rethrow PausedError
  }
  console.warn("Planning decomposition failed, falling back to single execution", error);
  // transition to GENERATING and fall through
}
```

2) server.ts — Pause handling in single execution

- File: `src/server.ts`
- Context: `runSingleExecution(...)`
- Snippet (±10 lines)

```ts
try {
  output = await withTraceContext({ /* ... */ }, async () =>
    generateExecutorOutputFromPrompt(systemPrompt, executorPrompt, { enforceTests: true, sessionId })
  );
} catch (rawError) {
  if (rawError instanceof PausedError) {
    throw rawError; // <- propagate pause
  }
  // else convert to 422 and finalize
}
```

3) server.ts — `/api/execute` returns 202 on pause

- File: `src/server.ts`
- Context: POST `/api/execute` outer try/catch
- Snippet (±10 lines)

```ts
} catch (err: unknown) {
  // Handle pause interruption gracefully
  if (err instanceof PausedError) {
    console.log(`Execution paused for session ${err.sessionId} during ${err.phase}`);
    if (sessionId) {
      cleanupAbortSignal(sessionId);
    }
    return res.status(202).json({ paused: true, sessionId: err.sessionId, phase: err.phase, message: err.message });
  }
  // ... error handling ...
}
```

4) public/script.js — Immediate snapshot fetch after pause

- File: `public/script.js`
- Context: `handlePauseClick()`
- Snippet (±10 lines)

```js
// After successful pause, fetch a fresh snapshot immediately (no 900ms wait)
const questions = data?.checkpoint?.payload?.pendingQuestions ?? [];
showResumeDrawer(questions);

try {
  const snapshotResp = await fetch(`/api/progress/snapshot/${activeSessionId}`);
  if (snapshotResp.ok) {
    const snapshot = await snapshotResp.json();
    updateOrchestrationState(snapshot);
  }
} catch (snapshotErr) {
  console.warn("Failed to fetch snapshot after pause:", snapshotErr);
}
```

5) State machine mapping and session snapshots

- File: `src/server.ts`
- Functions: `mapStageToState`, `stateToStage`, `setProgress`, `snapshotFromSession`
- Impact: Drive UI state, paused flag, and question rendering through GET `/api/progress/snapshot/:sessionId` and SSE at `/api/progress/stream/:sessionId`.

6) Playwright configuration for reuse and artifacts

- File: `playwright.config.ts`
- Verified:
  - `webServer` reuses local dev server unless on CI
  - `baseURL` defaults to `http://localhost:3000`
  - Reporters write to `.automation` directory (HTML + JSON)
  - Tracing on first retry, screenshots/videos on failure

## Endpoints of interest

- POST `/api/execute` — orchestrates planning or single flow; returns 202 on PausedError.
- POST `/api/sessions/:id/pause` — aborts and raises interrupt; captures checkpoint; updates snapshot immediately in UI.
- POST `/api/sessions/:id/resume` — resumes from checkpoint; auto-executes when provider configured.
- GET `/api/progress/snapshot/:sessionId` — polling snapshot used by UI and tests.
- GET `/api/progress/stream/:sessionId` — SSE stream for progress.

## Stack compliance

- Language: TypeScript/JavaScript only (confirmed). No Python files.
- Backend: Node 20.10+ (checked `package.json` engines: ">=20.10.0 <21").
- Frontend: Vanilla JS/CSS under `/public` (confirmed).
- Testing: Vitest present; Playwright config writes artifacts under `.automation`.
- Linting: ESLint enabled; zero warnings policy.

## Proposed tests (added under tests/ui)

- pause-immediacy.spec.ts — Verifies resume drawer appears quickly and a snapshot fetch occurs immediately after pause.
- plan-pause-shortcircuit.spec.ts — Uses a complex prompt, pauses during planning, asserts `/api/execute` returns 202 and no `browse_url`.
- resume-flow.spec.ts — From paused, submits answers and checks snapshot transitions out of PAUSED; full completion asserted only when provider configured.
- single-pause.spec.ts — Forces single execution path, pauses mid-run, asserts 202 paused and proper UI state.

## Potential impacts

- No API changes or new dependencies introduced.
- Tests rely on timing; thresholds chosen conservatively to reduce flakiness.
- Resume-flow auto-execution depends on provider env; test guards when not configured.

## Justification

The tests codify the new pause semantics and ensure planning short-circuits do not fall through to single execution. Artifacts land in `.automation` per repo standards, enabling traceability.
# Phase A Discovery Note

## Win A1 Integration Point
- File: public/script.js
- Function: executeRequest
- Line: 677
- Current code snippet:
```javascript
    const data = await resp.json();
    if (!resp.ok) {
      resultEl.textContent = `Error: ${data?.error || resp.statusText}`;
      return;
    }

    resultEl.textContent = JSON.stringify(data, null, 2);
    renderTaskPlan(data.taskPlan, data.planExecutionResult, data.timeEstimate);
    if (data?.browse_url) {
      resultEl.appendChild(document.createElement("br"));
      resultEl.appendChild(renderLink(data.browse_url));
```
- Justification: This is where successful execution results are rendered and currently dumps raw JSON. Replacing the assignment enables the success card without affecting downstream rendering or task plan updates.

## Win A2 Integration Point
- File: public/script.js
- Function: executeRequest
- Line: 648
- Current code snippet:
```javascript
async function executeRequest({ prompt, projectName, clarifications }) {
  resetClarificationUI();
  resultEl.textContent = "Planning and executing your project... This may take several minutes for complex requests.";
  testControlsEl.classList.add("hidden");
  currentProjectSlug = null;
  renderRepairHistory(null);
  resetTaskPlanUI();
```
- Justification: Initial loading text is set here before the fetch begins. Converting this area to a phase-aware loader with spinner ensures the UI reflects progress during request execution.

## Win A3 Integration Point
- File: public/script.js
- Function: executeRequest / startClarificationFlow
- Lines: 690, 736
- Current code snippet:
```javascript
  } catch (err) {
    resultEl.textContent = String(err);
  }
}
...
  } catch (err) {
    resultEl.textContent = String(err);
  }
```
- Justification: Both error paths dump technical strings. Replacing these with formatError(err) allows consistent messaging while preserving technical detail within expandable sections.

## Stack Compliance Verified
✓ TypeScript/JS only
✓ No Python
✓ Frontend under /public
✓ No new frameworks
