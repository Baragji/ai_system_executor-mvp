# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Executor MVP** is a local AI-powered code generation system that transforms prompts into validated, tested projects. It uses LLMs to generate code, automatically runs tests, attempts repairs, and serves the output for browsing. The system is built with TypeScript/Node.js and follows a strict Contract-Driven Integration (CDI) pattern.

**Current Phase:** Phase 19/20 - Trust Spine + LangGraph Foundation (Autonomous Transition)

## Commands

### Development & Build
```bash
npm run dev              # Development server with hot reload (tsx watch)
npm run build            # TypeScript compilation to dist/
npm start                # Run production build from dist/

npm run typecheck        # TypeScript type checking (no emit)
npm run lint             # ESLint (must exit 0, zero warnings)
npm test                 # Run all tests with Vitest
npm test -- --watch      # Test watch mode
npm run test:changed     # Run tests for changed files only
```

### Validation (Required Before Merge)
```bash
npm run validate:all     # Run lint + typecheck + test + contract:check
npm run contract:check   # Validate contract JSON schemas

# UI Tests
npm run test:ui          # Playwright visual regression tests
npm run test:ui:headed   # Playwright with visible browser
npm run test:ui:debug    # Playwright debug mode
npm run test:lighthouse  # Lighthouse performance audits
npm run validate:ui      # Complete UI validation suite
```

### Supply Chain & Evidence
```bash
npm run sbom             # Generate SPDX SBOM
npm run sbom:cyclonedx   # Generate CycloneDX SBOM
npm run sbom:all         # Generate both SBOM formats
npm run provenance       # Generate SLSA v1.0 provenance
```

### Workflow State Management (Autonomous System)
```bash
npm run state:show        # Show current workflow state (gates, tasks, suggestions)
npm run state:sync        # Sync contract task statuses based on evidence
npm run state:next:dry    # Show suggested next action without executing
npm run state:next        # Execute next action (interactive confirmation)
npm run state:next:auto   # Execute next action without confirmation (use with caution)
```

## Architecture

### Core Execution Flow

The system follows a multi-stage orchestration pattern:

1. **Clarification** (`src/clarification/`) - Detects missing requirements and generates questions
2. **Planning** (`src/planning/`) - Decomposes complex prompts into subtasks using LLM
3. **Generation** (`src/executor/`) - Generates code via LLM with schema validation
4. **Testing** (`src/runner/`) - Runs tests in isolated sandboxes
5. **Repair** (`src/repair/`) - Multi-turn LLM-based failure repair (up to 3 attempts)

### Orchestration Layer (`src/orchestrator/`)

**StepQueue** (`stepQueue.ts`): Central orchestration primitive that manages sequential/conditional execution steps. Supports both in-memory and BullMQ queue modes.

**State Machine** (`stateMachine.ts`): Tracks execution state transitions (CLARIFYING → PLANNING → GENERATING → PAUSED → DONE) with validation.

**Pause/Resume** (`interrupts.ts`, `resume.ts`): Checkpointing system that allows halting execution, asking questions, and resuming with updated context.

**Checkpoints** (`checkpointStore.ts`): Persistent workflow state storage using JSON files in `.automation/checkpoints/`.

**Abort Signals** (`abortSignal.ts`): Session-based abort controller for canceling in-flight operations.

**Adapter Pattern** (`adapter.ts`): Feature-flagged runtime switcher (`AGENTS_RUNTIME=langgraph` or `stepqueue`). LangGraph integration is stubbed for future rollout.

### LLM Integration (`src/llm/`)

- **Provider Abstraction** (`providers/choose.ts`): Unified interface for Anthropic Claude and OpenAI models
- **Tracing** (`trace.ts`): Execution context tracking with session/phase metadata
- **Telemetry** (`telemetry/llmSpans.ts`): Optional OpenTelemetry GenAI semantic conventions (when `OTEL_ENABLED=1`)

### Planning System (`src/planning/`)

**Task Decomposition**: For complex prompts, the system:
1. Calls `decomposeTask()` to generate a `TaskPlan` with 2-10 subtasks
2. Validates decomposition quality (score must be ≥70 to proceed)
3. Executes subtasks sequentially via `executeTaskPlan()`
4. Each subtask gets its own generation → test → repair cycle
5. Tracks dependencies and progress across subtasks

**Key Files:**
- `decomposeTask.ts` - LLM-based task planning with retry
- `executeTaskPlan.ts` - Sequential subtask execution engine
- `validateDecomposition.ts` - Quality scoring for generated plans
- `progressTracker.ts` - Real-time progress snapshots

