---
description: Repository Information Overview
alwaysApply: true
---

# Repository Context: AI System Executor MVP

**Generated:** 2025-01-09  
**Last Updated:** 2023-11-14  
**Repository:** ai_system_executor-mvp  
**Owner:** @yousefbaragji

---

## Project Overview

**UMCA Executor MVP** is an autonomous AI coding agent that converts natural language prompts into fully tested, deployable code projects. It implements a **Contract-Driven Integration (CDI)** pattern for AI-powered development with built-in verification, self-repair, and quality gates.

### Core Value Proposition
- **Input:** Natural language description of a coding task
- **Output:** Complete, tested project with metadata and confidence scoring
- **Unique Features:** 
  - Multi-turn repair loop (up to 4 attempts)
  - Interactive clarification system
  - Task decomposition for complex requests
  - Sandboxed test execution
  - Comprehensive telemetry and observability

### Current Status
- **Phase:** A (UI Baseline Fixes)
- **Completed Phases:** 0-4 (Remediation, Clarification, Multi-turn Repair, Task Planning)
- **Next Phase:** B (Trust Engine Foundation)
- **Test Status:** ✅ 219 tests passing, 89.11% line coverage, 82.60% branch coverage
- **Build Status:** ✅ All validation gates passing

---

## Technology Stack

### Core Stack (Strictly Enforced)
- **Language:** TypeScript/JavaScript ONLY
- **Runtime:** Node.js 20.x (locked via .nvmrc)
- **Backend:** Express 4.x
- **Frontend:** Vanilla JS/CSS (NO frameworks allowed)
- **Testing:** Vitest with coverage thresholds
- **Linting:** ESLint (zero warnings policy)
- **Type Checking:** TypeScript strict mode

### LLM Integration
- **Providers:** OpenAI (gpt-4o-mini) or Anthropic Claude
- **Provider Selection:** Via `LLM_PROVIDER` env var
- **Implementation:** `src/llm/providers/` with abstraction layer

### Testing & Quality Tools
- **Unit/Integration:** Vitest (src/, tests/)
- **UI Testing:** Playwright (tests/ui/)
- **Performance:** Lighthouse CI
- **Accessibility:** axe-core
- **Coverage:** V8 provider via Vitest
- **Security:** npm audit, planned scanner integration

### Forbidden Technologies
- ❌ **Python** (anywhere in project)
- ❌ **Frontend frameworks** (React, Vue, Angular in /public)
- ❌ **New dependencies** without explicit justification
- ❌ **Breaking API changes** without contract updates

**Enforcement:** `ai-stack.json` + CI validation + CODEOWNERS

---

## Architecture Overview

### High-Level Flow
```
User Prompt → Clarification (optional) → Planning (if complex) 
→ Generation → Validation → Testing → Repair (if needed) → Output
```

### Core Modules

#### 1. **Executor** (`src/executor/`)
- **Purpose:** LLM interaction and code generation
- **Key Files:**
  - `schema.ts` - Output validation against JSON schema
  - `systemPrompt.md` - Instructions for code generation
  - `outputProcessing.ts` - Sanitization and normalization
  - `writeFiles.ts` - Safe file writing with path validation
  - `types.ts` - Core type definitions

#### 2. **Clarification** (`src/clarification/`)
- **Purpose:** Interactive Q&A for ambiguous prompts
- **Key Functions:**
  - `detectMissing()` - Identify gaps (framework, port, auth, etc.)
  - `generateQuestions()` - Create typed questions with defaults
  - `augmentPrompt()` - Enhance original prompt with answers
  - `suggestDefaults()` - Smart default value suggestions
- **Endpoints:** `POST /api/clarify`

#### 3. **Planning** (`src/planning/`)
- **Purpose:** Decompose complex tasks into subtasks
- **Key Functions:**
  - `decomposeTask()` - Break down prompts into subtasks
  - `validateDecomposition()` - Quality scoring (0-100)
  - `executeTaskPlan()` - Sequential execution with progress tracking
  - `executeSubtask()` - Individual subtask execution
  - `estimateCompletion()` - Time estimation based on progress
  - `generateSubtaskOutput()` - LLM generation with retry logic
