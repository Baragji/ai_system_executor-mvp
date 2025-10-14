# WHAT IS WHAT - Category Clarification

> **Purpose:** This document prevents confusion between THE PRODUCT we're building vs THE WORKFLOW we use to build it.

**Read this first if you're ever confused about "what am I working on?"**

---

## TL;DR

**There are TWO separate things in this repository:**

1. **The Product:** An AI code generation system (Executor MVP)
2. **The Workflow:** How we developers work on that product (autonomous workflow system)

**They are NOT the same thing.** They use similar words ("orchestrator", "state", "autonomous") which causes confusion.

---

## THING 1: THE PRODUCT 🏗️

### Name
**Executor MVP** (also called "UMCA Executor MVP")

### What It Does
An AI-powered system that:
1. Takes a user prompt: _"Build a hello world app"_
2. Uses LLMs (GPT/Claude) to generate code
3. Validates generated code against schemas
4. **Automatically runs tests** on the generated code
5. **Auto-repairs** if tests fail (up to 3 attempts)
6. Serves output at `http://localhost:3000`

### Who Uses It
**End users** who want to generate code by describing what they want in natural language.

### Core Features
- **Clarification:** Asks follow-up questions if prompt is vague
- **Planning:** Breaks complex prompts into subtasks
- **Generation:** LLM-based code generation
- **Testing:** Automatic test execution in sandbox
- **Repair:** Multi-turn test failure fixes
- **Orchestration:** Coordinates the above steps

### Technology Stack (OF THE PRODUCT)
```
Language:   TypeScript/JavaScript ONLY
Backend:    Node.js 20+ with Express
Frontend:   Vanilla JS/CSS (no React/Vue/Angular)
Testing:    Vitest (for testing generated code)
LLMs:       OpenAI GPT / Anthropic Claude
Storage:    Local filesystem (./output/)
```

### Orchestration Modes (PRODUCT FEATURE)
**Mode 1 (Default):** **StepQueue** - Simple sequential execution
**Mode 2 (Beta):** **LangGraph** - Multi-agent orchestration (feature-flagged)

```bash
# Default mode
npm run dev

# LangGraph mode (beta)
AGENTS_RUNTIME=langgraph npm run dev
```

### Current Product Status
**Phase 19/20:** Trust Spine + LangGraph Foundation

**What This Means:**
- ✅ **T0 (Trust Spine) COMPLETE**
  - Enterprise observability (OpenTelemetry, SBOM, SLSA provenance)
  - RFC 9457 standardized errors
  - JSONL action logs

- ⏳ **M1/G3 (LangGraph Pilot) IN PROGRESS**
  - Multi-agent orchestration infrastructure
  - Async execution tracking
  - Feature-flagged runtime switching

### Key Files (PRODUCT CODE)
```
src/server.ts                     # Express API server
src/executor/                     # Code generation engine
src/runner/                       # Test execution sandbox
src/repair/                       # Test failure repair system
src/planning/                     # Task decomposition
src/orchestrator/                 # Execution coordination
  ├── stateMachine.ts             # Runtime state machine
  ├── stepQueue.ts                # Default orchestrator
  ├── adapter.ts                  # Runtime switcher
  ├── graph.ts                    # LangGraph stub
  └── executionsStore.ts          # Async job tracking
```

---

## THING 2: THE WORKFLOW 📋

### Name
**Autonomous Workflow System** (also called "Developer Progression System")

### What It Does
Helps developers (humans + AI assistants) working ON the Executor MVP by answering:
1. **Where am I?** (current phase, completed tasks, gate status)
2. **What's done?** (task completion, evidence)
3. **What's next?** (suggested actions, gate advancement)

