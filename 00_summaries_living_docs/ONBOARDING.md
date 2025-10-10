# Welcome to UMCA Executor MVP

**Version:** October 2025  
**Mission:** Build a fully autonomous AI coding system that generates production-ready, enterprise-grade software from natural language prompts.

**Read time:** 15 minutes to understand everything you need to work on this project.

---

## 🎯 What This Is

An autonomous AI coding agent that takes a natural language prompt and outputs a **complete, tested, production-ready application** with evidence of correctness.

**Input:** "Create a Hello World app where I can modify text color through a UI"  
**Output:** Full Express + Tailwind app with:
- ✅ All source files
- ✅ Passing tests
- ✅ Security scan results
- ✅ SBOM (Software Bill of Materials)
- ✅ Confidence score

**Current Status:** 70% functional. Phases 0-4 complete (basic generation, clarification, repair, planning). Phase A (UI polish) complete. Phase B (Trust Engine) next.

---

## 🏗️ Architecture in 60 Seconds

```
User Prompt
    ↓
Clarification (if ambiguous)
    ↓
Planning (if complex) → Decompose into subtasks
    ↓
Generation (LLM) → TypeScript/JavaScript files
    ↓
Test Execution (sandboxed)
    ↓
Multi-turn Repair (if tests fail, up to 4 attempts)
    ↓
Output + Evidence Bundle
```

**Stack:** Node 20, TypeScript, Express backend, Vanilla JS frontend (NO frameworks), Vitest for testing.

---

## 📜 The #1 Rule: Quality Over Speed

> **"Speed is the mother of all disasters. We only ship verified, evidence-based, best-practice code."**

### Our Principles
1. **Ship perfect or don't ship** - No half-working features
2. **Evidence-based** - Every claim needs proof (test output, logs, artifacts)
3. **Contract-driven execution** - All work follows contracts with clear Definition of Done
4. **Discovery-first** - Understand integration points BEFORE writing code
5. **Zero warnings** - ESLint, TypeScript must be clean

### How This Failed 95 Times Before
**Anti-pattern that killed past projects:**
1. Build feature X
2. X exposes foundation issue Y
3. Spend weeks fixing Y
4. Y exposes issue Z
5. Spend weeks fixing Z
6. **Feature X never ships**
7. Burnout, abandon

**Our fix:** Incremental wins (45-60 min), clear DoD, validate each step, never chase foundation issues during feature work.

---

## 🔧 Quick Start (Day 1)

### Setup
```bash
# 1. Clone and install
git clone <repo>
cd ai_system_executor-mvp
npm install

# 2. Configure environment
cp .env.example .env
# Add your OPENAI_API_KEY or ANTHROPIC_API_KEY

# 3. Verify everything works
npm run lint          # Must pass with 0 warnings
npm run typecheck     # Must pass with 0 errors
npm test              # 244 tests must pass
npm run contract:check # Validates contract schemas

# 4. Start dev server
npm run dev
# Open http://localhost:3000
```

### Your First Task
```bash
# 1. Read the contract for current phase
cat contracts/Roadmap_execution/12B_trust_engine_contract.json

# 2. Check what's been done
git log --oneline -20

# 3. Find your assigned win
# Contracts have "wins" (WA1, WA2, etc.) - each is 45-60 min of work

# 4. Before ANY code changes:
# Read: .github/copilot-instructions.md (Discovery-First Protocol)
```

---

## 📁 Repository Structure

