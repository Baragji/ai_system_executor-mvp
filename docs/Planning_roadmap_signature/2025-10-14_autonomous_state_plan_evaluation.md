# Autonomous Workflow Progression System Evaluation (Claude Plan)

## Repository Deep Dive Findings

### Governance & Process Assets
- `AGENTS.md` already enforces a discovery-first protocol, strict validation gates, and forbids Python or new frameworks, reflecting heavy process governance without an explicit autonomous state file. 【F:AGENTS.md†L1-L132】
- `CDI_INFRASTRUCTURE.md` centralizes quick references to Phase 19/20 assets, feature flag workflows, and core trust spine files, providing curated navigation for humans today. 【F:CDI_INFRASTRUCTURE.md†L1-L118】
- `.automation/GATES_LEDGER.md` tracks gate status (G0–G4) including timestamps, evidence bundles, and next steps, acting as the authoritative governance checkpoint log. 【F:.automation/GATES_LEDGER.md†L1-L200】

### Execution & Telemetry Systems
- `src/server.ts` orchestrates sessions with in-memory progress tracking maps, state machines, and telemetry hooks. It already calls `maybeInitTelemetry()` and installs RFC 9457 middleware, indicating runtime awareness of execution stage. 【F:src/server.ts†L108-L199】
- `src/orchestrator/stateMachine.ts` implements a deterministic state machine with guarded transitions and history, which today governs agent execution flow. 【F:src/orchestrator/stateMachine.ts†L1-L85】
- `.automation/execution_trace.jsonl` and `.automation/progress.json` collect chronological execution events and task outcomes across phases, offering historical visibility albeit spread across multiple files. 【F:.automation/execution_trace.jsonl†L1-L5】【F:.automation/progress.json†L1-L26】

### Contract & Schema Realities
- Phase 19’s contract documents the completed trust spine work and outstanding Phase 19/20 milestones, but tasks lack per-task status fields—progress is implied by evidence rather than encoded values. 【F:contracts/Roadmap_execution/19_phase19_autonomous_transition_contract.json†L19-L199】
- The roadmap phase schema currently constrains task IDs to legacy patterns and does not define a `status` property, so adding status tracking would require schema evolution (which is CODEOWNERS-protected). 【F:contracts/schemas/roadmap_phase.schema.json†L1-L305】
- `.automation/phase19_20_implementation_summary.md` and other living docs already summarize achievements, remaining work, and scripts, illustrating a rich documentation ecosystem that a new state layer must coexist with. 【F:.automation/phase19_20_implementation_summary.md†L1-L200】

## Assessment of Claude’s Proposed Additions

### 1. `.automation/AUTONOMOUS_STATE.json`
**Pros:**
- A single machine-readable state source would reduce the current “multiple files” scavenger hunt and could drive automation decisions.
- Encoding `current_phase`, `current_task`, and `next_task` aligns with big tech state machine practices.

**Considerations & Gaps:**
- Without modifying the roadmap contract schema, the new state file becomes yet another parallel truth source. Synchronizing it with contracts that lack status fields risks drift unless schema and contract representations evolve together (requires CODEOWNERS review). 【F:contracts/schemas/roadmap_phase.schema.json†L181-L218】
- Existing in-memory orchestrator state and telemetry already manage run-time flow. Introducing a repository-level JSON state must reconcile with the live session state machine to avoid contradictory instructions (e.g., repo file says `DONE` while runtime machine is mid-run). 【F:src/server.ts†L120-L199】【F:src/orchestrator/stateMachine.ts†L1-L85】
- The plan should define ownership and update responsibility (human vs automation). Failing to automate updates makes the file susceptible to staleness, recreating the problem it intends to solve.

### 2. `.automation/RUNBOOK.md`
**Pros:**
- A runbook tied to state transitions could formalize “if/then” actions and complements the discovery-first discipline.

**Considerations:**
- The repo already houses extensive runbook-like material (e.g., Phase 19 implementation summary with step-by-step scripts). To avoid duplication, the proposed runbook should reference or embed these existing sections rather than restating commands. 【F:.automation/phase19_20_implementation_summary.md†L67-L193】
- Need clarity on how this runbook interacts with AGENTS.md instructions. Adding a new top-level protocol must harmonize with existing “Discovery-First” and validation mandates. 【F:AGENTS.md†L61-L124】