- **Threshold:** Planning triggered if quality score ≥ 70

#### 4. **Repair** (`src/repair/`)
- **Purpose:** Multi-turn test failure repair (max 4 attempts)
- **Key Functions:**
  - `multiTurnRepair()` - Main repair loop
  - `analyzeFailure()` - Categorize failures (syntax, assertion, timeout, etc.)
  - `buildRepairPrompt()` - Context-aware repair instructions
  - `generateDiff()` - File change tracking
  - `strategySelector()` - Adaptive repair strategy selection
- **Strategy Types:** incremental, rewrite, focused, conservative

#### 5. **Runner** (`src/runner/`)
- **Purpose:** Sandboxed test execution
- **Key Functions:**
  - `runInSandbox()` - Execute tests with timeout and log capture
  - `installDeps()` - Safe dependency installation (`npm ci --ignore-scripts`)
  - `detectTestCommand()` - Auto-detect test framework and command
- **Safety:** Process isolation, timeout enforcement, log redaction

#### 6. **Telemetry** (`src/telemetry/`)
- **Purpose:** Observability and event tracking
- **Dual-Write System:**
  - `.telemetry/events.log` - Structured JSON events
  - `.automation/execution_trace.jsonl` - JSONL trace with task/subtask IDs
- **Events:** generation_start, plan_progress, plan_snapshot, repair events

#### 7. **Contracts** (`src/contracts/`)
- **Purpose:** Schema validation and type safety
- **Validators:**
  - `validators.ts` - Core schemas (ExecutorOutput, RunResult, Clarification)
  - `taskPlanValidator.ts` - Task plan structure validation
  - `repairHistoryValidator.ts` - Repair attempt tracking
  - `executionTraceValidator.ts` - Telemetry trace validation

#### 8. **Validation** (`src/validation/`)
- **Purpose:** Scaffold and file validation
- **Key Functions:**
  - `validateScaffold.ts` - Project structure validation
  - File existence and non-empty checks

#### 9. **Utils** (`src/utils/`)
- **Purpose:** Shared utilities
- **Key Functions:**
  - `checksum.ts` - SHA-256 file hashing
  - `normalizeExports.ts` - Ensure default exports for apps
  - `seedTests.ts` - Generate placeholder tests
  - `validateFiles.ts` - File validation helpers

### Server Entry Point (`src/server.ts`)
**Main API Endpoints:**
- `GET /healthz` - Health check
- `POST /api/execute` - Main execution (generation + testing + repair + planning)
- `POST /api/clarify` - Get clarification questions
- `POST /api/run-tests` - Re-run tests for existing project
- `GET /api/progress/:sessionId` - Poll progress (planned for Phase C)
- Static serving: `/` (UI), `/output` (generated projects)

**Execution Modes:**
1. **Simple Path:** Generate → Test → Repair (if needed)
2. **Planning Path:** Decompose → Execute subtasks → Test each → Repair (if needed)

**Planning Trigger:** Prompt complexity heuristics + clarifications presence

---

## Contract-Driven Development (CDI)

### Philosophy
**"Discover → Validate → Implement → Prove"**

Every phase follows a strict contract with:
- **Acceptance Criteria** - Boolean gates that must pass
- **Deliverables** - Files with path/regex validation
- **Test Requirements** - Exit code, coverage, lint, typecheck
- **Success Metrics** - Quantifiable quality bars
- **Evidence** - Artifacts proving completion

### Contract Structure
```json
{
  "contract_version": "X.Y.Z",
  "project": { "name", "current_phase", "goal", "scope" },
  "execution_model": { "type", "verification_strategy" },
  "stack_compliance": { "language", "frameworks", "constraints" },
  "tasks": [
    {
      "id": "...",
      "stage": "...",
      "title": "...",
      "actions": [...],
      "validation": [...],
      "success_criteria": [...],
      "evaluation": {...}
    }
  ],
  "global_quality_standards": { "lint", "typecheck", "tests", "coverage" }
}
```