```
ai_system_executor-mvp/
├── src/                      # Backend (TypeScript)
│   ├── server.ts            # Main Express server
│   ├── executor/            # Code generation (LLM → files)
│   ├── clarification/       # Interactive Q&A for ambiguous prompts
│   ├── planning/            # Task decomposition & orchestration
│   ├── repair/              # Multi-turn test failure repair
│   ├── runner/              # Sandboxed test execution
│   ├── contracts/           # Schema validators (Ajv)
│   ├── telemetry/           # Observability & tracing
│   └── llm/                 # LLM provider abstraction
│
├── public/                   # Frontend (Vanilla JS/CSS - NO frameworks)
│   ├── index.html           # Main UI
│   ├── script.js            # Client-side logic
│   └── styles.css           # Styling
│
├── tests/                    # Unit & integration tests (Vitest)
├── contracts/                # JSON contracts & schemas
│   ├── Roadmap_execution/   # Phase contracts (01-12B)
│   └── schemas/             # JSON Schema definitions
│
├── .automation/              # Evidence & artifacts
│   ├── execution_trace.jsonl # Telemetry (JSONL format)
│   └── fixtures/            # Session data for debugging
│
├── output/                   # Generated projects
│   └── <project-name>/      # Each generation creates a folder here
│
├── .github/
│   ├── copilot-instructions.md # AI agent instructions (CRITICAL)
│   ├── CODEOWNERS           # Protected files (require approval)
│   └── workflows/           # CI/CD pipelines
│
└── docs/                     # Documentation & session notes
```

---

## 🔐 Protected Files (CODEOWNERS Approval Required)

These files are **locked** and require explicit approval to change:

- `ai-stack.json` - Stack constraints (TypeScript-only, no Python)
- `.github/copilot-instructions.md` - AI agent rules
- `.github/workflows/*` - CI/CD pipelines
- `contracts/schemas/*` - Contract validation schemas
- `.github/CODEOWNERS` - This file itself

**Why?** These define the rules of the game. Changing them breaks the contract-driven workflow.

---

## 📋 Contract-Driven Development (CDI)

### What is CDI?
Every phase of work follows a **contract** (JSON file) with:
- **Wins** - Individual features (45-60 min each)
- **Acceptance Criteria** - Boolean gates that must pass
- **Deliverables** - Files that must exist with specific content
- **Test Requirements** - Coverage %, lint, typecheck must pass
- **Evidence Requirements** - Artifacts proving completion

### Contract Structure
```json
{
  "contract_version": "2.0.0",
  "phase_id": "PHASE_B",
  "wins": [
    {
      "win_id": "WB1",
      "title": "Seed discoverable tests",
      "estimated_duration_minutes": 60,
      "acceptance_criteria": [
        "Every generation includes ≥1 Vitest spec",
        "Tests are auto-discovered by test runner"
      ],
      "deliverables": [
        {
          "path": "src/utils/seedTests.ts",
          "validation_method": "file_exists"
        }
      ]
    }
  ]
}
```

### The Discovery-First Protocol
**Before writing ANY code:**

1. **Discover integration points**
   - Find exact file + line + function where code will integrate
   - Document current implementation (code snippets ±10 lines)
   - List dependencies and impacts

2. **Create discovery note**
   - Path: `.automation/phase*_discovery_note.md`
   - Include: integration points, snippets, justification, compliance check

3. **Verify stack compliance**
   - Check `ai-stack.json` - are you using allowed tech?
   - No Python, no frontend frameworks in `/public`

4. **THEN** write code

**Why?** Prevents context drift, ensures AI agents don't make assumptions, creates audit trail.

---

## 🚀 Development Workflow

### Daily Flow
```bash
# 1. Pull latest
git pull origin PhaseA_Harden

# 2. Run validation suite
npm run validate:all  # lint + typecheck + tests + contracts

# 3. Pick a win from current contract
cat contracts/Roadmap_execution/12B_trust_engine_contract.json

# 4. Create discovery note (if new feature)
vim .automation/phase_B_win_1_discovery.md

# 5. Implement (following discovery plan)
# 6. Write tests (or update existing)
# 7. Validate locally

npm run lint          # 0 warnings
npm run typecheck     # 0 errors  
npm test              # All pass
npm run contract:check # Contracts valid

# 8. Commit with evidence
git add .
git commit -m "feat(trust-engine): WB1 - seed discoverable tests

- Added src/utils/seedTests.ts
- Tests: tests/utils/seedTests.test.ts (2 passing)
- Evidence: .automation/phase_B_win_1_discovery.md
- Contract: 12B_trust_engine_contract.json (WB1 complete)"

# 9. Create PR with evidence checklist
# (Template auto-fills from .github/pull_request_template.md)
```