### Repair System (`src/repair/`)

**Multi-Turn Repair**: Automatic test failure fixing with:
- Failure analysis categorization (syntax, type, runtime, test)
- Strategy selection (targeted fix, rollback, full regeneration)
- Diff generation for minimal changes
- Maximum 3 repair attempts with backoff
- Repair history tracking for observability

**Key Files:**
- `multiTurnRepair.ts` - Main repair orchestration
- `analyzeFailure.ts` - Failure categorization
- `strategySelector.ts` - Repair approach selection
- `buildRepairPrompt.ts` - Context assembly for LLM

### Contracts & Validation (`src/contracts/`)

All system outputs use JSON Schema validation:
- `contracts/schemas/*.schema.json` - Schema definitions
- Validation enforced via Ajv with strict mode
- Contract evolution tracked in `contracts/Roadmap_execution/`

### Test Execution (`src/runner/`)

**Sandbox Strategy**:
- Projects written to `output/<project>/`
- Dependency installation via npm/pnpm detection
- Test command auto-detection (Vitest, Jest, npm test)
- Timeout enforcement (default 120s for tests)
- Output capture to `.automation/test_logs/`

### Telemetry & Observability (`src/telemetry/`)

**Event Logging** (`events.ts`):
- JSONL dual-write to `.automation/actions.jsonl` (when `ACTION_LOG_JSONL=1`)
- Structured events: generation_start, test_run, repair_attempt, etc.

**OpenTelemetry** (`otel.ts`):
- Opt-in via `OTEL_ENABLED=1`
- GenAI semantic conventions for LLM calls
- Trace exports to configurable OTLP endpoint

**RFC 9457 Problem Details** (`middleware/problemDetails.ts`):
- Standardized HTTP error responses
- Machine-readable error types (e.g., `BadRequest`, `NotFound`)

## Stack Constraints (CRITICAL)

This project enforces strict stack rules via `ai-stack.json`:

### Allowed
- **Languages**: TypeScript/JavaScript ONLY
- **Backend**: Node.js 20+ with Express
- **Frontend**: Vanilla JS/CSS under `/public` (no frameworks)
- **Testing**: Vitest (80% line, 75% branch coverage required)

### Forbidden
- ❌ Python code anywhere
- ❌ Frontend frameworks (React, Vue, Angular, etc.) in `/public`
- ❌ New dependencies without explicit justification
- ❌ Breaking API changes

### Protected Files (CODEOWNERS Approval Required)
- `ai-stack.json`
- `.github/copilot-instructions.md`
- `.github/workflows/*`
- `contracts/schemas/*`
- `.github/CODEOWNERS`

## Discovery-First Protocol

**Before making ANY code changes, you MUST:**

1. **Identify Integration Points**
   - Find exact file + line + function where code will be modified
   - Document current implementation with code snippets (±10 lines)
   - List all dependencies and impacts
   - Verify stack compliance against `ai-stack.json`

2. **Create Discovery Note**
   - Output: `.automation/phase*_discovery.json` and `.md`
   - Must include: integration points, snippets, justification, compliance check
   - Review before proceeding

3. **No Assumptions**
   - Never assume file structure or function names
   - Always grep/search to find actual locations
   - Document what you found, not what you expected

## Evidence Requirements

Every PR must include:

1. **Test Evidence**: All tests passing (exit 0), coverage thresholds met
2. **Contract Validation**: `npm run contract:check` passes
3. **SBOM Artifact**: Generated via `npm run sbom:all`
4. **Stack Compliance**: No forbidden file extensions, no new frameworks
5. **Discovery Note**: For non-trivial changes (integration points documented)

## Key Patterns

### Feature Flags

The codebase uses environment-based feature flags:

```bash
# Runtime Selection
AGENTS_RUNTIME=stepqueue     # Default: StepQueue orchestration
AGENTS_RUNTIME=langgraph     # Beta: LangGraph-based orchestration

# Telemetry
OTEL_ENABLED=1               # Enable OpenTelemetry tracing
ACTION_LOG_JSONL=1           # Enable JSONL action logs

# Error Handling
PROBLEM_DETAILS_ENABLED=1    # RFC 9457 error responses (default in dev/test)
```

### Execution Modes

1. **Single Execution**: Simple prompts → direct generation → test → repair
2. **Plan Execution**: Complex prompts → decompose → per-subtask (generate → test → repair) → aggregate results