### 3. `scripts/sync-state.js`
**Pros:**
- Automating reconciliation across contracts, gates, and the new state file would mitigate manual drift.

**Considerations:**
- Implementation requires parsing multiple large JSON/MD files with bespoke logic. Before committing, we should inventory existing automation (e.g., `scripts/validate-contract.js`) to reuse validation utilities and avoid duplicating schema loaders. 【F:scripts/validate-contract.js†L1-L200】
- Contracts today expose actions/validation/success arrays but no status field, so the script must either extend schema support or derive status heuristically. Aligning on a canonical representation is prerequisite work.
- Gate evidence already lives in `.automation/evidence/G2/` and is summarized in the ledger; the script must avoid overwriting curated human notes when syncing Markdown.

### 4. `scripts/decision-engine.js`
**Pros:**
- Formalizing “what’s next” logic can codify human heuristics and potentially trigger validations automatically.

**Considerations:**
- The orchestrator already evaluates state transitions and stores `ProgressSnapshot` metadata in memory. Re-implementing decision logic in a separate script risks divergence unless both systems share a single state library. 【F:src/server.ts†L120-L199】
- Decision rules like `allTasksComplete(state)` will rely on authoritative completion data; until contract schema or evidence files encode completion, the engine will have to read bespoke state (the proposed AUTONOMOUS_STATE). This circular dependency should be resolved by defining a single truth source first.
- We should define expected outputs (CLI, JSON, exit codes) and how agents invoke it during CI vs local sessions.

### 5. Documentation Updates (`AGENTS.md`, `CDI_INFRASTRUCTURE.md`, GATES LEDGER references)
**Pros:**
- Directing agents to a canonical state file could streamline onboarding and reduce command thrash.

**Considerations:**
- `AGENTS.md` already spans ~200 lines of mandatory protocol. Adding another mandatory pre-flight checklist without pruning older sections could reduce usability. Consider embedding the new protocol under “Discovery-First” or replacing redundant guidance. 【F:AGENTS.md†L61-L124】
- `CDI_INFRASTRUCTURE.md` currently acts as a quick reference. Adding state pointers should link to the automation scripts/runbook to avoid scattering instructions.

## Risks & Recommended Sequencing
1. **Schema Alignment First:** Extend `contracts/schemas/roadmap_phase.schema.json` (with CODEOWNERS approval) to support task status and modern ID formats before building sync automation. Otherwise, automation has no authoritative fields to update. 【F:contracts/schemas/roadmap_phase.schema.json†L181-L224】
2. **Shared State Library:** Factor a reusable module (TS or JS) that both the orchestrator runtime and new CLI scripts can import, preventing duplicated decision logic. Leverage existing `OrchestratorStateMachine` primitives rather than inventing parallel transition rules. 【F:src/orchestrator/stateMachine.ts†L1-L85】
3. **Pilot with Read-Only Insights:** Initially generate `AUTONOMOUS_STATE.json` as a read-only snapshot derived from existing sources (progress logs, gates ledger) to validate structure without risking divergence.
4. **Incremental Documentation:** Update `AGENTS.md` and `CDI_INFRASTRUCTURE.md` only after the state pipeline proves reliable, so instructions do not reference tooling that agents cannot yet trust.
5. **Automation Hardening:** Reuse `scripts/validate-contract.js` patterns for JSON schema validation and add tests to `tests/` to keep coverage compliant with repo standards. 【F:scripts/validate-contract.js†L1-L200】【F:AGENTS.md†L81-L116】

## Conclusion
Claude’s proposal addresses a real pain point—context sprawl—but successful adoption demands deliberate sequencing. Start by evolving schemas and sharing state logic with existing orchestrator systems, then introduce the state file/runbook as synthesized outputs rather than entirely new authorities. This approach preserves the repo’s rigorous governance while paving the way for the autonomous progression workflow envisioned in the plan.
