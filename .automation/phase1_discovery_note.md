# Phase 1 — Discovery Note

Scope: Complete repair-intake contract, remove repair-time quick patching, add planner timeouts + jitter, and finalize generated-app E2E workflow.

## Integration Points

- src/repair/multiTurnRepair.ts:256
  - multiTurnRepair control flow and artifact application. Missing-contents retry and synthesis live at 480–535. A deprecated health/test "quick patch" exists behind `DISABLE_HEALTH_PATCH` at 292–357.

- src/repair/multiTurnRepair.ts:138
  - applyArtifacts currently allows unconditional delete with `fs.rm(..., { force: true })` and throws on missing contents for add/modify.

- src/contracts/validators.ts:1
  - Ajv 2020 validator wiring already exists (run result, executor output, repair artifact). We’ll add an inline Ajv schema for the full repair intake payload and runtime checks (disk existence) in multiTurnRepair.

- src/planning/decomposeTask.ts:158
  - Decomposition loop (2 attempts) without explicit abort/timeout. We’ll wrap the request with AbortSignal.timeout and add capped exponential backoff + jitter with distinct abort logging.

- src/planning/executeSubtask.ts:96 and src/server.ts:246–270
  - Subtask generation path via `generateSubtaskOutputWithRetry`. We’ll wrap generation in a timeout using AbortSignal.timeout at the call site created in `createPlanExecutionContext().generateSubtaskOutput` in src/server.ts.

- .automation/proposals/workflows/generated-app-e2e.yml:1
  - Proposal workflow exists. We’ll move and expand it under `.github/workflows/generated-app-e2e.yml` to add OSV-Scanner and Semgrep, upload proof bundle, and ensure the job fails unless generated app tests pass.

## Current Implementation (Snippets)

- multiTurnRepair — missing-contents fallback and deprecated quick patch (292–357, 480–535):

```ts
// Quick, deterministic repair (deprecated) — disabled via flag
const DISABLE_HEALTH_PATCH = true;
if (!DISABLE_HEALTH_PATCH && currentRun.status !== 'pass' && currentFailureAnalysis) {
  // ... regex-patch /health and test normalization ...
}

// One-time retry; then synthesize artifacts from files
try {
  applyResult = await applyArtifacts(projectPath, payload.artifacts, payload.files);
} catch (applyErr) {
  if (msg.includes("Missing contents for ")) {
    payload = await requestPayload(true);
    // if still missing → synthesize from files
    let artifacts = synthesizeArtifactsFromFiles(payload);
    // ... filtered = artifacts.filter(...)
    if (artifacts.length === 0 && payload.files.length === 0) {
      const errorSummary = 'REPAIR_INCOMPLETE_ARTIFACT: no concrete changes available after retry';
      // currently pushes attempt and continue
    }
    applyResult = await applyArtifacts(projectPath, artifacts, payload.files);
  }
}
```

- decomposeTask loop (no explicit timeout/backoff):

```ts
for (let attempt = 0; attempt < 2; attempt += 1) {
  const response = await requestPlan(prompt, clarifications, previousIssues);
  const plan = parsePlan(response, prompt);
  const validation = validateTaskPlan(plan);
  // retry on validation failure
}
```

- createPlanExecutionContext().generateSubtaskOutput in src/server.ts (no explicit timeout wrapper):

```ts
generateSubtaskOutput: async request => {
  const out = await withTraceContext(..., async () =>
    generateSubtaskOutputWithRetry(systemPrompt, request, false, undefined, onRetry)
  );
  await captureFixture(..., out);
  return out;
},
```

- E2E workflow proposal exists at `.automation/proposals/workflows/generated-app-e2e.yml`.

## Planned Changes

- Repair intake contract enforcement:
  - Remove repair-time quick patch block entirely.
  - After one retry, Ajv-validate a full `repair-intake` payload (JSON Schema 2020-12) and enforce:
    - add/modify must include full file contents in files[]
    - delete allowed only if path exists on disk and action is explicitly `delete`
  - If still incomplete: synthesize artifacts from files vs disk; if still nothing concrete, emit `REPAIR_INCOMPLETE_ARTIFACT` and stop the loop early.

- Planner resilience:
  - decomposeTask: wrap request in `AbortSignal.timeout(DECOMPOSE_TIMEOUT_MS)`, add capped exponential backoff with jitter between attempts, and log aborts via telemetry.
  - Subtask generation: wrap `generateSubtaskOutputWithRetry` at call site with `AbortSignal.timeout(SUBTASK_TIMEOUT_MS)`, logging distinct aborts.

- E2E CI gate:
  - Move proposal to `.github/workflows/generated-app-e2e.yml`.
  - Add OSV-Scanner and Semgrep CI steps.
  - Upload proof bundle: generated app test report (>0 tests), SBOM, OSV, Semgrep, and session fixtures.

## Dependencies & Impacts

- Ajv already present (`ajv`, `ajv-formats`). No new deps.
- Contract shape validated with Ajv; disk checks implemented in code.
- Removal of repair quick patch centralizes health normalization to generator step only.
- Timeouts rely on Node 20 `AbortSignal.timeout` and existing generateJSON backoff.

## Stack Compliance (ai-stack.json)

- Language: TypeScript/JavaScript only — OK
- Backend: Node.js 20+ with Express — OK
- Frontend: no framework changes — unchanged
- Testing: Vitest — tests updated, coverage preserved
- Linting: ESLint — abide by existing config
- Protected files: moving workflow under `.github/workflows/*` requires CODEOWNERS approval

## Risks / Mitigations

- Risk: Over-strict delete validation could break future artifacts — mitigation: synthesize from files first; otherwise explicit failure with trace.
- Risk: Timeouts too short — mitigation: env-configurable timeouts, capped backoff with jitter, and distinct abort logs.

Evidence artifacts will include updated tests, coverage, contract checks, and SBOM.

