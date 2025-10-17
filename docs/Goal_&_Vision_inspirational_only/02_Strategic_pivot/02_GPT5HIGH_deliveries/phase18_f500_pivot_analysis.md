# Strategic Pivot – Fortune 500 Autonomous Coding System (Evidence-Based)

Date: 2025-10-12
Principle: Quality over speed. Ship perfect or never.
Framework: Contract-CDI (discover → validate → implement → prove)

Sources Reviewed
- docs/Goal_&_Vision_inspirational_only/Agent_framework/08_master_coordinator_agent_MCA.md
- docs/Goal_&_Vision_inspirational_only/Atomic_Phased_Systemgap_plan.md
- docs/Goal_&_Vision_inspirational_only/autonomous_ai_coding_system_taxonomy_ssot_1.1.md (deprecated)
- docs/Goal_&_Vision_inspirational_only/autonomous_ai_coding_system_taxonomy_ssot_1.2.md
- docs/Goal_&_Vision_inspirational_only/autonomous_coding_taxonomy-2.md
- docs/Goal_&_Vision_inspirational_only/spec_for_autonomy.md
- contracts/Roadmap_execution/16_phaseA_accessibility_pause_contract.json
- .zencoder/rules/repo.md and ai-stack.json

Executive Summary
- The MVP proves the CDI spine works (clarify → plan → generate → test → repair) with strong evidence habits. However, a single-agent executor will not meet Fortune 500 requirements.
- Research docs unanimously push toward specialization and orchestration (multi-agent), trust evidence (SBOM, provenance, SIEM), approval gates, and auditable state.
- Major conflicts exist with our enforced stack (Node/Express + vanilla JS; no Python; no frontend frameworks). Much of the research suggests Python toolchains, LangGraph, and React UI.
- Recommendation: Option 4 (Evidence-Based Hybrid). Implement multi-agent seams and trust spine upgrades entirely within current CDI/stack; add a vanilla chat loop; phase-in compliance/observability. Defer any stack changes to explicit RFCs.

1) Reading Notes (condensed)
- MCA (08_master_coordinator_agent_MCA.md): Defines the Master Coordinator with verifiable gate checks, evidence bundles, and state files. Emphasizes zero redundancy, approvals, and reproducibility. Strong governance fit for F500.
- Atomic_Phased_Systemgap_plan.md: Planner–Executor–Critic architecture, LangGraph orchestration, specialized agents, and a Digital Immune System. Heavy Python references and timeline sprints.
- SSOT v1.1 vs v1.2: v1.2 reconciles gates and maps “phase” to “priority”; retains 67 functions but clarifies evidence and priority. Keeps Python-centric examples (ruff/mypy) but is conceptually stack-agnostic.
- autonomous_coding_taxonomy-2.md: Expands taxonomy (120+ functions), adds ops (event bus, DLQ, release controls), FinOps, observability. Explicitly mentions React/Next and Kafka/RabbitMQ.
- spec_for_autonomy.md: Full-stack spec (REST + WebSocket; RFC9457 errors; OpenTelemetry; SBOM; SLSA). UI specified as React/Next; calls for Redis/Postgres and message queues.
- Contract 16 (phaseA_accessibility_pause): Narrow, concrete UI wins; compatible with our current stack and pause/clarify UX needs.
- Repo rules (.zencoder/rules/repo.md + ai-stack.json): Strict Node/Express + vanilla JS; no Python; no frontend frameworks; no new deps without explicit justification; CDI discovery protocol.

2) Conflict Analysis
- Language/Stack: Many docs call for Python runtimes/tools (LangGraph, ruff, mypy). Our enforced stack is Node/TypeScript with Vitest + ESLint. Conflict: high. Resolution: implement orchestration, quality and policy gates in Node; map tools to Node equivalents (ESLint/tsc/semgrep/gitleaks/cyclonedx-npm; provenance via GitHub Actions/SLSA-generator).
- Frontend: Research suggests React/Next for chat/UX. Current rule forbids frameworks under /public. Conflict: medium-high. Resolution: build minimal chat in vanilla JS (SSE + POST endpoints); propose a future RFC for React if/when governance allows.
- Event bus/MQ: Kafka/RabbitMQ appear in advanced phases; CDI forbids new deps w/o justification. Resolution: keep StepQueue default inline; allow optional BullMQ backend (already present pattern) behind a flag and contract justification.
- Gates/Compliance: Research prescribes ASVS/LLM Top-10, CycloneDX 1.6 SBOM, SLSA, SIEM. Current codebase generates SBOM and telemetry, but not full provenance nor SIEM integration. Resolution: incremental wins that add testable artifacts and don’t break APIs.

3) Gap Analysis (MVP → F500)
- Likely F500 Requirements:
  - Separation of duties (specialized agents), controlled approvals, auditable gates.
  - Supply chain and compliance evidence (CycloneDX 1.6 SBOM, SLSA provenance, policy-as-code scans, secrets checks, RFC 9457 errors).
  - Operational maturity (SLOs/SLAs, rollback, observability, SIEM feeds), reliable user interaction (chat/pause/clarify).
