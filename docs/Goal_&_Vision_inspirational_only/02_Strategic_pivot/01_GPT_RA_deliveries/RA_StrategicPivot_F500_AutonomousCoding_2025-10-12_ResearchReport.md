# Research Report: Fortune 500 Autonomous Coding System (Strategic Pivot)
Brief ID: StrategicPivot_F500_AutonomousCoding | Date: 2025-10-12 | RA: v2.1 | Recipients: AA / SA / DA

## Executive Summary
- **Primary recommendation (Option 4 – Evidence‑Based Hybrid)** with **MEDIUM** confidence pending budget & decision window. Combine MCA‑coordinated multi‑agent orchestration, SSOT v1.2 taxonomy, and CDI contracts; add human‑in‑the‑loop chat gates and supply‑chain hardening.
- Why: Multi‑agent patterns improve task success; CDI + MCA enforce verifiable gates; hybrid approach resolves roadmap conflicts while keeping the current stack and contracts.

## Scope & Constraints
- **Scope:** Decide path to a Fortune‑500‑grade autonomous coding system from current single‑executor MVP.
- **Stack constraints:** TypeScript/JavaScript only; Node 20; Express; no Python; repo guardrails & CDI validation.
- **Non‑negotiables:** Rule #1 Quality>Speed; maintain CDI and rigorous validation; human approvals at gates.
- **Missing for full decision:** Budget envelope, decision deadline. (Edge‑Case: Gate‑3 TCO → parametric only.)

## Options (4)
### Option 1 — Continue Current Contracts (Incremental, single‑executor)
- **Description:** Finish validating/executing contracts 14, 14b, 15, 16; keep single agent; fix issues as found.
- **Security & Compliance:** Meets current CDI checks; gaps vs ASVS v5.0 (broader controls), SLSA v1.0 provenance, CycloneDX 1.6 SBOM, ISO 42001 governance. EU AI Act readiness partial.
- **Performance & Cost (3‑yr TCO – parametric):** Staff‑heavy overhead from manual interventions; minimal orchestration cost; no infra re‑platforming.
- **Risks:** HIGH — architectural ceiling (single agent), limited observability and approvals; slower path to F500.
- **Authoritative Sources:** Internal CDI & repo docs; OWASP ASVS v5.0; SLSA 1.0; CycloneDX 1.6; NIST CSF 2.0; ISO 42001; EU AI Act.

### Option 2 — Adopt Research Roadmaps Adapted to CDI (SSOT v1.2 + MCA + curated items)
- **Description:** Use **SSOT v1.2** as taxonomy baseline; reconcile conflicts from other docs; implement **MCA** orchestration & evidence bundles; keep TS stack.
- **Security & Compliance:** Strong mapping potential (ASVS v5.0, LLM Top 10 2025, NIST CSF 2.0, SSDF/218A, ISO 42001, EU AI Act). Requires adding SLSA v1.0 provenance + CycloneDX 1.6.
- **Performance & Cost:** Moderate lift; reusable evidence paths; improved throughput via specialization; modest infra.
- **Risks:** MEDIUM — reconciliation effort; governance setup; needs tight scope control.
- **Authoritative Sources:** SSOT v1.2, MCA prompt, CDI Infra, standards listed below.

### Option 3 — Reactive Fix‑As‑You‑Go + Enhancements
- **Description:** Stay reactive but add: (a) user‑agent chat checkpoints, (b) dependency upgrades, (c) thin specialized agent layer under current executor.
- **Security & Compliance:** Better transparency & controls than Option 1 but ad‑hoc; risk of drift without MCA.
- **Performance & Cost:** Lowest short‑term cost; long‑term operational drag; success depends on discipline.
- **Risks:** MEDIUM‑HIGH — entropy, unclear end‑state, potential rework.

### Option 4 — Evidence‑Based Hybrid (Recommended)
- **Description:** Merge **MCA‑coordinated multi‑agent** orchestration with **SSOT v1.2** taxonomy and **CDI contracts**. Add **human‑in‑the‑loop chat** at gates (G1, G4), and **supply‑chain hardening** (CycloneDX 1.6 SBOM + SLSA v1.0 provenance). Keep TS/Node stack.
- **Security & Compliance:** Best alignment across ASVS v5.0 / LLM Top‑10 (2025) / NIST CSF 2.0 / SSDF (SP 800‑218A) / ISO 42001 / EU AI Act.
- **Performance & Cost:** Balanced; orchestration overhead offset by higher first‑pass quality; reusable evidence bundles.
- **Risks:** MEDIUM — orchestration complexity; mitigated by MCA gates and discovery‑first contracts.
- **Authoritative Sources:** SSOT v1.2; MCA; LangGraph/Crew‑style multi‑agent docs; MoA/ChatDev research; standards below.

## Comparative Matrix
(See attached CSV.)

## Primary Recommendation
**Adopt Option 4 — Evidence‑Based Hybrid.**
**Rationale:** It resolves taxonomy/contract conflicts, preserves the stack, institutionalizes evidence & governance, and uses multi‑agent specialization where literature shows quality gains. Confidence: **MEDIUM** pending budget window and TCO inputs.

### 7‑Step Implementation Roadmap (owners & acceptance)
1) **MCA bootstrap (MCA)** — Create MCA Orchestration Spec + state files; wire GATES_LEDGER; add CycloneDX 1.6 & SLSA 1.0 checks to CI. *Accept:* Spec + CI passing + SBOM + provenance artifacts.
2) **Taxonomy baseline (RA→AA)** — Freeze SSOT v1.2 subset for MVP (P1 items only); log deferred items. *Accept:* TECH_SPEC.md updated; diff log.
3) **Agent split (AA/IA)** — Refactor executor into **Planner / Implementer / QA** agents with deterministic state machine. *Accept:* Orchestration tests ≥ 90% pass; overhead < 500ms/transition.
4) **Chat gates (Product/QA)** — Insert human‑approval checkpoints at G1 (design) & G4 (security). *Accept:* Audit trail shows approvals; SLA < 2h response.
5) **Supply‑chain hardening (DA/SA)** — Emit CycloneDX 1.6 SBOM + SLSA v1.0 provenance; sign artifacts. *Accept:* Artifacts attached per release; zero critical vulns.
6) **Observability & rollback (DA)** — Structured execution_trace, budget alerts, rollback plan. *Accept:* Dashboards + drills; MTTR target defined.
7) **Pilot & calibrate (MCA)** — Time‑boxed pilot; success thresholds; rollback plan. *Accept:* KPI met; DecisionRecord updated.

## Evidence & Traceability
- **DecisionRecord JSON:** Attached (see file).
- **Source Log (titles/publishers/dates/URLs):** Included in DecisionRecord.
- **Assumptions:** No budget/decision window → parametric TCO only; EU‑region pinning required for training restrictions.

