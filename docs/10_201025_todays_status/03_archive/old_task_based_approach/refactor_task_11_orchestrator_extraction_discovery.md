# Refactor Task 11: Orchestrator Extraction — Discovery

**Task ID**: REFACTOR-TASK-11
**Estimated Time**: 30–45 minutes
**Prerequisites**: Refactor Tasks 01–10 complete
**Service**: orchestrator (new)
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
node -v                           # Expect v20+
rg -n "class StepQueue|runWorkflow\(|updateExecution\(|completeExecution\(" src | wc -l
git status --porcelain            # Expect clean or docs-only
```

## Context
Extract the orchestration path out of the monolith into `services/orchestrator`, while preserving API parity (202 + Location; GET status). This task produces a discovery artifact with exact integration points and call sites to guide extraction with zero guesswork.

## Implementation Steps

1) Map integration points
- Identify files/lines for:
  - `StepQueue` and `runWorkflow`
  - Executions store: `updateExecution`, `completeExecution`, `failExecution`
  - Abort/cleanup: `cleanupAbortSignal`
  - Feature flag routing for `AGENTS_RUNTIME`
  - Current `/api/execute` and `/api/executions/:id` wiring (202 Location semantics)

2) Produce discovery artifacts
- Create `.automation/phase22_services_discovery.json` with an object:
  - `orchestrator`: { files: [...], insert_points: [...], env: ["ORCHESTRATOR_URL"] }
  - `runner`: { files: [...], insert_points: [...] } (outline for Task 16–18)
- Add a short `.md` note summarizing risks and assumptions (optional).

## POST-EXECUTION VALIDATION

```bash
test -f .automation/phase22_services_discovery.json
cat .automation/phase22_services_discovery.json | jq '{orchestrator, runner} | keys'
rg -n "AGENTS_RUNTIME|/api/execute|/api/executions" src | head -n 20
```

## Rollback Procedure

```bash
rm -f .automation/phase22_services_discovery.json
```

## Definition of Done
- [ ] Discovery JSON exists with concrete file:line references
- [ ] Insert points listed for routes, StepQueue, store, and cleanup
- [ ] Risks/assumptions captured
