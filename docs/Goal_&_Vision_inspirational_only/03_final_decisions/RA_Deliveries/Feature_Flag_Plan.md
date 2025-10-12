# Feature Flag Plan — AGENTS_RUNTIME

- **Flag**: `AGENTS_RUNTIME`
- **Default**: `stepqueue`
- **Candidate**: `langgraph`
- **Scope**: Switches the POST `/api/execute` codepath in `src/server.ts` to use `src/orchestrator/adapter.ts` (LangGraph) when set to `langgraph`.

## Risks
- Partial rollout can introduce user-visible differences in logs/latency.

## Rollout
1. Staging: 100% internal, verify parity & perf.
2. Prod canary: 5% → 25% → 50% → 100% if SLOs hold.

## Rollback
- Set `AGENTS_RUNTIME=stepqueue` (or unset) and redeploy. No migrations required.
