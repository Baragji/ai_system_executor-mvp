# Phase 1 Orchestrator Extraction — Discovery

## Overview
- Reviewed monolithic orchestrator logic in `src/server.ts` and `src/orchestrator/*` to map required code moves for service extraction.
- Identified dependencies between session store helpers, state machine transitions, executions store, and pause/resume flow.
- Documented API surface for new service (progress, executions, sessions) and shared modules to relocate.

## Key Findings
1. **Session & Progress Helpers (`src/server.ts`)**
   - `setProgress`, `getProgress`, and related session maps must move so progress APIs can be hosted remotely.
   - SSE streaming (`openProgressStream`) couples to the same state; extraction requires shared store module.
2. **Orchestrator Modules (`src/orchestrator/`)**
   - `stateMachine`, `abortSignal`, `executionsStore`, `resume`, and `resumePrompt` are direct dependencies of session routes.
   - Pausing a session writes checkpoints via `raiseInterrupt` and `checkpoint` helpers; service must ship these intact.
3. **Contract Alignment**
   - Service endpoints map to existing monolith handlers: `/api/progress`, `/api/sessions/:id/pause`, `/api/executions/:id`.
   - Feature flag adapter in monolith will toggle between in-process calls and HTTP client.

## Next Steps
- Scaffold `services/orchestrator` package (tsconfig, package.json, Dockerfile).
- Physically move identified modules and update imports to point to shared location.
- Implement Express server exposing `/v1/executions/:id`, `/v1/sessions/:id/pause|resume`, `/v1/progress/:id`, `/v1/progress/:id/stream`, `/healthz`.
- Wire feature flag in `src/server.ts` to swap between local and remote orchestrator implementations.
- Develop targeted Vitest suite achieving 100% coverage for `services/orchestrator/src`.
