# Handoff Package — AA / SA / DA

## AA (Architecture)
- Inputs: DecisionRecord JSON, Comparative Matrix CSV, SSOT v1.2 subset, MCA Orchestration Spec (to be created).
- Integration Notes: Split executor into Planner / Implementer / QA agents; deterministic state machine; keep Node/TS and Express.
- Acceptance: Overhead < 500ms/transition; 90%+ orchestration tests.

## SA (Security)
- Mapping: ASVS v5.0 controls (focus: V1, V5, V9, V12), OWASP LLM Top‑10 (2025), NIST CSF 2.0 functions, SSDF SP 800‑218/218A tasks.
- Supply Chain: Emit CycloneDX 1.6 SBOM; SLSA v1.0 provenance attestation each build; policy for dependency upgrades.
- Monitoring: Secrets scan, SAST, dependency audit, SIEM fields for agent actions.

## DA (DevOps)
- CI/CD: Add SBOM (CycloneDX 1.6) + SLSA provenance steps; sign artifacts; store in evidence bundle.
- Observability: execution_trace.jsonl schema, budget alerts, dashboards; rollback playbooks.
- DR: Checkpoint store for agent orchestration; backup/restore test.

