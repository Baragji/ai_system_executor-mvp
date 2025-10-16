# Phase 3 Integration Rationale — Why the Workflow State Must Feed the Runtime

## 1. Context: Two Parallel Tracks
- The "Executor MVP" product handles prompt-driven code generation, testing, and repair inside `src/server.ts` and its orchestrator stack (StepQueue vs LangGraph).【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L62-L102】
- The "Autonomous Workflow System" is the meta-layer that keeps humans and AI contributors aligned on gates, tasks, and next steps via contracts, ledgers, and CLI tools.【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L102-L129】
- WHAT_IS_WHAT.md documents that Workflow Phase 3 is specifically "Wire workflow state into product runtime (`src/server.ts`)" and Phase 4 builds on that wiring for autonomous execution.【F:WHAT_IS_WHAT.md†L140-L152】【F:WHAT_IS_WHAT.md†L194-L211】

## 2. What We Already Have
- `src/state/phaseState.ts` synthesizes gate status, contract tasks, and validation-driven next-action recommendations in TypeScript so both tools and runtime can share a single source of truth.【F:src/state/phaseState.ts†L4-L202】
- The Phase 1 CLI (`scripts/snapshot-state.js`) re-implements the same parsing and heuristics in JavaScript, which is tolerable only because Phase 3 was meant to lift the logic into a shared module and remove duplication.【F:scripts/snapshot-state.js†L19-L256】
- Documentation already points at this shared module as the pending deliverable for Phase 3 integration work.【F:docs/04_141024_todays_status.md/07_documentation_update.md†L29-L53】

## 3. What the Runtime Exposes Today
- `src/server.ts` maintains ephemeral progress snapshots for SSE and polling endpoints (`/api/progress`, `/api/progress/snapshot`), but those snapshots only surface stage/progress numbers and in-memory orchestrator state.【F:src/server.ts†L120-L357】【F:src/server.ts†L2209-L2228】
- None of the product endpoints import or reuse `phaseState.ts`, so the UI and API consumers have no visibility into gate health, contract tasks, or workflow recommendations while a session is running.【F:src/server.ts†L120-L357】
- Front-end code under `public/` continuously queries those progress endpoints to animate the session bar; if we enrich the payload with PhaseState data, the UI can display "where am I?" alongside runtime status without bolting on a second channel.【F:public/script.js†L1412-L1487】

## 4. Why Wiring PhaseState into Server Endpoints Matters
- **Single Source of Truth:** Right now the CLI and runtime would make independent decisions about next actions. Wiring the shared module into `src/server.ts` lets `/api/progress` emit the same `suggestNextAction` output that `npm run state:show` prints, eliminating drift as more heuristics accumulate in Phase 4.【F:src/state/phaseState.ts†L159-L190】【F:scripts/snapshot-state.js†L148-L224】
- **Real-Time Guidance:** Phase 3 was scoped to expose workflow context alongside orchestration state, so developers (or automated agents) can subscribe to progress SSE and immediately know which gate/task they are on and what to do next.【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L155-L165】
- **Pre-requisite for Autonomous Actions:** Phase 4 intends to execute those suggestions automatically. Without Phase 3 wiring, the runtime has no access to the structured PhaseState payload it needs to safely gate autonomous commits.【F:WHAT_IS_WHAT.md†L140-L152】
- **Audit Requirements:** The post-audit plan and validation reports explicitly call out that the orchestrator must import the shared module to prevent decision-logic divergence—a gap still flagged as pending work.【F:docs/04_141024_todays_status.md/02_post_audit_new_plan.md†L94-L120】【F:docs/04_141024_todays_status.md/03_plan_validation_report.md†L11-L36】

## 5. Consequences of Leaving It Unwired
- **Drift & Confusion:** Developers keep bouncing between CLI snapshots (which know about gates/tasks) and runtime progress (which does not), re-introducing the very category confusion documented in the audit notes.【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L16-L179】
- **Duplicated Maintenance:** Any change to gate interpretation or next-action heuristics must currently be patched in both `scripts/snapshot-state.js` and bespoke runtime logic, doubling maintenance cost and increasing bug risk.【F:scripts/snapshot-state.js†L148-L224】【F:src/server.ts†L120-L357】
- **Blocked Automation:** Phase 4's autonomous executor cannot trigger safe actions until the runtime endpoints can expose deterministic workflow state to whatever agent watches `/api/progress` (human or machine).【F:WHAT_IS_WHAT.md†L140-L152】

## 6. Recommendation
To finish Workflow Phase 3, import `loadPhaseState`, `suggestNextAction`, and `formatHumanSummary` inside `src/server.ts` and attach their outputs to the existing progress snapshots. That will:
1. Keep UI/API consumers aligned with the CLI's "where am I?" view.
2. Satisfy the audit requirement to centralize decision logic before Phase 4 automation.
3. Set up a smooth handoff to G3 product work by eliminating meta-level uncertainty during orchestrator runs.【F:docs/04_141024_todays_status.md/07_documentation_update.md†L29-L53】【F:docs/04_141024_todays_status.md/06_confusion_analysis.md†L155-L165】

