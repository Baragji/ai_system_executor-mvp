# Refactor Task 15: Wire Monolith → Orchestrator Service (Proxy)

**Task ID**: REFACTOR-TASK-15
**Estimated Time**: 30–45 minutes
**Prerequisites**: REFACTOR-TASK-12..14
**Service**: monolith → orchestrator
**Refactor Phase**: 22 (Service Extraction Core)
**Impact Level**: High

## PRE-EXECUTION VALIDATION

```bash
rg -n "/api/execute|/api/executions" src/server.ts
printenv ORCHESTRATOR_URL || echo "ORCHESTRATOR_URL unset (expected)"
```

## Context
Add `ORCHESTRATOR_URL` env var and route monolith `/api/execute` and `/api/executions/:id` to the orchestrator service when set. Fallback to legacy behavior when unset.

## Implementation Steps

1) Add env + health check
- Introduce `ORCHESTRATOR_URL` with default (unset) and optional health probe.

2) Proxy routes
- For POST `/api/execute`: forward JSON body; on 202, relay Location header; for GET `/api/executions/:id`, proxy response body.
- Preserve RFC 9457 error handling via existing middleware.

## POST-EXECUTION VALIDATION

```bash
export ORCHESTRATOR_URL=http://localhost:3005
npm run dev & sleep 2
curl -sS -D - -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{"prompt":"ping"}' | rg -n "202|Location"
```

## Rollback Procedure

```bash
git checkout -- src/server.ts
```

## Definition of Done
- [ ] ORCHESTRATOR_URL supported
- [ ] Monolith proxies execute/status to orchestrator
- [ ] Parity tests pass