### Testing Standards
- **Unit tests:** Every function in `src/`
- **Integration tests:** Every API endpoint
- **Coverage:** 80% line, 75% branch (enforced)
- **Test naming:** `describe('module', () => it('does X'))`
- **No skipped tests** without explanation

### Code Standards
- **TypeScript:** Strict mode, no `any` unless justified
- **ESLint:** Zero warnings (enforced in CI)
- **Formatting:** Prettier (auto-format on save)
- **Imports:** Use `.js` extension even for `.ts` files (ES modules)
- **Error handling:** All async functions have try/catch
- **Logging:** Use `logEvent()` from telemetry, not `console.log`

---

## 📊 Current State (October 2025)

### Completed Phases (0-4, A)
| Phase | Name | Status | Key Deliverables |
|-------|------|--------|------------------|
| 0 | Remediation | ✅ Complete | Schema validation, test execution, repair module |
| 2A | Clarification Core | ✅ Complete | `detectMissing()`, `generateQuestions()`, API |
| 2B | Clarification Integration | ✅ Complete | `augmentPrompt()`, UI form, end-to-end flow |
| 2C | Clarification Telemetry | ✅ Complete | Smart defaults, telemetry schema, metrics |
| 3A | Multi-turn Foundations | ✅ Complete | Failure analysis, diff generation, repair prompts |
| 3B | Multi-turn Execution | ✅ Complete | Multi-turn loop, UI repair history |
| 4A | Planning Foundation | ✅ Complete | Task decomposition, validation, dependencies |
| 4B | Sequential Execution | ✅ Complete | Subtask executor, orchestrator, progress UI |
| 4B1 | Adaptive Repair | ✅ Complete | Strategy selector, adaptive prompts |
| 4B2 | Sandbox Install | ✅ Complete | Safe dependency installation |
| 4B3 | Subtask Resilience | ✅ Complete | Retry wrapper with context preservation |
| 4B4 | Planning Telemetry | ✅ Complete | Execution trace schema, field mapping |
| A | UI Baseline Fixes | ✅ Complete | Success cards, loading states, error messages |

**Test Status:** 244 tests passing, 89% line coverage, 83% branch coverage

### Next Phase: B (Trust Engine)
**Goal:** Code generation with embedded proof of correctness

**Timeline:** 2-3 weeks

**Wins:**
- **WB1:** Seed discoverable tests (every generation includes ≥1 Vitest spec)
- **WB2:** Verification summary UI (show test results, security scan, confidence score)
- **WB3:** Advisory security scanning (OSV scanner in CI, non-blocking)

**Why it matters:** This is the signature moment - AI generates code that PROVES its own correctness. No more "generate fast, verify slow" - we generate WITH verification.

---

## 🐛 Known Issues & Recent Fixes

### Recently Fixed (October 10, 2025)
1. ✅ **LLM timeout** - Increased from 60s → 180s for GPT-5 reasoning model
2. ✅ **Timeout retry** - Made timeouts retryable with exponential backoff
3. ✅ **Circuit breaker** - Increased MAX_CONSECUTIVE_FAILURES from 2 → 3
4. ✅ **Plan budget** - Added 15min hard limit (PLAN_BUDGET_MS=900000)
5. ✅ **Repair schema mismatch** - Normalize both `content` and `contents` fields

### Current Known Issues
1. **Test discovery** - Generated projects sometimes have 0 tests discovered (WB1 will fix)
2. **File write reliability** - Rare cases where files are empty after write
3. **Repair loop edge cases** - Sometimes repair doesn't converge after 4 attempts

---

## 🔍 Debugging & Troubleshooting