### Discovery-First Protocol
**Before ANY code changes:**
1. **Discover Integration Points** - Find exact file + line + function
2. **Document Current State** - Code snippets with ±10 lines context
3. **Verify Stack Compliance** - Check against `ai-stack.json`
4. **Generate Discovery Note** - `.automation/phase*_discovery.json` + `.md`

**Output:** Evidence-backed integration plan before first line of code

### Evidence Requirements
Every deliverable must include:
- ✅ Test run summary (exit 0)
- ✅ Contract schema validation passes
- ✅ SBOM artifact (SPDX format)
- ✅ Discovery note with integration points
- ✅ Stack compliance verification

---

## Current Phase: Phase A (UI Baseline Fixes)

### Objective
Fix critical UI perception issues - no more raw JSON dumps, frozen screens, or cryptic errors.

### Wins
- **WA1:** Success Card (replace JSON with formatted metrics/files/actions)
- **WA2:** Loading States (phase-aware spinner, not static "Planning...")
- **WA3:** Error Formatting (user-friendly messages with actionable guidance)

### Contract
`contracts/Roadmap_execution/11_phaseA_contract_enhanced.json`

### Status
- **Discovery Phase:** Required first (1 hour)
- **Implementation:** 3 hours estimated
- **Total:** ~4 hours
- **Scope:** Frontend only (public/script.js, public/styles.css, public/index.html)

---

## Roadmap: Past, Present, Future

### Completed Phases (0-4)
| Phase | Name | Key Deliverables | Status |
|-------|------|------------------|--------|
| 0 | Remediation | Schema validation, test execution, repair module | ✅ Complete |
| 2A | Clarification Core | `detectMissing`, `generateQuestions`, API endpoint | ✅ Complete |
| 2B | Clarification Integration | `augmentPrompt`, UI form, end-to-end flow | ✅ Complete |
| 2C | Clarification Telemetry | Smart defaults, telemetry schema, metrics | ✅ Complete |
| 3A | Multi-turn Foundations | Failure analysis, diff generation, repair prompts | ✅ Complete |
| 3B | Multi-turn Execution | Multi-turn loop, UI repair history, metrics | ✅ Complete |
| 4A | Planning Foundation | Task decomposition, validation, dependency analysis | ✅ Complete |
| 4B | Sequential Execution | Subtask executor, orchestrator, time estimation, UI progress | ✅ Complete |
| 4B1 | Adaptive Repair | Strategy selector, adaptive prompts | ✅ Complete |
| 4B2 | Sandbox Install | Safe dependency installation, test command detection | ✅ Complete |
| 4B3 | Subtask Resilience | Retry wrapper with context preservation | ✅ Complete |
| 4B4 | Planning Telemetry | Execution trace schema, field mapping | ✅ Complete |

**Evidence:** All modules exist, tests pass, integration verified in validation report.

### Current Phase: A (UI Baseline)
- **Timeline:** ~4 hours
- **Focus:** Frontend polish (success cards, loading states, error messages)
- **Scope:** `/public` directory only, no backend changes

### Next Phase: B (Trust Engine Foundation)
- **Timeline:** ~8 hours
- **Focus:** Verification spine - auto-tests, security scan, dependency validation, confidence scores
- **Key Deliverables:**
  - Trust score contract/schema
  - Test coverage analyzer
  - Security scanner integration
  - Dependency validator
  - Trust score calculator
  - UI trust score display

### Future Phases
- **Phase C:** Real-Time Progress (SSE, monitoring)
- **Phase D:** Save Guard Revival (pre-save validation)
- **Phase E:** Encyclopedia Integration (pattern enforcement)
- **Phase F:** Advanced Trust (property-based testing, formal verification)

