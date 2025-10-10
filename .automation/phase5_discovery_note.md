# Phase 5 Discovery Note — WA1 (Discovery), WA2 (State Machine), WA3 (Checkpoints), WA4 (Interrupts)

## Scope Recap
- **Objective:** Establish orchestration spine enabling pause/resume by adding a state machine primitive and checkpoint persistence without altering existing `/api/execute` flow yet.
- **Wins Covered:**
  - WA1 – Discovery groundwork for orchestration.
  - WA2 – New `src/orchestrator/stateMachine.ts`.
  - WA3 – New `src/orchestrator/checkpoints.ts` plus supporting tests.

## Current Execution Flow Findings
- **Primary integration point:** `src/server.ts` `app.post("/api/execute")` handles clarification, planning, generation, repair, and response shaping. Key snippet (lines ~640-750):
```ts
app.post("/api/execute", async (req, res) => {
  const sessionId: string | undefined = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
  setProgress(sessionId, "analyzing", 10);
  const promptRaw = req.body?.prompt;
  const originalPrompt: string = promptRaw === undefined ? "" : promptRaw.toString();
  // …clarification + planning…
  output = await withTraceContext({ projectSlug: slugify(projectNameInput || "generated-project", { lower: true, strict: true }) || "generated-project", sessionId, phase: 'single' }, async () =>
    generateExecutorOutputFromPrompt(systemPrompt, effectivePrompt, { enforceTests: true })
  );
  // …write files, run tests, multiTurnRepair, log events…
  return res.json(responsePayload);
});
```
  - All orchestration stages currently execute sequentially without pause checkpoints.
  - `sessionId` already flows through progress + trace helpers, providing a natural key for checkpoint files.

- **Repair loop integration:** `src/repair/multiTurnRepair.ts` orchestrates iterative fixes; context object already includes `sessionId` and file paths. Snippet (lines ~1-60):
```ts
export interface MultiTurnContext {
  projectPath: string;
  projectSlug?: string;
  originalPrompt: string;
  generatedFiles: string[];
  initialTestResult: RunResult;
  sessionId?: string;
}
```
  - Future integration can propagate pause/resume metadata into this context if repair should checkpoint mid-loop.

- **Clarification capture:** `src/clarification/detectMissing.ts` and the `/api/clarify` handler run before execution. Their outputs will later translate into `AMBIGUITY` interrupts that write checkpoints instead of the bespoke clarify loop.

## Candidate State Machine Design (WA2)
- **States:** `CLARIFYING`, `PLANNING`, `GENERATING`, `PAUSED`, `DONE`.
- **Transitions:**
  - `CLARIFYING → PLANNING | GENERATING | PAUSED` (skip planning for simple prompts).
  - `PLANNING → GENERATING | PAUSED`.
  - `GENERATING → DONE | PAUSED`.
  - `PAUSED → CLARIFYING | PLANNING | GENERATING` based on resume answers.
  - `DONE` is terminal (no outgoing transitions).
- **Events:** Emit `{ previous, current, reason? }` via `EventEmitter` on each transition so `/api/execute` (and eventually SSE) can reflect status changes.
- **Guards:** Reject invalid transitions, `DONE` repeats, or redundant transitions to same state (idempotent by ignoring or throwing – opting to throw for visibility).

## Checkpoint Schema Proposal (WA3)
- **Storage root:** `.automation/checkpoints/` (new directory).
- **File naming:** `${sessionId}.json` (session ID sanitized by caller).
- **Schema draft:**
```json
{
  "schema": "umca.phase5.checkpoint",
  "version": 1,
  "sessionId": "string",
  "state": "CLARIFYING|PLANNING|GENERATING|PAUSED|DONE",
  "updatedAt": "ISO timestamp",
  "machine": {
    "history": [
      { "state": "…", "enteredAt": "ISO timestamp" }
    ],
    "context": {
      "prompt": "string",
      "clarifications": {}
    }
  },
  "payload": {
    "pendingQuestions": [
      {
        "id": "string",
        "question": "string",
        "type": "AMBIGUITY|APPROVAL|BUDGET_RISK"
      }
    ],
    "executor": {
      "projectSlug": "string | null",
      "repairAttempt": {
        "step": "initial|repair",
        "attempt": 0
      }
    }
  }
}
```
- **Versioning plan:** Embed `version` and fail fast if a checkpoint on disk does not match supported versions (initially `1`).
- **Atomicity:** Write checkpoints to `${filename}.tmp` then `rename` → prevents partial writes during crashes.
- **Validation:** Use AJV 2020 with `allErrors` + `allowUnionTypes` consistent with existing validators.

