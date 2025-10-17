# Phase 2 — LLM Trace Capture (Discovery)

Date: 2025-10-10
Scope: Add first‑class tracing for all LLM calls into the existing fixture system without breaking APIs.

## Integration Points

- LLM entrypoint: src/llm/index.ts:6 generateJSON(messages)
  - Added best‑effort capture of {provider, model, messages, response, attempt} when a trace context is present.
  - Uses new getTraceContext() from src/llm/trace.ts and writes to `.automation/fixtures/<slug>/<sessionId>/llm/<ts>_<phase>_<subtaskId>.json`.

- Trace context: src/llm/trace.ts: in‑process AsyncLocalStorage
  - API: withTraceContext(ctx, fn), getTraceContext().
  - ctx: { projectSlug?, sessionId?, phase?, subtaskId? }.

- Server: src/server.ts
  - Wraps decomposeTask with withTraceContext({ phase:'decompose', projectSlug: pre‑slug, sessionId }).
  - Wraps single‑exec generateExecutorOutputFromPrompt with withTraceContext({ phase:'single', projectSlug, sessionId }).
  - In plan mode, wraps generateSubtaskOutputWithRetry via PlanExecutionContext.generateSubtaskOutput with withTraceContext({ phase:'subtask', projectSlug: slug, sessionId, subtaskId }).
  - Passes sessionId to multiTurnRepair for repair tracing.

- Repair loop: src/repair/multiTurnRepair.ts
  - Extended MultiTurnContext with optional sessionId.
  - Wraps generateJSON in withTraceContext({ phase:'repair', projectSlug, sessionId }).

## Rationale
- We already capture prompts/outputs/plan/repairs to fixtures. This adds low‑friction, per‑call LLM traces (request+response) under the same session so we can pinpoint mis‑generations and schema drift.
- No external API change; optional context only.

## Dependencies & Impact
- Language/stack unchanged. No new deps.
- Tests continue to pass with coverage above thresholds.
- Trace writes are gated by presence of {projectSlug, sessionId}; outside HTTP runs (unit tests), nothing is written.

## Validation
- npm run lint — clean
- npm run typecheck — OK
- npm test — 100% passing, coverage above thresholds
- npm run contract:check — OK
- npm run sbom — OK