### Where to Look
```bash
# Server logs
npm run dev  # Watch console output

# Test logs (generated projects)
cat output/<project>/logs/*.log

# Telemetry trace
cat .automation/execution_trace.jsonl | grep "error\|fail"

# Session fixtures (full LLM context)
ls .automation/fixtures/<project>/<session>/
```

### Common Issues

**"Tests not running (0/0)"**
- Cause: No discoverable Vitest specs in generated project
- Fix: Phase B WB1 will add test seeding

**"LLM call timed out"**
- Cause: Timeout too short for complex generation
- Fix: Increase `LLM_CALL_TIMEOUT_MS` in `.env` (default 180s)

**"Missing contents for src/server.ts"**
- Cause: Repair artifact missing file contents
- Fix: Recently patched to normalize `content`/`contents` mismatch

**"Plan execution halted after 3 consecutive failures"**
- Cause: Circuit breaker triggered
- Fix: Check logs for root cause, increase `PLAN_BUDGET_MS` if needed

---

## 🎓 Key Concepts

### 1. Clarification Flow
When prompt is ambiguous:
1. System detects missing info (framework? styling? auth?)
2. Generates multiple-choice questions
3. User answers via UI
4. Prompt is augmented with answers
5. Generation proceeds with full context

### 2. Planning Flow
When prompt is complex (>3 features):
1. Decompose into subtasks (typically 5-9)
2. Analyze dependencies (DAG)
3. Execute in order
4. Each subtask: generate → test → repair (if needed)
5. Progress tracked and displayed in UI

### 3. Multi-Turn Repair
When tests fail:
1. Analyze failure (category: syntax, logic, missing, etc.)
2. Select repair strategy (incremental, rewrite, focused, conservative)
3. Generate fix with LLM
4. Apply changes
5. Re-run tests
6. Repeat up to 4 times
7. If still failing, mark as partial success

### 4. Telemetry
Dual-write system:
- `.telemetry/events.log` - Structured JSON events
- `.automation/execution_trace.jsonl` - JSONL trace with task/subtask IDs
- Session fixtures - Full LLM prompts/responses for debugging

### 5. Contracts
Every phase has a contract (JSON) with:
- Wins (45-60 min features)
- Acceptance criteria (Boolean gates)
- Deliverables (files that must exist)
- Test requirements (coverage, lint, typecheck)
- Evidence requirements (artifacts to generate)

**Validation:** `npm run contract:check` validates all contracts against schema

---

## 🚨 Anti-Patterns (Things That Will Get You Stuck)

### ❌ Don't Do This
1. **Skip discovery phase** - "I know where this goes" → No, you don't. Context drift is real.
2. **Add Python** - Stack is TypeScript-only. `ai-stack.json` enforces this.
3. **Add frontend framework to /public** - Vanilla JS only. No React, Vue, Angular.
4. **Make breaking API changes** - Without updating contracts first.
5. **Skip tests** - "I'll add tests later" → Later never comes.
6. **Ignore warnings** - ESLint warnings = future bugs. Fix immediately.
7. **Commit without running validation** - CI will reject it anyway.
8. **Chase foundation issues during feature work** - This killed 95 previous attempts.

### ✅ Do This Instead
1. **Always run discovery first** - Document integration points before coding.
2. **Follow the stack** - TypeScript, Node 20, Vanilla JS. That's it.
3. **Write tests with code** - Not after. Tests are part of the feature.
4. **Run validation locally** - Before every commit: `npm run validate:all`
5. **Small commits** - One win per commit, with evidence.
6. **Update contracts** - If you change a deliverable, update the contract.
7. **Ask when stuck** - Don't guess. Check docs, ask team, read code.

---

## 📚 Essential Reading (Priority Order)

**Day 1 (Required):**
1. This file (ONBOARDING.md) - 15 min
2. `.github/copilot-instructions.md` - Discovery protocol (10 min)
3. `CDI_INFRASTRUCTURE.md` - CDI overview (5 min)
4. Current contract: `contracts/Roadmap_execution/12B_trust_engine_contract.json` (10 min)

