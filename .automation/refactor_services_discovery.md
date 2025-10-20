# Batch 0 — Discovery Artifacts

Discovery type: microservices_refactoring
Date: 2025-10-20

Scope: Scan all services for deep imports and monolith coupling; capture environment variables, external dependencies, impacted routes, and risk assessment. Confirm stack compliance.

## Summary

- Deep imports detected in: clarification, executor, planning, repair, runner
- No deep imports detected in: llm-gateway, orchestrator
- Service‑specific env vars: llm-gateway (OPENAI_API_KEY, LLM_*), planning (SUBTASK_TIMEOUT_MS, CAPTURE_FIXTURES_IN_TESTS)
- External deps (notable): llm-gateway uses `openai`; runner uses `slugify`
- Stack compliance: TypeScript only; no Python; no frontend frameworks under `/public`

## Grep Evidence

Commands used:

```bash
rg -n '\.\./\.\./\.\./\.\./src/' services | sort
rg -n "from 'src/|from \"src/" services | sort
```

Key matches (deep imports):

```text
services/clarification/src/routes/clarify.ts:5:import { detectMissing } from "../../../../src/clarification/detectMissing.js";
services/clarification/src/routes/clarify.ts:6:import { generateQuestions } from "../../../../src/clarification/generateQuestions.js";
services/clarification/src/routes/clarify.ts:7:import type { ClarificationQuestion } from "../../../../src/clarification/types.js";
services/clarification/src/routes/clarify.ts:8:import { validateClarificationRequest } from "../../../../src/contracts/validators.js";

services/executor/src/routes/generate.ts:5:import { sanitizeExecutorOutput } from "../../../../src/executor/outputProcessing.js";
services/executor/src/routes/generate.ts:6:import { validateExecutorOutput } from "../../../../src/executor/schema.js";
services/executor/src/routes/generate.ts:7:import { writeFiles } from "../../../../src/executor/writeFiles.js";
services/executor/src/routes/generate.ts:8:import type { ExecutorOutput } from "../../../../src/executor/types.js";
services/executor/src/routes/validate.ts:5:import { validateFilesNonEmpty } from "../../../../src/utils/validateFiles.js";

services/planning/src/domain/context.ts:3:import { withTraceContext } from "../../../../src/llm/trace.js";
services/planning/src/domain/context.ts:4:import { generateSubtaskOutputWithRetry } from "../../../../src/planning/generateSubtaskOutput.js";
services/planning/src/domain/context.ts:5:import { writeFiles } from "../../../../src/executor/writeFiles.js";
services/planning/src/domain/context.ts:6:import { ensureDefaultExportForApp } from "../../../../src/utils/normalizeExports.js";
services/planning/src/domain/context.ts:7:import { ensureJsonHealthOnDisk } from "../../../../src/utils/normalizeHealth.js";
services/planning/src/domain/context.ts:8:import { runInSandbox } from "../../../../src/runner/runInSandbox.js";
services/planning/src/domain/context.ts:9:import { multiTurnRepair } from "../../../../src/repair/multiTurnRepair.js";
services/planning/src/domain/context.ts:10:import { logEvent } from "../../../../src/telemetry/events.js";
services/planning/src/domain/context.ts:11:import { writeFixture } from "../../../../src/fixtures/index.js";
services/planning/src/domain/context.ts:14:} from "../../../../src/orchestrator/abortSignal.js";
services/planning/src/domain/context.ts:15:import type { ClarificationResponse } from "../../../../src/clarification/types.js";
services/planning/src/domain/context.ts:16:import type { PlanExecutionContext, SubtaskPromptRequest } from "../../../../src/planning/types.js";
services/planning/src/domain/planning.ts:5:} from "../../../../src/planning/decomposeTask.js";
services/planning/src/domain/planning.ts:7:export { executeTaskPlan } from "../../../../src/planning/executeTaskPlan.js";
services/planning/src/domain/planning.ts:8:export { estimateCompletion } from "../../../../src/planning/estimateCompletion.js";
services/planning/src/domain/planning.ts:10:export { TaskPlanValidationError } from "../../../../src/planning/types.js";
services/planning/src/domain/planning.ts:19:} from "../../../../src/planning/types.js";
services/planning/src/domain/planning.ts:21:export type { ClarificationResponse } from "../../../../src/clarification/types.js";

services/repair/src/routes/analyze.ts:3:import { analyzeFailure } from "../../../../src/repair/analyzeFailure.js";
services/repair/src/routes/analyze.ts:5:import type { FailureAnalysis } from "../../../../src/contracts/repairHistoryValidator.js";
services/repair/src/routes/repair.ts:3:import { multiTurnRepair, type MultiTurnContext } from "../../../../src/repair/multiTurnRepair.js";
services/repair/src/routes/repair.ts:4:import { repairOnce, type RepairOnceArgs, type RepairOutcome } from "../../../../src/repair/repairOnce.js";
services/repair/src/routes/repair.ts:5:import type { RunResult } from "../../../../src/contracts/validators.js";
services/repair/src/routes/repair.ts:6:import type { RepairHistory } from "../../../../src/contracts/repairHistoryValidator.js";
services/repair/src/routes/repair.ts:7:import type { ExecutorFile } from "../../../../src/executor/types.js";

services/runner/src/domain/runner.ts:1:export { runInSandbox } from "../../../../src/runner/runInSandbox.js";
services/runner/src/domain/runner.ts:2:export type { RunInSandboxOptions } from "../../../../src/runner/runInSandbox.js";
services/runner/src/domain/runner.ts:4:export { ensureDependencies } from "../../../../src/runner/installDeps.js";
services/runner/src/domain/runner.ts:5:export type { EnsureDependenciesResult } from "../../../../src/runner/installDeps.js";
services/runner/src/domain/runner.ts:7:export { logEvent } from "../../../../src/telemetry/events.js";
```

