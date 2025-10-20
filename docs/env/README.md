# Environment Configuration Reference

This document aggregates every environment variable used by the executor monolith and the refactored microservices. Copy the corresponding `.env.example` into `.env` for local runs, then adjust any service-specific values as needed.

## Microservice quick reference

| Service | Directory | Example port | Notes |
| --- | --- | --- | --- |
| Clarification | `services/clarification` | `3007` (`.env.example`) | Falls back to `3999` if `PORT` is unset. |
| Executor | `services/executor` | `3001` | Matches the code fallback. |
| Planning | `services/planning` | `3002` | Includes planning-specific tuning knobs. |
| Repair | `services/repair` | `3003` | Uses the shared telemetry flags. |
| Runner | `services/runner` | `3004` | Sandbox configuration lives in the monolith for now. |
| Orchestrator | `services/orchestrator` | `3005` | Shares queue and telemetry flags with the monolith. |
| LLM Gateway | `services/llm-gateway` | `3006` (`.env.example`) | Code fallback is `4005` to avoid clashes when unset. |

To bootstrap a service:

```bash
cd services/<name>
cp .env.example .env
npm install
npm run dev
```

All services call `dotenv.config()` at startup and set `NODE_ENV=development` when it is not provided, so a minimal `.env` only needs the variables listed below.

## Common microservice defaults

These variables exist in every service scaffold (`services/_template`).

| Variable | Default | Purpose | Source |
| --- | --- | --- | --- |
| `PORT` | Template defaults to `3999`; each service overrides in `.env.example`. | HTTP listen port. | `services/_template/src/server.ts` |
| `OTEL_ENABLED` | Disabled unless set to a truthy value (`1`, `true`, `yes`). | Enables OpenTelemetry spans. | `services/_template/src/telemetry/otel.ts` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | Collector endpoint when telemetry is enabled. | `services/_template/src/telemetry/otel.ts` |
| `SERVICE_NAME` | Falls back to `executor-service-template` | Identifies the service in telemetry. | `services/_template/src/telemetry/otel.ts` |
| `PROBLEM_DETAILS_ENABLED` | Auto-enabled in `development` and `test`; set `0` to disable. | Toggles RFC 9457 responses. | `services/_template/src/middleware/problemDetails.ts` |

Each concrete service overrides the sample values in its `.env.example`; the fallback strings remain until the extraction work updates the domain code.

## Service-specific additions

### Clarification service (`services/clarification`)