---

## Directory Structure

```
ai_system_executor-mvp/
├── .automation/               # Evidence, telemetry, compliance reports
│   ├── execution_trace.jsonl
│   ├── evaluation_results.json
│   ├── contract_compliance_report.json
│   ├── validation_report_*.md
│   └── phase*_discovery.{json,md}
│
├── .github/
│   ├── CODEOWNERS            # Protected files requiring approval
│   ├── copilot-instructions.md  # AI agent instructions
│   ├── pull_request_template.md
│   └── workflows/
│       ├── ci.yml            # Lint, typecheck, test, build
│       ├── cdi-validation.yml  # Contract/SBOM/stack checks
│       └── ui-validation.yml  # Playwright + Lighthouse
│
├── contracts/
│   ├── Roadmap_execution/    # Phase contracts (01-12)
│   │   ├── 11_phaseA_contract_enhanced.json  # ← CURRENT
│   │   └── 12B_trust_engine_contract.json    # ← NEXT
│   ├── schemas/
│   │   └── roadmap_phase.schema.json  # Contract validator
│   ├── executor-output.schema.json
│   ├── clarification-*.schema.json
│   ├── task-plan.schema.json
│   ├── repair-history.schema.json
│   └── run-result.schema.json
│
├── docs/
│   └── Planning_roadmap_signature/
│       ├── 01_signature_moments_research_output.md
│       ├── 02_trust_engine_roadmap.md
│       └── 04_ai_integration_pattern.md  # CDI pattern research
│
├── output/                   # Generated projects
│   └── <project-slug>/
│       ├── _executor_meta.json  # Test runs, repair history, checksums
│       ├── _task_plan.json      # Decomposition (if used)
│       └── logs/                # Test execution logs
│
├── public/                   # Frontend (VANILLA JS/CSS ONLY)
│   ├── index.html            # Main UI
│   ├── script.js             # Client logic
│   ├── styles.css            # Styling
│   └── icons.js              # SVG icons
│
├── scripts/
│   ├── validate-contract.js  # Contract schema validation
│   ├── run-lhci.mjs          # Lighthouse CI
│   └── generate-ui-compliance.mjs
│
├── src/                      # Backend (TypeScript)
│   ├── server.ts             # Express app + API routes
│   ├── clarification/        # Interactive Q&A
│   ├── contracts/            # Schema validators
│   ├── evaluation/           # Results logging
│   ├── executor/             # LLM generation
│   ├── llm/                  # Provider abstraction
│   ├── planning/             # Task decomposition
│   ├── repair/               # Multi-turn repair
│   ├── runner/               # Sandboxed testing
│   ├── telemetry/            # Event tracking
│   ├── utils/                # Shared utilities
│   └── validation/           # Scaffold validation
│
├── tests/                    # Vitest tests
│   ├── api/                  # API endpoint tests
│   ├── clarification/        # Clarification module tests
│   ├── contracts/            # Schema validation tests
│   ├── e2e/                  # End-to-end tests
│   ├── executor/             # Generation tests
│   ├── planning/             # Planning module tests
│   ├── repair/               # Repair logic tests
│   ├── runner/               # Sandbox runner tests
│   └── ui/                   # Playwright UI tests
│
├── .env.example              # Environment template
├── .nvmrc                    # Node version (20)
├── ai-stack.json             # ⚠️ PROTECTED - Stack compliance lock
├── CDI_INFRASTRUCTURE.md     # CDI overview
├── FILE_INDEX.md             # Quick navigation
├── package.json              # Dependencies + scripts
├── playwright.config.ts      # UI test config
├── tsconfig.json             # TypeScript config
└── vitest.config.ts          # Test + coverage config
```

---

## Key Files and Their Purposes

