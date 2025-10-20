# Refactor Task 21: Remaining Services Extraction — Discovery

**Task ID**: REFACTOR-TASK-21
**Estimated Time**: 30–45 minutes
**Prerequisites**: Refactor Tasks 01–20 complete and validated
**Services**: planning, repair, executor, clarification
**Refactor Phase**: 23 (Domain Services Extraction)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
node -v                                  # Expect Node v20+
rg -n "decomposeTask\(|estimateCompletion|executeTaskPlan" src/planning | head -n 10 || true
rg -n "multiTurnRepair\(|repairOnce\(|analyzeFailure" src/repair | head -n 10 || true
rg -n "writeFiles\(|sanitizeOutput\(|generateDiff" src | head -n 10 || true
rg -n "generateQuestions\(|augmentPrompt\(|suggestDefaults" src/clarification | head -n 10 || true
```

## Context
We must extract the remaining domain services into independent microservices before adding new features. This task produces a single discovery artifact enumerating:
- Exact file:line integration points for planning, repair, executor, and clarification
- Proposed service endpoints and request/response shapes
- Proxy env vars for monolith wiring: `PLANNING_URL`, `REPAIR_URL`, `EXECUTOR_URL`, `CLARIFICATION_URL`
- Risks, test touch points, and acceptance criteria

## Implementation Steps

1) Map domain functions → service endpoints
- planning: `decomposeTask`, `executeTaskPlan`, `estimateCompletion` → `/decompose`, `/execute-plan`
- repair: `analyzeFailure`, `repairOnce`, `multiTurnRepair` → `/analyze`, `/repair`
- executor: `writeFiles`, `sanitizeOutput`, validations → `/generate`, `/validate`
- clarification: `generateQuestions`, `augmentPrompt`, `suggestDefaults` → `/clarify`

2) Identify monolith wiring points
- Where requests originate (routes calling domain functions)
- Where RFC9457 problem+json is returned
- Where telemetry is emitted (to remain local for now)

3) Produce discovery artifacts
- Write `.automation/phase23_services_discovery.json` with:
  - `services`: per-service arrays of `files`, `insert_points`, `routes`, `env`
  - `parity_tests`: list of root tests to validate after extraction
- Optional: `.md` summary for reviewers

## POST-EXECUTION VALIDATION

```bash
test -f .automation/phase23_services_discovery.json
cat .automation/phase23_services_discovery.json | jq '.services | keys'
```

## Rollback Procedure

```bash
rm -f .automation/phase23_services_discovery.json
```

## Definition of Done
- [ ] Discovery JSON exists with concrete file:line references for 4 services
- [ ] Proposed endpoints and env vars listed
- [ ] Parity tests identified