## Dependencies & Impact Assessment
- **New modules:** `src/orchestrator/stateMachine.ts`, `src/orchestrator/checkpoints.ts`, and matching Vitest suites under `tests/orchestrator/`.
- **Existing utilities leveraged:**
  - `node:events` `EventEmitter` for state change notifications.
  - `node:fs/promises` + `node:path` for checkpoint IO.
  - `slugify` already used in `/api/execute` – no changes required yet but checkpoints will store sanitized session IDs only.
  - `ajv` dependency already present in repo (used by repair + contract validators) so no new package installations.
- **No immediate runtime wiring:** WA2/WA3 deliver primitives; `/api/execute` integration will happen in WA4+.

## Compliance Checklist
- ✅ Language / framework: TypeScript modules under `src/`.
- ✅ No new dependencies required (reuse existing `ajv`).
- ✅ No protected files touched.
- ✅ Tests to be added under `tests/orchestrator/*` with Vitest.

## Additional Discovery for WA4 (Interrupt System)
- **Objective:** Introduce a first-class interrupt taxonomy that can pause the orchestrator, persist context, and surface clarifying questions for human-in-the-loop answers.
- **Key integration points:**
  - `src/orchestrator/stateMachine.ts` already allows pausing from active states; its guard table shows legal transitions we must honor when triggering interrupts:

    ```ts
    const TRANSITIONS: Readonly<Record<OrchestratorState, ReadonlySet<OrchestratorState>>> = {
      CLARIFYING: new Set(["PLANNING", "GENERATING", "PAUSED"]),
      PLANNING: new Set(["GENERATING", "PAUSED"]),
      GENERATING: new Set(["PAUSED", "DONE"]),
      PAUSED: new Set(["CLARIFYING", "PLANNING", "GENERATING"]),
      DONE: new Set()
    };
    ```

  - `src/orchestrator/checkpoints.ts` exposes the persistence boundary we will reuse. `saveCheckpoint` and the `PendingQuestion` type ensure we persist normalized questions alongside machine history:

    ```ts
    export interface PendingQuestion {
      id: string;
      question: string;
      type: InterruptCategory;
      metadata?: Record<string, unknown>;
    }

    export async function saveCheckpoint(input: CheckpointInput): Promise<CheckpointRecord> {
      const record = normalizeRecord(input);
      await ensureDirectory();
      const target = resolveCheckpointPath(record.sessionId);
      const temp = `${target}.tmp-${process.pid}-${Date.now()}`;
      const payload = JSON.stringify(record, null, 2);
      await fs.writeFile(temp, payload, "utf-8");
      await fs.rename(temp, target);
      return record;
    }
    ```

  - `public/script.js` renders `pendingQuestions` that arrive via checkpoints (lines ~920-1010). Interrupt payloads must maintain this shape so the UI can later display prompts without additional adapters.

- **Approach:**
  - Define canonical interrupt categories (`AMBIGUITY`, `APPROVAL`, `BUDGET_RISK`) and validate incoming question bundles before persisting.
  - Provide `raiseInterrupt` helper that (a) verifies the state machine can pause, (b) transitions with a timestamped reason, (c) serializes machine history + optional context, and (d) persists normalized `PendingQuestion` objects through `saveCheckpoint`.
  - Return the resulting checkpoint record so API callers can stream confirmation and reuse the payload.

- **Risks & Mitigations:**
  - *Duplicate question identifiers* → enforce uniqueness while normalizing bundle and auto-generate UUIDs when absent.
  - *Invalid metadata structures* → reject non-object metadata to keep payload JSON-serializable and AJV-valid.
  - *Illegal pause requests* → guard against pausing from `DONE` or already `PAUSED` states by checking `canTransition("PAUSED")` before writing checkpoints.

## Next Steps
1. Implement state machine according to transitions above with exhaustive tests.
2. Implement checkpoint persistence + schema validation with positive/negative tests.
3. Deliver interrupt taxonomy + `raiseInterrupt` helper with dedicated tests before wiring APIs.
4. Document execution trace entries per win in `.automation/execution_trace.jsonl` as progress evidence.