### Who Uses It
**Developers/AI agents** working on the Executor MVP codebase (that's us!)

### Core Features
- **State Snapshot:** `npm run state:show` - See current status in one command
- **Contract Tracking:** JSON contracts define phases and tasks
- **Gate System:** Quality gates (G0-G4) validate milestone completion
- **Evidence Collection:** SBOM, provenance, test reports
- **Autonomous Suggestions:** "what's next?" decision engine

### Technology Stack (OF THE WORKFLOW SYSTEM)
```
Process Docs:   Markdown (AGENTS.md, CLAUDE.md, etc.)
Contracts:      JSON schemas + Ajv validation
State Tracking: TypeScript modules + shell scripts
Evidence:       JSONL logs, SBOM files, test reports
```

### Workflow Phases (META-LEVEL TOOLS)
**Phase 1 (Complete):** Read-only snapshot system
**Phase 2 (Complete):** Contract status sync
**Phase 3 (Pending):** Orchestrator integration (wire state into runtime)
**Phase 4 (Pending):** Autonomous executor (auto-commit passing tests)

### Current Workflow Status
- ✅ **Phases 1-2 COMPLETE**
  - `npm run state:show` works
  - `npm run state:sync` syncs contract statuses
  - Snapshot shows "where am I?" + "what's next?"

- ⏳ **Phases 3-4 PENDING**
  - Phase 3: Wire workflow state into product runtime (`src/server.ts`)
  - Phase 4: Autonomous execution of safe actions (auto-commit tests)

### Key Files (WORKFLOW TOOLS)
```
AGENTS.md                         # AI agent instructions
CLAUDE.md                         # Claude Code guidance
CDI_INFRASTRUCTURE.md             # Quick reference
.automation/GATES_LEDGER.md       # Quality gate tracking
contracts/Roadmap_execution/      # Phase contracts
scripts/snapshot-state.js         # State snapshot generator
scripts/sync-contract-status.js   # Contract sync script
src/state/phaseState.ts           # Shared state library (meta-level)
```

---

## THE CONFUSION: Where Things Get Mixed Up

### Similar Words, Different Meanings

| Word | In Product Context | In Workflow Context |
|------|-------------------|---------------------|
| **Orchestrator** | Execution engine (StepQueue/LangGraph) | Runtime integration (Phase 3) |
| **State** | Runtime execution state (CLARIFYING→DONE) | Meta-level progress (gates, tasks) |
| **Autonomous** | AI-powered code generation | Auto-execution of workflow actions |
| **LangGraph** | Product feature (multi-agent runtime) | NOT related to workflow |
| **Phase** | Product milestone (Phase 19/20) | Workflow enhancement (Phases 1-4) |

### The Category Error

**WRONG THINKING:** "We're on Phase 19, should we do Phases 3-4 before G3?"

**CORRECTED THINKING:**
- Phase 19 = PRODUCT milestone (Trust Spine)
- Phases 3-4 = WORKFLOW enhancements (autonomous tools)
- G3 = PRODUCT gate (LangGraph pilot)

**These are parallel tracks:**
```
PRODUCT TRACK:
├── Phase 19 T0 (Trust Spine) ✅
├── Phase 19 M1/G3 (LangGraph Pilot) ⏳
└── Phase 19 U1/G4 (HITL/MCP) 🔜

WORKFLOW TRACK:
├── Phase 1 (Snapshot) ✅
├── Phase 2 (Sync) ✅
├── Phase 3 (Integration) ⏳
└── Phase 4 (Executor) ⏳
```

---

## Quick Decision Guide

### "Should I work on X next?"

**Ask yourself:** Is X about...
- **The product's functionality?** → PRODUCT TRACK
- **How we developers work?** → WORKFLOW TRACK

**Examples:**

| Task | Category | Track |
|------|----------|-------|
| Implement LangGraph parity tests | PRODUCT | G3 (Orchestrator Pilot) |
| Wire state into `/api/progress` endpoint | WORKFLOW | Phase 3 (Integration) |
| Add autonomous action executor | WORKFLOW | Phase 4 (Executor) |
| Measure LangGraph p50 overhead | PRODUCT | G3 (Orchestrator Pilot) |
| Auto-commit passing tests | WORKFLOW | Phase 4 (Executor) |
| Implement HITL approval UI | PRODUCT | U1/G4 (Future) |

### "What should I work on next?"

**If developer confusion is the main problem:**
→ Finish WORKFLOW track (Phases 3-4)

**If product features are the priority:**
→ Advance PRODUCT track (G3 Orchestrator Pilot)

**If both matter:**
→ Finish WORKFLOW first (cheaper, 3-5 hrs), then PRODUCT (benefits from automation)

---

## Common Questions

### Q: What is "Phase 19"?
**A:** A PRODUCT milestone. "Trust Spine + LangGraph Foundation" for the Executor MVP.

### Q: What are "Phases 3-4"?
**A:** WORKFLOW enhancements to the autonomous developer progression system.

### Q: What is "LangGraph"?
**A:** A PRODUCT feature - multi-agent orchestration runtime for code generation.

### Q: What is "orchestrator integration" (Phase 3)?
**A:** WORKFLOW enhancement - wiring workflow state into the product's runtime endpoints.

### Q: Can I work on G3 without finishing Phases 3-4?
**A:** Yes! They're independent tracks. But Phases 3-4 will make G3 development easier.

### Q: What is `src/state/phaseState.ts`?
**A:** WORKFLOW tool - shared library for workflow state (NOT product runtime state).

### Q: What is `src/orchestrator/stateMachine.ts`?
**A:** PRODUCT code - runtime state machine for execution flow (CLARIFYING→GENERATING→DONE).

---

## How to Use This Document

### When Starting a New Task
1. Check if task is PRODUCT or WORKFLOW
2. Look at the appropriate track's status
3. Understand dependencies within that track
4. Avoid conflating the two tracks

### When Confused
1. Re-read the "TL;DR" section
2. Check the "Similar Words, Different Meanings" table
3. Use the "Quick Decision Guide"

### When Planning
1. PRODUCT track: Follow contract gates (G0→G1→G2→G3→G4)
2. WORKFLOW track: Follow enhancement phases (1→2→3→4)
3. Remember: These can progress in parallel

---

## Current Status (2025-10-14)

### PRODUCT: Executor MVP
**Phase:** 19/20 (Trust Spine + LangGraph Foundation)
**Status:** T0 Complete ✅, G3 Pending ⏳
**Next:** Implement G3 Orchestrator Pilot acceptance criteria

### WORKFLOW: Autonomous System
**Phase:** 1-2 Complete, 3-4 Pending
**Status:** Snapshot + Sync Working ✅, Integration Pending ⏳
**Next:** Wire workflow state into product runtime (Phase 3)

### Recommendation
**Finish WORKFLOW Phases 3-4, THEN advance PRODUCT G3**

**Rationale:**
- Workflow system solves the original problem ("what's next?" confusion)
- Small investment (3-5 hours) for permanent clarity
- Makes G3 development smoother with autonomous tools
- Prevents this category confusion from recurring

---

## References

**For PRODUCT information:**
- [CLAUDE.md](CLAUDE.md) - Project overview and architecture
- [README.md](README.md) - Quick start guide
- [FILE_INDEX.md](FILE_INDEX.md) - Code organization

**For WORKFLOW information:**
- [AGENTS.md](AGENTS.md) - AI agent instructions
- [CDI_INFRASTRUCTURE.md](CDI_INFRASTRUCTURE.md) - CDI pattern quick reference
- [.automation/GATES_LEDGER.md](.automation/GATES_LEDGER.md) - Gate status tracking

**For current status:**
```bash
npm run state:show  # Workflow status snapshot
npm test            # Product test results
npm run validate:all # Product quality gates
```

---

**Last Updated:** 2025-10-14
**Maintained By:** CODEOWNERS
**Purpose:** Prevent category confusion between product and workflow