**Day 2 (Recommended):**
5. `FILE_INDEX.md` - Detailed file map (15 min)
6. `docs/101025_todays_status/01_101025_claudes.md` - Recent session context (20 min)
7. Repo README.md - Quick start (5 min)

**Week 1 (Deep Dive):**
8. Contracts in `contracts/Roadmap_execution/` - History of phases (1 hour)
9. Source code in `src/` - Read main modules (2 hours)
10. Tests in `tests/` - See patterns (1 hour)

---

## 🤝 Getting Help

### Quick References
- **Stack rules:** `ai-stack.json`
- **AI agent rules:** `.github/copilot-instructions.md`
- **Protected files:** `.github/CODEOWNERS`
- **Commands:** `package.json` scripts section

### Common Commands
```bash
# Validation
npm run lint              # ESLint
npm run typecheck         # TypeScript
npm test                  # Vitest (all tests)
npm run contract:check    # Validate contracts
npm run validate:all      # All of the above

# Development
npm run dev               # Start dev server
npm test -- --watch       # Test watch mode
npm run build             # TypeScript compilation

# Evidence Generation
npm run sbom              # Generate SBOM
npm run test:ui           # Playwright UI tests
npm run test:lighthouse   # Performance audits
```

### When You're Stuck
1. **Check current contract** - Are you implementing the right thing?
2. **Read discovery notes** - `.automation/*_discovery*.md`
3. **Check git history** - `git log --oneline -20`
4. **Read tests** - They show expected behavior
5. **Check telemetry** - `.automation/execution_trace.jsonl`
6. **Ask the team** - Don't spin your wheels

---

## 🎯 Success Metrics

**You're succeeding if:**
- ✅ All 244 tests passing locally
- ✅ ESLint shows 0 warnings
- ✅ TypeScript shows 0 errors
- ✅ Coverage above 80% lines, 75% branches
- ✅ Contracts validate: `npm run contract:check` passes
- ✅ You ship 1 win per day (45-60 min)
- ✅ Every commit has evidence (tests, discovery notes, artifacts)

**You're stuck if:**
- ❌ Tests failing for >1 hour without progress
- ❌ Warnings piling up instead of fixing
- ❌ Working on foundation issues instead of current win
- ❌ No clear definition of done for what you're building
- ❌ Committing without running validation

---

## 🔮 The Vision (Why This Matters)

**End Goal:** A fully autonomous AI coding system capable of producing any software, app, or code generation - production-ready, enterprise-grade - from a prompt.

**What makes this different:**
- **Not just code generation** - We generate WITH verification
- **Not just fast** - We generate CORRECT (evidence-based)
- **Not just demos** - Production-ready, tested, secure, documented
- **Not just automation** - Autonomous agent that PROVES its work

**The signature moment:** Trust Engine (Phase B) - AI generates code that comes with embedded proof of correctness. You don't verify the code. The code verifies itself.

**Why this is hard:** 95 attempts failed before finding this approach. The graveyard is full of "fast code generators." We're building the first "proven correct code generator."

**Why this matters:** 66% of developers distrust AI-generated code. Trust Engine eliminates that by providing evidence. This is the moat.

---

## 📝 Final Notes

- **This is a marathon, not a sprint** - Quality over speed, always
- **Contracts are the source of truth** - Not Jira, not Slack, not memory
- **Evidence is mandatory** - Claims without proof = didn't happen
- **Discovery before coding** - Context drift will kill your work
- **Tests are not optional** - They're part of the feature
- **Warnings are bugs** - Fix them immediately
- **When in doubt, ask** - Don't guess, don't assume

**Welcome to the team. Ship perfect or don't ship.**

---

**Version:** 1.0.0  
**Last Updated:** October 10, 2025  
**Next Update:** After Phase B execution  
**Maintainer:** @yousefbaragji