Selection is automatic via `isComplexPrompt()` heuristics (length, bullet points, keywords).

### Session Management

- Sessions identified by UUID (`sessionId`)
- Progress tracked in-memory (SSE streams or polling)
- Checkpoint persistence in `.automation/checkpoints/step-workflows/`
- Pause/resume via `/api/sessions/:id/pause` and `/api/sessions/:id/resume`

### Fixture System (`src/fixtures/`)

Captures execution artifacts for replay/debugging:
- `.automation/fixtures/<project>/<sessionId>/`
- Stored: clarify.json, plan.json, subtasks/*/output.json, tests/initial.json, repair/history.json

## Common Gotchas

1. **Checkpoint Races**: Tests may hit ENOTEMPTY errors when cleaning `.automation/checkpoints/` concurrently. Safe to treat as success in test environment (see `server.ts` workaround).

2. **Provider Config**: System gracefully degrades if no LLM provider configured (skips automatic resume). Check `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.

3. **Timeout Tuning**: Subtask timeout defaults to 120s (`SUBTASK_TIMEOUT_MS`). Increase for slow generators.

4. **Queue Modes**: BullMQ requires Redis. Falls back to in-memory if Redis unavailable.

5. **Pause Timing**: Abort signals must be checked at safe points (pre-LLM, post-LLM, per-subtask). `throwIfAborted()` raises `PausedError`.

## File Organization

- `src/server.ts` - Express app with all REST endpoints
- `src/orchestrator/` - Execution primitives (state, checkpoints, queues)
- `src/planning/` - Task decomposition and subtask execution
- `src/executor/` - Code generation (systemPrompt.md + schema validation)
- `src/repair/` - Multi-turn test repair
- `src/runner/` - Sandboxed test execution
- `src/clarification/` - Missing requirement detection
- `src/contracts/` - Schema validators
- `src/telemetry/` - Events, OTel, action logs
- `src/middleware/` - Express middleware (problem details)
- `src/llm/` - Provider abstraction and tracing
- `src/fixtures/` - Execution artifact capture
- `src/workspace/` - Manifest generation for resume context
- `public/` - Vanilla JS/CSS frontend (no frameworks)
- `contracts/` - JSON Schema definitions + phase contracts
- `.automation/` - Checkpoints, traces, evidence, discovery notes
- `output/` - Generated projects

## API Endpoints

### Core
- `POST /api/execute` - Main execution endpoint (SSE or JSON)
- `GET /api/executions/:id` - LangGraph execution status
- `POST /api/clarify` - Get clarification questions for prompt
- `POST /api/run-tests` - Manual test run for existing project

### Progress
- `GET /api/progress/:sessionId` - SSE progress stream
- `GET /api/progress/snapshot/:sessionId` - JSON progress snapshot

### Pause/Resume
- `POST /api/sessions/:id/pause` - Pause execution with questions
- `POST /api/sessions/:id/resume` - Resume with answers

### Replay (Debugging)
- `POST /api/replay/repair` - Re-run repair with captured context
- `POST /api/replay/subtask` - Replay specific subtask
- `GET /api/fixtures/:project` - List available fixtures

### Output
- `GET /output/:project/*` - Directory listing with archive downloads
- `GET /output-archive/:project/:tail?format=zip|tar` - Download archives
- `GET /api/files/:project/:path` - Raw file content

## References

- **CDI Pattern**: `CDI_INFRASTRUCTURE.md` - Contract-Driven Integration overview
- **File Map**: `FILE_INDEX.md` - Quick navigation guide
- **Contracts**: `contracts/Roadmap_execution/` - Phase execution contracts
- **AI Instructions**: `.github/copilot-instructions.md` - Full AI agent rules
- **Stack Lock**: `ai-stack.json` - Technology constraints
- **Roadmap**: `docs/Planning_roadmap_signature/02_trust_engine_roadmap.md` - Trust Engine phases A-E
- **Detector Behavior**: `docs/detector_behavior_changes.md` - Evidence detection changes & migration guide

## Error Handling Protocol

If any validation step fails:

1. **HALT immediately** - do not proceed
2. **Document the failure** in trace file
3. **Report to human** with diagnostic info
4. **Wait for guidance** - no assumptions

## Philosophy

**Quality over speed. Ship perfect or never.**

- Every change must pass all validation gates
- Evidence-first: claims backed by artifacts
- Discovery before implementation
- No stack drift tolerated
- Human approval for protected files