### Configuration Files (Protected by CODEOWNERS)
| File | Purpose | Modification Risk |
|------|---------|-------------------|
| `ai-stack.json` | Stack compliance lock | ⚠️ Could allow Python or forbidden frameworks |
| `.nvmrc` | Node version lock | ⚠️ Version drift could break dependencies |
| `package.json` | Dependencies + scripts | ⚠️ Supply chain security, SBOM regeneration needed |
| `tsconfig.json` | TypeScript compiler | ⚠️ Could weaken type safety |
| `eslint.config.js` | Linting rules | ⚠️ Could allow code quality degradation |
| `vitest.config.ts` | Test + coverage | ⚠️ Could lower coverage thresholds |
| `.github/CODEOWNERS` | Protection list | ⚠️ Self-modification risk |
| `.github/workflows/*` | CI/CD pipelines | ⚠️ Could bypass validation gates |
| `contracts/schemas/*` | Contract validators | ⚠️ Could allow malformed contracts |

### Critical Source Files
| File | Lines | Purpose | Key Exports |
|------|-------|---------|-------------|
| `src/server.ts` | 933 | Main API server | Express app, /api/execute, /api/clarify, /api/run-tests |
| `src/planning/decomposeTask.ts` | 200 | Task planning | `decomposeTask()` |
| `src/repair/multiTurnRepair.ts` | 450+ | Repair loop | `multiTurnRepair()` |
| `src/runner/runInSandbox.ts` | 300+ | Test execution | `runInSandbox()` |
| `src/clarification/detectMissing.ts` | 149 | Gap detection | `detectMissing()` |
| `src/executor/schema.ts` | - | Output validation | `validateExecutorOutput()` |
| `public/script.js` | 800+ | Frontend logic | Event handlers, rendering |

---

## Commands and Workflows

### Development
```bash
# Setup
cp .env.example .env          # Configure LLM provider
npm install                   # Install dependencies
nvm use 20                    # Ensure Node 20

# Development
npm run dev                   # Start dev server with watch
npm run build                 # TypeScript compilation
npm start                     # Run built server

# Testing
npm test                      # Unit + integration tests with coverage
npm run test:watch            # Test watch mode
npm run test:ui               # Playwright UI tests
npm run test:lighthouse       # Performance audits
npm run validate:ui           # Full UI validation

# Quality Checks
npm run lint                  # ESLint (must exit 0, no warnings)
npm run typecheck             # TypeScript type checking
npm run contract:check        # Validate contracts against schema
npm run sbom                  # Generate SBOM artifact
npm run validate:all          # Run all validation (lint + typecheck + test + contract)

# Utilities
npm run clean-output          # Clear output directory
```

### CI/CD Pipeline
**Triggered on:** Push, PR, workflow_dispatch

**Jobs:**
1. **ci.yml** - Lint, typecheck, test, build
2. **cdi-validation.yml** - Contract validation, SBOM generation, stack compliance
3. **ui-validation.yml** - Playwright tests, Lighthouse audits

**Required to Pass:**
- Exit code 0 for: lint, typecheck, test, build
- Coverage: ≥80% lines, ≥75% branches
- Contract schema validation
- Stack compliance (no .py files, /public structure valid)

---

## Development Guidelines

### Code Style
- **TypeScript:** Strict mode, no implicit any, no unchecked indexed access
- **ESLint:** Zero warnings policy (CI blocks on warnings)
- **Naming:** camelCase functions, PascalCase types/interfaces
- **Exports:** Prefer named exports, use default only when required
- **Error Handling:** Always wrap async operations in try/catch

### Testing Standards
- **Coverage Required:** 80% lines, 75% branches
- **Test Locations:** 
  - `tests/` for backend unit/integration
  - `tests/ui/` for Playwright UI tests
- **Naming:** `*.test.ts` for Vitest, `*.spec.ts` for Playwright
- **Assertions:** Use Vitest `expect()` or Playwright `expect(page)`
- **Mocking:** Prefer real implementations, mock only external APIs

### Frontend Constraints
- **Location:** All frontend code under `/public` directory
- **Frameworks:** NONE - vanilla JS/CSS only
- **Browser Support:** Modern browsers (ES2022+)
- **Styling:** Plain CSS, no preprocessors
- **Icons:** SVG embedded via `icons.js`

