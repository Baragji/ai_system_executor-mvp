## Core Capabilities (Evidence-Based)

**HTTP API**
- `POST /api/execute` generates code, runs tests, attempts multi‑turn repair, and may execute a task plan when the prompt is complex (`src/server.ts:590`). Returns meta including `testResults`, `repairHistory`, and planning fields (`src/server.ts:705`).
- `POST /api/clarify` detects missing info and returns questions (`src/server.ts:520`). Uses `detectMissing` and `generateQuestions` (`src/server.ts:544`, `src/clarification/detectMissing.ts:1`, `src/clarification/generateQuestions.ts:1`).
- `POST /api/run-tests` runs tests for an existing project via sandbox runner (`src/server.ts:779`).

**Code Generation & Validation**
- Calls LLM to produce JSON, sanitizes, validates against executor schema (`src/server.ts:182`, `src/executor/outputProcessing.ts:1`, `src/contracts/validators.ts:7`). Enforces `hasTests` when required (`src/server.ts:206`).
- Writes files to `output/<slug>` using safe path handling and recursive directory creation (`src/executor/writeFiles.ts:1`).

**Sandboxed Test Execution**
- Runs tests via sandbox with timeout, logs to `output/<project>/logs/*.log`, parses pass/fail counts (`src/runner/runInSandbox.ts:1`).
- Auto‑installs dependencies safely when needed using `npm ci --ignore-scripts` and selects an appropriate test command (`src/runner/installDeps.ts:1`, `src/runner/detectTestCommand.ts:1`, `src/runner/runInSandbox.ts:120`).

**Interactive Clarification**
- Generates targeted questions and tracks Q&A in meta (`src/server.ts:664`). Augments prompts when clarifications provided (`src/server.ts:574`).

**Multi‑Turn Repair (up to 4 attempts)**
- Analyzes failures, builds adaptive prompts with strategy guidance, applies artifacts, runs tests, records history (`src/repair/analyzeFailure.ts:1`, `src/repair/buildRepairPrompt.ts:1`, `src/repair/strategySelector.ts:1`, `src/repair/multiTurnRepair.ts:250`).
- Repair history and schema validation enforced, including optional `strategy` annotation (`contracts/repair-history.schema.json:1`, `src/contracts/repairHistoryValidator.ts:1`).

**Planning & Orchestration**
- Decomposes complex prompts into subtasks and validates decomposition quality (`src/planning/decomposeTask.ts:1`, `src/planning/validateDecomposition.ts:1`).
- Executes task plans sequentially with dependency checks, progress tracking, and a guard against long browser sessions (`src/planning/executeTaskPlan.ts:65`, `src/planning/executeTaskPlan.ts:108`). Progress snapshots and status computation implemented (`src/planning/executeTaskPlan.ts:173`).
- Planning integrated into `/api/execute`; when quality ≥ threshold, `executePlanFlow` runs and returns plan results/estimate (`src/server.ts:596`, `src/server.ts:262`).
- Subtask generation is resilient with one retry on invalid JSON/schema (`src/planning/generateSubtaskOutput.ts:17`) and is wired into plan context (`src/server.ts:200`).

**Observability & Telemetry**
- Telemetry dual‑write: JSON event log and execution trace (`src/telemetry/events.ts:1`). Traces include `task_id`, `subtask_id`, and `progress_pct` mapping (`src/telemetry/events.ts:33`).
- Evaluation results logging to `.automation/evaluation_results.json` (`src/evaluation/logResults.ts:1`).
- UI renders plan progress, estimates, and repair timeline (`public/index.html:1`, `public/script.js:1`).

**Quality Gates & Coverage**
- Lint, typecheck, test scripts configured (`package.json:1`).
- Coverage thresholds enforced via Vitest config (lines ≥80%, branches ≥75% by default) (`vitest.config.ts:3`, `vitest.config.ts:15`).

## Verified Behaviors (Concrete)
- Writes `_executor_meta.json` with test run entries, repair metrics/history, clarification metadata (`src/server.ts:664`, `src/server.ts:686`).
- Test logs captured under `output/<project>/logs/…` (`src/runner/runInSandbox.ts:38`, `src/runner/runInSandbox.ts:79`).
- Stops repair early on pass and caps at four attempts (`src/repair/multiTurnRepair.ts:250`, `src/repair/multiTurnRepair.ts:414`).
- Plan execution halts after a time budget to protect UI and returns partial/failed status with progress snapshot (`src/planning/executeTaskPlan.ts:100`, `src/planning/executeTaskPlan.ts:173`).

## Current Limits (Evidence)
- Planning path uses a time guard (default ~4 minutes); long plans may return `partial` with halted execution (`src/planning/executeTaskPlan.ts:93`).
- If LLM repair artifacts omit file contents, attempts can error; prompts now include strict inclusion guidance and summaries echo error details, but success still depends on model compliance (`src/repair/buildRepairPrompt.ts:70`, `src/repair/multiTurnRepair.ts:392`).

## How To Exercise the System
- Start server and UI (`package.json:1` scripts `build` and `start`).
- Use `/api/clarify` then `/api/execute` to run with clarifications (`src/server.ts:520`, `src/server.ts:590`).
- Manually re‑run tests for a project with `/api/run-tests` (`src/server.ts:779`).

All claims above are tied to concrete source locations shown in parentheses for verification.
