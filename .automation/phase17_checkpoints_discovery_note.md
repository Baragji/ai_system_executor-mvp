# Phase 17 – Checkpoint Store Concurrency Hardening

Date: 2025-10-12

Goal: Eliminate flakiness where concurrent tests delete `.automation/checkpoints` while the orchestrator writes step workflow checkpoints, causing ENOENT/ENOTEMPTY and 500 responses.

## Integration Points

- File: `src/orchestrator/checkpointStore.ts:112`
  - Function: `writeWorkflow(workflow)`
  - Current implementation (±10 lines):
    ```ts
    async function writeWorkflow(workflow: StepWorkflow): Promise<void> {
      await ensureRoot();
      const safeId = sanitizeSessionId(workflow.sessionId);
      const filePath = path.join(WORKFLOW_ROOT, `${safeId}.json`);
      const payload = JSON.stringify(workflow, null, 2);
      await fs.writeFile(filePath, payload, "utf-8");
    }
    ```
  - Issue: If another test concurrently removes `.automation/checkpoints` between `ensureRoot()` and `writeFile`, Node throws `ENOENT`, propagating to HTTP 500 in `/api/execute` and resume flows.

## Observed Failures

- tests/api/execute-multi-turn.test.ts
  - Error: `ENOENT: no such file or directory, open '.automation/checkpoints/step-workflows/<id>.json'`
  - Effect: Expected 200, received 500 from `/api/execute`.

- tests/api/sessions-pause-resume.test.ts
  - Error: `ENOTEMPTY: directory not empty, rmdir '.automation/checkpoints'` during `afterEach` cleanup.
  - Cause: Concurrent writes from other tests as cleanup removes the parent directory.

## Change Strategy

- Make `writeWorkflow` resilient to concurrent deletion by catching `ENOENT` and retrying once after `ensureRoot()`.
- No API or contract changes.
- Keeps behavior consistent; only adds robustness.

## Potential Impacts

- Positive: Removes intermittent 500s in multi-turn execution and session resume tests.
- Neutral: No changes to schemas, endpoints, or public contracts.
- Risk: Minimal; guarded retry on specific error code only.

## Stack Compliance Check (ai-stack.json)

- Language/Backend: TypeScript/Node (OK)
- Frontend: No changes (OK)
- Dependencies: None added (OK)
- Testing: Covered by existing API tests that were failing (OK)
- Lint/Typecheck: No rule violations expected (OK)

## Justification

This is reliability hardening under Phase E. The retry-on-ENOENT is a standard mitigation for TOCTOU-like races between directory creation and file writes under concurrent test cleanup.