| Variable | Default / Example | Purpose | Source |
| --- | --- | --- | --- |
| `PORT` | Code fallback `3999`; `.env.example` sets `3007`. | HTTP port for `/clarify`. | `services/clarification/src/server.ts` |
| `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `SERVICE_NAME`, `PROBLEM_DETAILS_ENABLED` | See common defaults. | Optional telemetry + error envelope toggles. | `services/clarification/src/telemetry/otel.ts`, `services/clarification/src/middleware/problemDetails.ts` |

### Executor service (`services/executor`)

No extra variables beyond the common defaults. `PORT` defaults to `3001` in code and the example file.

### Planning service (`services/planning`)

| Variable | Default | Purpose | Source |
| --- | --- | --- | --- |
| `PORT` | `3002` | HTTP port for the planning API. | `services/planning/src/server.ts` |
| `SUBTASK_TIMEOUT_MS` | `120000` | Timeout for subtask execution before aborting. | `services/planning/src/domain/context.ts` |
| `CAPTURE_FIXTURES_IN_TESTS` | `false` (tests) / `true` otherwise | Enables fixture capture during Vitest runs. | `services/planning/src/domain/context.ts` |
| Telemetry + problem details | See common defaults. |  |  |

### Repair service (`services/repair`)

Matches the common defaults. `PORT` defaults to `3003`.

### Runner service (`services/runner`)

Matches the common defaults. `PORT` defaults to `3004`.

### Orchestrator service (`services/orchestrator`)

Matches the common defaults. `PORT` defaults to `3005`.

### LLM Gateway service (`services/llm-gateway`)

| Variable | Default / Example | Purpose | Source |
| --- | --- | --- | --- |
| `PORT` | `.env.example` uses `3006`; code fallback `4005`. | HTTP port for completion + stream routes. | `services/llm-gateway/src/server.ts` |
| `LLM_GATEWAY_PROVIDER` | unset → mock driver | Chooses the provider implementation. | `services/llm-gateway/src/server.ts` |
| `OPENAI_API_KEY` | unset | API key for the OpenAI provider. | `services/llm-gateway/src/domain/providers/openai.ts` |
| `LLM_MODEL` | `gpt-5` | Model id passed to the provider. | `services/llm-gateway/src/domain/providers/openai.ts` |
| `LLM_MAX_RETRIES` | `2` | Retry attempts for provider calls. | `services/llm-gateway/src/domain/providers/openai.ts` |
| `LLM_INITIAL_BACKOFF_MS` | `300` | Initial retry backoff. | `services/llm-gateway/src/domain/providers/openai.ts` |
| `LLM_MAX_BACKOFF_MS` | `2000` | Maximum retry backoff. | `services/llm-gateway/src/domain/providers/openai.ts` |
| `LLM_GATEWAY_LOG_EVENTS` | disabled unless set | Enables structured event logging. | `services/llm-gateway/src/telemetry/events.ts` |
| `LLM_PROVIDER_DEBUG` | disabled unless set | Emits provider debug logs. | `services/llm-gateway/src/domain/providers/openai.ts` |
| Telemetry + problem details | See common defaults. |  |  |

## Executor monolith (`src/`)

The monolith still runs in parallel with the services and proxies to them when URLs are configured.

| Variable | Default | Purpose | Source |
| --- | --- | --- | --- |
| `PORT` | `3000` | HTTP port for the legacy executor. | `src/server.ts` |
| `ORCHESTRATOR_URL`, `RUNNER_URL`, `PLANNING_URL` | unset | Enables proxying to the extracted services. | `src/server.ts` |
| `PROGRESS_SESSION_TTL_MS` | `900000` | Retention window for progress SSE payloads. | `src/server.ts` |
| `SUBTASK_TIMEOUT_MS` | `120000` | Planning timeout before aborting a subtask. | `src/server.ts` |
| `PLAN_MAX_DURATION_MS`, `PLAN_BUDGET_MS` | `600000`, `600000` | Hard limits for planning. | `src/planning/executeTaskPlan.ts` |
| `DECOMPOSE_TIMEOUT_MS`, `DECOMPOSE_MAX_ATTEMPTS`, `DECOMPOSE_BACKOFF_BASE_MS`, `DECOMPOSE_BACKOFF_MAX_MS` | `60000`, `2`, `800`, `4000` | Controls for plan decomposition retries. | `src/planning/decomposeTask.ts` |
| `AGENTS_RUNTIME` | `stepqueue` | Switches LangGraph integrations. | `src/orchestrator/adapter.ts`, `src/server.ts` |
| `AGENTS_GRAPH_SIMULATE_FAILURE` | unset | Forces orchestrator graph failures for testing. | `src/orchestrator/adapter.ts` |
| `EXECUTION_QUEUE_MODE`, `EXECUTION_QUEUE_NAME`, `EXECUTION_QUEUE_CONCURRENCY` | Mode unset → `inline`, name `executor`, concurrency `1` | Configures BullMQ queue behaviour. | `src/orchestrator/jobQueue.ts` |
| `BULLMQ_URL`, `REDIS_URL`, `REDIS_CONNECTION_URL` | unset | Redis connection strings used by BullMQ. | `src/orchestrator/jobQueue.ts` |
| `ACTION_LOG_JSONL` | disabled unless set | Enables JSONL action log dual-write. | `src/telemetry/events.ts` |
| `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` | Disabled / `http://localhost:4318/v1/traces` / `umca-executor` | Telemetry configuration. | `src/telemetry/otel.ts`, `src/telemetry/llmSpans.ts` |
| `PROBLEM_DETAILS_ENABLED` | Auto-enabled in dev/test | RFC 9457 responses. | `src/middleware/problemDetails.ts` |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`, `LLM_MAX_RETRIES`, `LLM_INITIAL_BACKOFF_MS`, `LLM_MAX_BACKOFF_MS`, `LLM_CALL_TIMEOUT_MS`, `LLM_GATEWAY_URL` | Various defaults documented in code | Governs the built-in LLM clients. | `src/llm/index.ts`, `src/llm/providers/*.ts` |
| `SANDBOX_SIGKILL_DELAY_MS`, `EXECUTOR_PHASE` | `5000`, `2A-OBSERVABILITY-FIX` | Runner sandbox behaviour + telemetry tagging. | `src/runner/runInSandbox.ts` |

## Feature flag quick look

- **LangGraph runtime** — `AGENTS_RUNTIME=langgraph` enables replay/parity/perf flows. The default remains `stepqueue` for Phase 19 stabilisation.
- **Telemetry** — Set `OTEL_ENABLED=1` in either the monolith or a service to emit spans to the OTLP endpoint listed above.
- **Problem Details** — Explicitly set `PROBLEM_DETAILS_ENABLED=1` to force RFC 9457 responses in production-like environments; leave unset for automatic behaviour.
- **Action log mirroring** — `ACTION_LOG_JSONL=1` produces a structured action log in `.automation/actions.jsonl`.

Keep this document in sync whenever new environment variables are introduced or default values change.