Absolute monolith imports from `src/`: none detected in `services/`.

## Service Findings

### clarification
- Deep imports: 4 (clarification domain + contracts)
- Routes: POST `/clarify`, GET `/healthz`
- Env vars: NODE_ENV, PORT, SERVICE_NAME, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, PROBLEM_DETAILS_ENABLED
- External deps: express, dotenv, OpenTelemetry packages
- Risk: MEDIUM (moderate coupling to monolith contracts and domain)

### executor
- Deep imports: 5 (executor domain + utils)
- Routes: POST `/generate`, POST `/validate`, GET `/healthz`
- Env vars: NODE_ENV, PORT, SERVICE_NAME, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, PROBLEM_DETAILS_ENABLED
- External deps: express, dotenv, OpenTelemetry packages
- Risk: MEDIUM (write path + validations depend on monolith)

### llm-gateway
- Deep imports: none
- Routes: POST `/complete`, POST `/stream`, GET `/healthz`
- Env vars: NODE_ENV, PORT, SERVICE_NAME, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, PROBLEM_DETAILS_ENABLED, OPENAI_API_KEY, LLM_MODEL, LLM_MAX_RETRIES, LLM_INITIAL_BACKOFF_MS, LLM_MAX_BACKOFF_MS, LLM_PROVIDER_DEBUG, LLM_GATEWAY_PROVIDER, LLM_GATEWAY_LOG_EVENTS
- External deps: express, dotenv, OpenTelemetry packages, openai
- Risk: MEDIUM (external API surface and provider variability)

### orchestrator
- Deep imports: none
- Routes: POST `/execute`, GET `/executions/:id`, GET `/healthz`
- Env vars: NODE_ENV, PORT, SERVICE_NAME, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, PROBLEM_DETAILS_ENABLED
- External deps: express, dotenv, OpenTelemetry packages
- Risk: LOW (minimal coupling identified)

### planning
- Deep imports: 18 (llm, planning, executor, utils, runner, repair, telemetry, fixtures, orchestrator, clarification)
- Routes: POST `/decompose`, POST `/execute-plan`, GET `/healthz`
- Env vars: NODE_ENV, PORT, SERVICE_NAME, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, PROBLEM_DETAILS_ENABLED, SUBTASK_TIMEOUT_MS, CAPTURE_FIXTURES_IN_TESTS
- External deps: express, dotenv, OpenTelemetry packages
- Risk: HIGH (broad, deep coupling across monolith subsystems)

### repair
- Deep imports: 7 (repair domain, contracts, executor types)
- Routes: POST `/repair`, POST `/analyze`, GET `/healthz`
- Env vars: NODE_ENV, PORT, SERVICE_NAME, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, PROBLEM_DETAILS_ENABLED
- External deps: express, dotenv, OpenTelemetry packages
- Risk: MEDIUM (coupled to repair domain and contracts)

### runner
- Deep imports: 5 (runner domain + telemetry)
- Routes: POST `/run`, POST `/test`, POST `/install`, GET `/healthz`
- Env vars: NODE_ENV, PORT, SERVICE_NAME, OTEL_ENABLED, OTEL_EXPORTER_OTLP_ENDPOINT, PROBLEM_DETAILS_ENABLED
- External deps: express, dotenv, OpenTelemetry packages, slugify
- Risk: MEDIUM (exec environment and install path coupled to monolith)

## Stack Compliance

- TypeScript/JavaScript only: true
- No Python: true (no `.py` files found)
- Frontend changes only under `/public`: true (no frameworks detected under `/public`)

Repro commands:

```bash
rg -n "\.py$" -g '!node_modules'
rg -n "react|vue|angular" public -g '!**/*.map'
```

## Next Steps (Per Priority 1)

1) Produce 30–45 minute batch plan (~51 items)
2) Prepare AGENTS.md refactoring guidance via PR (protected file)
3) Publish refactor dependency matrix

