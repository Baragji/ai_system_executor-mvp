# Phase B – Replay Fixtures (v1) Discovery Note

- Scope: Capture step artifacts (clarify, plan, subtask prompt/output, test run, repair context/history) and add replay endpoints to retest quickly without regeneration.
- Why: Surface errors immediately and validate fixes by re-running only failing steps.

## Integration Points

- src/fixtures/index.ts: writeFixture, listFixtures, readFixture
- src/server.ts
  - createPlanExecutionContext: wraps generateSubtaskOutput + onPromptBuilt; passes sessionId
  - executePlanFlow: captures plan + clarify fixtures; persists _task_plan.json
  - single-path generation: captures tests/initial.json and repair/history.json
  - Endpoints:
    - GET /api/fixtures/:project
    - POST /api/replay/repair
- src/planning/executeSubtask.ts
  - runTests(): captures tests/initial.json, repair/context.json, repair/history.json

## Compliance

- TS/JS only, no new dependencies
- No frontend changes
- No breaking API changes (endpoints are additive)

## Validation

- Unit tests: fixtures utility + endpoints shape
- Lint/type: clean (zero warnings)
- Full test suite remains green (coverage above thresholds)

