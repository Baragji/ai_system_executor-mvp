# Workflow Phase 1-4 Remediation — Discovery Notes

## Task WF5-V01 — Confirm contamination baseline
- **Objective:** Reproduce the current workflow metadata exposure prior to remediation.
- **Key Integration Points:**
  1. `src/server.ts` — `workflowMetadataCache` and `setProgress` merge workflow metadata into product progress payloads.
  2. `src/server.ts` — `GET /api/workflow/status` serves workflow metadata from `buildWorkflowMetadata`.
  3. `tests/api/workflow-status.test.ts` — Vitest suite that asserts the endpoint returns workflow metadata structures.
- **Stack Compliance Check:**
  - Runtime commands remain within Node.js + TypeScript ecosystem.
  - Baseline verification relies on `npm test -- tests/api/workflow-status.test.ts`.
- **Risks / Considerations:**
  - Captured outputs must be preserved in `.automation/workflow_phase1-4_remediation_trace.jsonl` for auditability.
  - No code changes permitted during this verification step; halt if contamination cannot be reproduced.

## Task WF5-W51 — Remove workflow metadata from product runtime
- **Objective:** Delete workflow caching and status exposure so Express responses only surface product execution data.
- **Key Integration Points:**
  1. `src/server.ts` — `setProgress`, `getProgress`, and `snapshotFromSession` no longer append `workflowMetadata` to SSE/poll payloads.
  2. `src/server.ts` — `/api/execute` bootstrap path now omits workflow cache initialization before orchestrating runs.
  3. `tests/api/progress.test.ts` — Expectations updated to assert the absence of workflow metadata in REST snapshots.
- **Stack Compliance Check:**
  - Remediation performed in TypeScript with existing Express server utilities.
  - Regression coverage executed via `npm test` to confirm payload shapes.
- **Risks / Considerations:**
  - Removing the `/api/workflow/status` route intentionally breaks its dedicated test until deletion in WF5-W54.
  - Progress payloads must be audited to ensure no residual workflow properties remain in SSE snapshots.

## Task WF5-W52 — Isolate workflow state module
- **Objective:** Relocate the workflow state synthesizer outside `src/`, repoint CLI tooling, and keep regression tests targeting the new boundary.
- **Key Integration Points:**
  1. `src/state/phaseState.ts` — `loadPhaseState` and `buildWorkflowMetadata` currently reside under the product tree and must move to `workflow/lib/phaseState.ts`.
  2. `scripts/execute-next-action.js` — Imports `loadPhaseState` and `buildWorkflowMetadata` from the shared module and needs to follow the relocated path.
  3. `tests/state/phaseState.test.ts` — Shared module regression coverage requires updated import paths after relocation.
  4. `tests/api/workflow-status.test.ts` — Type-only import of `WorkflowMetadata` must reference the new workflow library location to keep TypeScript compilation green while legacy assertions are updated.
- **Stack Compliance Check:**
  - Workflow tooling remains TypeScript/JavaScript with Node.js runtime.
  - Focused validation via `npm test -- tests/state/phaseState.test.ts` confirms relocation safety.
- **Risks / Considerations:**
  - Moving the module reduces visibility to the product build; ensure new `tsconfig.workflow.json` covers CLI tooling without reintroducing contamination.
  - All scripts should continue to resolve ESM imports after adjusting relative paths.

## Task WF5-W54 — Retire contaminated API test & reinforce CLI coverage
- **Objective:** Remove the deprecated workflow status API regression while affirming the CLI still sources sanitized metadata from the isolated workflow module.
- **Key Integration Points:**
  1. `tests/api/workflow-status.test.ts` — Remaining describe block exercises the removed endpoint and expects workflow metadata payloads, so the file must be deleted to prevent regression noise.
  2. `tests/state/execute-next-action.test.ts` — CLI regression should import helpers from `workflow/lib/phaseState.ts` and assert that the command output never surfaces `workflowMetadata` fields.
- **Stack Compliance Check:**
  - Changes stay in the TypeScript/Vitest testing layer.
  - Validation performed with `npm test -- tests/state/execute-next-action.test.ts`.
- **Risks / Considerations:**
  - Deleting the API test eliminates direct coverage of the removed route; ensure CLI assertions provide equivalent protection against metadata leaks.
  - CLI tests execute the script repeatedly; watch for flakiness due to repository state or git status output size.