### Backend Patterns
- **Express Routes:** Centralized in `src/server.ts`
- **Error Responses:** JSON with `{ ok: false, error: "message" }`
- **Success Responses:** JSON with `{ ok: true, ...data }`
- **Logging:** Use telemetry system (`logEvent()`)
- **File I/O:** Always use absolute paths, handle ENOENT

### Contract Updates
**When to update a contract:**
- Adding new acceptance criteria
- Modifying deliverables
- Changing success metrics
- Adjusting time estimates

**Process:**
1. Create new contract version (e.g., `11_phaseA_contract_enhanced.json`)
2. Run `npm run contract:check` to validate
3. Update reference in README/docs
4. Require CODEOWNERS approval

### Git Workflow
- **Branch Naming:** `feature/WA1-success-card`, `fix/repair-timeout`, `phase/A-ui-fixes`
- **Commit Messages:** Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`)
- **PR Requirements:**
  - All CI checks pass
  - Evidence artifacts included (if applicable)
  - Discovery note for new features
  - SBOM regenerated if dependencies changed

---

## Testing Strategy

### Test Layers

#### 1. Unit Tests (Vitest)
- **Location:** `tests/` (mirrors `src/` structure)
- **Coverage:** Functions, edge cases, error paths
- **Examples:**
  - `tests/clarification/detectMissing.test.ts`
  - `tests/planning/decomposeTask.test.ts`
  - `tests/repair/analyzeFailure.test.ts`

#### 2. Integration Tests (Vitest)
- **Location:** `tests/api/`, `tests/e2e/`
- **Coverage:** API endpoints, multi-module flows
- **Examples:**
  - `tests/api/execute-with-clarifications.test.ts`
  - `tests/api/execute-with-planning.test.ts`

#### 3. UI Tests (Playwright)
- **Location:** `tests/ui/`
- **Coverage:** User flows, accessibility, visual regression
- **Examples:**
  - `tests/ui/home.spec.ts`
  - `tests/ui/execution-flow.spec.ts`
  - `tests/ui/accessibility.spec.ts`

#### 4. Performance Tests (Lighthouse)
- **Tool:** Lighthouse CI
- **Budgets:** Core Web Vitals, accessibility score ≥90
- **Reports:** `.automation/lighthouse-reports/`

### Coverage Thresholds
```typescript
// vitest.config.ts
{
  lines: 80,
  branches: 75,
  functions: 80,
  statements: 80
}
```

**Enforcement:** CI blocks merge if thresholds not met

**Exceptions:** Focused test runs (single file) skip thresholds

---

## Observability and Telemetry

### Event Tracking
**Dual-Write System:**
1. **JSON Event Log:** `.telemetry/events.log`
   - Format: JSON objects (one per event)
   - Fields: timestamp, event_type, project, data
2. **Execution Trace:** `.automation/execution_trace.jsonl`
   - Format: JSONL (newline-delimited JSON)
   - Fields: timestamp, task_id, subtask_id, action, status, progress_pct

### Event Types
- `generation_start` - Begin code generation
- `plan_progress` - Subtask progress update
- `plan_snapshot` - Overall plan status
- `missing_critical_file` - File validation failure
- `repair_*` - Repair attempt events

### Metadata Files
**Per-Project Metadata:** `output/<project>/_executor_meta.json`
```json
{
  "project": "...",
  "slug": "...",
  "status": "pass|fail",
  "generatedAt": "ISO timestamp",
  "testResults": { "initial": {...}, "afterRepair": {...} },
  "testRuns": [...],  // All test attempts
  "repairHistory": {...},  // Repair attempts if any
  "clarification": {...},  // Q&A if used
  "taskPlan": {...},  // Planning if triggered
  "fileMetadata": [...],  // SHA-256 checksums
  "completionTimeMs": 12345
}
```

### Evaluation Results
**File:** `.automation/evaluation_results.json`
- Continuous quality tracking
- Success/failure rate
- Performance metrics

---

## Common Patterns and Idioms

### Error Handling Pattern
```typescript
// Async function with telemetry
async function someOperation(params: Params): Promise<Result> {
  await logEvent("operation_start", { params });
  try {
    const result = await doWork(params);
    await logEvent("operation_success", { result });
    return result;
  } catch (error) {
    await logEvent("operation_error", { error: String(error) });
    throw error;
  }
}
```

### Validation Pattern
```typescript
// Schema validation with Ajv
import Ajv from "ajv";
const ajv = new Ajv();
const validate = ajv.compile(schema);