- MVP Has:
  - CDI spine, coverage thresholds, repair loop, telemetry, SBOM (spdx), deterministic task plan path.
- MVP Missing (high priority):
  - Multi-agent orchestration layer; vanilla chat loop.
  - Provenance (SLSA), SIEM-friendly action logs, policy-as-code gates.
  - Compliance mappings and Go/No-Go artifacts.

4) Feasibility – Options
- Option 1 (current contracts only): Low-medium. Safe but slow; won’t reach F500 bar alone.
- Option 2 (adopt research as-is): Low. Stack conflicts (Python/React) vs CDI rules; high drift risk.
- Option 3 (reactive fixes): Low. Unpredictable; drift and rework.
- Option 4 (Evidence-Based Hybrid): High. Reconcile roadmaps with CDI; deliver incremental, testable wins; preserve stability.
- Option 5 (alternative): Not required; Option 4 subsumes benefits.

5) Technical Evaluation
- Single-agent constraints: Coordination complexity, poor separation of concerns, hard to prove governance checks. Evidence from research and industry patterns: specialization improves quality and throughput when coupled with strong orchestration and gates.
- Multi-agent in our stack: Feasible via StepQueue with additional step types (RA/AA/SA/IA/QA/DBA/DA), each with payload schemas + evidence outputs; no need for Python/LangGraph to prove value.
- Chat loop: A vanilla JS chat (SSE + POST) unlocks interactive clarify/pause/resume and improves throughput/quality.
- Trust spine: We already emit SBOM (spdx) and telemetry; adding CycloneDX 1.6, SLSA provenance (GitHub attestation workflow), policy-as-code (semgrep/gitleaks) is incremental and testable.

6) Strategic Recommendation (Option 4 – Evidence-Based Hybrid)
- Keep: CDI, Node/Express, vanilla frontend, current APIs.
- Add:
  - Multi-agent seams: model agents as StepQueue steps with strict evidence outputs per step; optional orchestration “MCA spec” file to track state/inputs/decisions.
  - Chat interaction: vanilla JS UI under /public + SSE; server endpoints to persist conversation threads mapped to clarify/pause/resume.
  - Trust and compliance spine: CycloneDX 1.6 (or both spdx+cyclonedx), SLSA provenance via CI, SIEM-friendly logs (action JSONL), policy-as-code scanning and secrets checks.
- Deprecate or defer: Any Python/React first approaches; message bus by default (keep optional), Graph QL/gRPC until justified.

7) Phased Implementation Plan (CDI-aligned)
- Phase T0 – Trust Spine vNext (no API breaks)
  - Deliverables: CycloneDX SBOM alongside existing; RFC 9457 Problem Details responses; SIEM-friendly `.telemetry/ai_actions.jsonl` stream; minimal compliance mapping stub.
  - Evidence: SBOM file(s); sample Problem Details; log samples; contract note + lint/type/tests pass.

- Phase M1 – Multi-Agent Seams (inside Node)
  - Deliverables: New StepQueue step types for RA/AA/SA/IA/QA/DBA/DA; payload schemas; evidence outputs per step (e.g., ADRs, risk notes, validation results).
  - Evidence: step plan + workflow checkpoint entries; artifacts under `.automation/fixtures/<project>/`.

- Phase U1 – Chat Interaction (vanilla)
  - Deliverables: SSE chat stream; `/api/chat` posts; simple chat panel in `/public` wired to clarify/pause/resume; updated tests.
  - Evidence: screenshots, logs, passing UI tests.

- Phase C1 – Compliance & Policy Gates
  - Deliverables: opt-in semgrep/gitleaks tasks; basic ASVS/LLM Top-10 mapping doc; Go/No-Go checklist; provenance job in CI.
  - Evidence: scan outputs; mapping doc; attestation artifact; tests.

Notes on Dependencies
- No new runtime dependencies unless justified per win and contract. Keep optional backends behind flags and maintain inline defaults to avoid drift.

Risks & Mitigations
- Scope creep from research docs → Gate work via CDI contracts and win-sized tasks with evidence.
- Pressure to adopt React → Ship vanilla chat first; propose a formal RFC to change the frontend stack later if still needed.
- Operational overhead → Keep defaults inline (no MQ by default); only enable advanced backends via explicit contract and justification.

Immediate Next Steps (1–2 weeks)
- Validate Contract 16 tasks and finish pause/accessibility wins.
- Author a “Trust Spine vNext” contract (Phase T0) to add CycloneDX output and RFC 9457 errors without breaking APIs.
- Draft StepQueue agent step schemas and an MCA spec template under `.automation` for state/evidence indexing (docs only to start).
- Spike a minimal vanilla chat panel using existing progress endpoints; define `/api/chat` payloads and persistence (no frameworks).

Appendix A – Mapping research → CDI
- MCA gate checks → enrich our evidence bundles; add `GATES_LEDGER.md` & `EVIDENCE_LOG.md` only if approved.
- SSOT v1.2 67 functions → keep as checklist; implement within Node toolchain and CDI evidence outputs.
- Taxonomy‑2 advanced features → classify as P2/P3 future phases gated by stack approvals.

Artifacts
- JSON summary: .automation/phase18_f500_pivot_analysis.json