export function validateFoo(data: unknown): ValidationResult<Foo> {
  if (validate(data)) {
    return { ok: true, value: data as Foo };
  }
  return { ok: false, errors: validate.errors };
}
```

### File Writing Pattern
```typescript
// Safe file writing
import path from "node:path";
import fs from "node:fs/promises";

async function writeProjectFile(projectRoot: string, relativePath: string, content: string) {
  const absolute = path.join(projectRoot, relativePath);
  const dir = path.dirname(absolute);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolute, content, "utf-8");
}
```

### Test Execution Pattern
```typescript
// Sandbox test run with timeout
const result = await runInSandbox({
  projectRoot: "/path/to/project",
  projectSlug: "my-project",
  timeoutMs: 60000
});
// result: { status, passCount, failCount, durationMs, logsPath, ... }
```

---

## Integration Points for New Features

### Adding a New Module
1. **Discovery:** Map integration points in existing code
2. **Create:** `src/<module>/` with index.ts
3. **Types:** Define in `src/<module>/types.ts`
4. **Tests:** Mirror structure in `tests/<module>/`
5. **Server:** Wire into `src/server.ts` if API needed
6. **Contract:** Add deliverables to phase contract

### Adding an API Endpoint
1. **Server:** Add route handler in `src/server.ts`
2. **Schema:** Define request/response types
3. **Validation:** Use Ajv for input validation
4. **Frontend:** Add fetch call in `public/script.js`
5. **Tests:** Add to `tests/api/`

### Adding UI Components
1. **Constraints:** Vanilla JS/CSS only, no frameworks
2. **HTML:** Add elements to `public/index.html`
3. **Script:** Add rendering logic to `public/script.js`
4. **Styles:** Add CSS to `public/styles.css`
5. **Tests:** Add Playwright test to `tests/ui/`

### Adding Contract Schema Fields
1. **Schema:** Update `contracts/schemas/roadmap_phase.schema.json`
2. **Validator:** Update `scripts/validate-contract.js` if needed
3. **Tests:** Add validation test cases
4. **CODEOWNERS:** Requires approval (protected file)

---

## Troubleshooting Guide

### Common Issues

#### Tests Failing
```bash
# Check specific test file
npm test tests/planning/decomposeTask.test.ts

# Watch mode for debugging
npm run test:watch

# Coverage report
npm test
# Open coverage/index.html in browser
```

#### TypeScript Errors
```bash
# Run typecheck
npm run typecheck

# Check specific file
npx tsc --noEmit src/planning/decomposeTask.ts
```

#### Linting Errors
```bash
# Check all files
npm run lint

# Auto-fix where possible
npx eslint . --fix
```

#### Contract Validation Fails
```bash
# Validate specific contract
node scripts/validate-contract.js contracts/Roadmap_execution/11_phaseA_contract_enhanced.json

# Validate all
npm run contract:check
```

#### UI Tests Failing
```bash
# Install browsers
npx playwright install chromium --with-deps

# Run with UI
npm run test:ui:headed

# Debug mode
npm run test:ui:debug
```

#### Server Won't Start
```bash
# Check port availability
lsof -i :3000

# Check environment
cat .env
# Ensure LLM_PROVIDER and API key are set

# Check logs
npm run dev 2>&1 | tee server.log
```

---

## Quick Reference

### File Locations
- **Current Contract:** `contracts/Roadmap_execution/11_phaseA_contract_enhanced.json`
- **Stack Lock:** `ai-stack.json`
- **AI Instructions:** `.github/copilot-instructions.md`
- **Protected Files:** `.github/CODEOWNERS`
- **Validation Report:** `.automation/validation_report_*.md`
- **Contract Inventory:** `.automation/contract_inventory_raw.md`

### Key Commands
```bash
npm run validate:all          # Full validation suite
npm run dev                   # Start development server
npm test                      # Run tests with coverage
npm run contract:check        # Validate contracts
npm run sbom                  # Generate SBOM
```

### Important URLs (when server running)
- **UI:** http://localhost:3000
- **Health Check:** http://localhost:3000/healthz
- **API Execute:** POST http://localhost:3000/api/execute
- **API Clarify:** POST http://localhost:3000/api/clarify
- **Output Files:** http://localhost:3000/output/<project>/

### Phase Status
- ✅ **Phases 0-4:** Complete (all modules implemented and tested)
- 🔄 **Phase A:** Current (UI baseline fixes)
- 📋 **Phase B:** Next (Trust Engine foundation)

### Coverage Status
- **Lines:** 89.11% (target: ≥80%) ✅
- **Branches:** 82.60% (target: ≥75%) ✅
- **Functions:** High coverage ✅
- **Statements:** High coverage ✅

### Test Status
- **Total Tests:** 219
- **Passing:** 219 ✅
- **Failing:** 0 ✅
- **Skipped:** 0 ✅

---

## Anti-Patterns to Avoid

### ❌ Don't Do This
1. **Add Python files** - Stack lock violation
2. **Import React/Vue/Angular in /public** - Frontend framework ban
3. **Modify protected files without approval** - CODEOWNERS violation
4. **Lower coverage thresholds** - Quality regression
5. **Skip discovery phase** - Contract requirement
6. **Make breaking API changes** - Contract violation
7. **Commit without running tests** - CI will fail anyway
8. **Hard-code secrets** - Use .env or .env.example
9. **Use relative paths for file I/O** - Cross-platform issues
10. **Bypass schema validation** - Data integrity risk

### ✅ Do This Instead
1. **TypeScript/JavaScript only**
2. **Vanilla JS/CSS in /public**
3. **Request CODEOWNERS approval**
4. **Maintain or improve coverage**
5. **Create discovery notes first**
6. **Version APIs with backward compatibility**
7. **Run `npm run validate:all` before commit**
8. **Use environment variables**
9. **Use `path.join()` and absolute paths**
10. **Validate all inputs/outputs**

---

## Additional Resources

### Documentation
- **CDI Pattern:** `docs/Planning_roadmap_signature/04_ai_integration_pattern.md`
- **Trust Engine Roadmap:** `docs/Planning_roadmap_signature/02_trust_engine_roadmap.md`
- **File Index:** `FILE_INDEX.md`
- **CDI Infrastructure:** `CDI_INFRASTRUCTURE.md`

### Contracts
- **All Phases:** `contracts/Roadmap_execution/`
- **Schemas:** `contracts/schemas/`
- **Current:** `11_phaseA_contract_enhanced.json`

### Reports
- **Validation:** `.automation/validation_report_*.md`
- **Compliance:** `.automation/contract_compliance_report.json`
- **Inventory:** `.automation/contract_inventory_raw.md`

---

## Maintenance Notes

### When to Update This File
- New phase starts
- Major architectural changes
- New module added
- Stack constraints change
- Coverage thresholds change
- New validation gates added

### Last Validation
- **Date:** 2025-01-09
- **Tests:** 219 passing
- **Coverage:** 89.11% lines, 82.60% branches
- **CI Status:** All checks passing
- **Phase:** A (UI Baseline Fixes)

---

**This file is maintained as a living document. Update when significant repository changes occur.**