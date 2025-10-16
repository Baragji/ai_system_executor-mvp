# Phase 19/20 Transition Audit Revalidation — 2025-10-13

## Scope
This memo re-validates the "01_Consolidation_Phase 19_Transition_Audit" findings against the live repository, summarizes deviations, and reconciles the follow-up plan "02_Consolidation_Phase 19_and_20_Transition_Audit" with current requirements. A brief regulatory refresh on RFC 9457 accompanies the review.

## 1. Implementation Reality Check
- **Feature-flagged LangGraph path exists:** `AGENTS_RUNTIME` selects the adapter, returning `202 Accepted` and a `Location` header when LangGraph is enabled.【F:src/orchestrator/adapter.ts†L22-L97】
- **Graph stub and execution store wired:** The stub registers executions, emits telemetry, and completes them asynchronously via the new in-memory store.【F:src/orchestrator/graph.ts†L27-L55】【F:src/orchestrator/executionsStore.ts†L1-L65】
- **Status API + tests shipped:** `/api/executions/:id` exposes execution records and is covered by integration tests validating the 202→poll flow.【F:src/server.ts†L426-L435】【F:tests/api/executions.test.ts†L1-L42】
- **Discovery artifacts present:** Phase 19 and 20 discovery notes live under `.automation/`, matching the audit narrative.【F:.automation/phase20_langgraph_exec_discovery_note.md†L1-L69】

**Verdict:** Audit #01 correctly states that Phases 19/20 implementation work is already underway and feature-flagged.

## 2. Governance & Compliance Gaps
- **AGENTS.md drift:** File still claims 2025-10-08 as "Last Updated" and lacks the runtime/telemetry flags referenced by the code and audits.【F:AGENTS.md†L1-L95】
- **CDI_INFRASTRUCTURE.md drift:** "Current Phase" remains at "A" despite active Phase 19/20 execution.【F:CDI_INFRASTRUCTURE.md†L1-L189】
- **Contract coverage:** No Phase 19/20 contracts exist yet, so automation cannot record milestone gates (implicit from repository structure; noted for action).
- **Compliance automation failure:** The latest contract compliance report shows every requirement unresolved because validation commands were never executed, matching the audit's "manual evidence required" finding.【F:.automation/contract_compliance_report.json†L1-L90】

**Verdict:** Governance/documentation lag highlighted in Audit #01 is accurate and remains unresolved.

## 3. RFC 9457 (Problem Details) — Regulatory Refresh
- RFC 9457 standardizes `application/problem+json` payloads and obsoletes RFC 7807.【6f5104†L1-L40】
- The registered `about:blank` type requires the title to mirror the HTTP reason phrase (e.g., "Not Found" for 404).【77e883†L1-L17】
- Extension members (custom fields) must use names that are valid XML Name tokens to support alternate encodings, reinforcing the audit's caution against colon-delimited keys.【75e46a†L1-L18】

**Implication:** The server helper should default to RFC-compliant titles, avoid colonized extension keys (e.g., `urn:ts`), and provide structured validation errors—aligning with both audits' recommendations.

## 4. Assessment of Final Plan (Audit #02)
Audit #02 expands the earlier guidance by mandating:
1. **Immediate Trust Spine completion** (CycloneDX SBOM, SLSA provenance, JSONL action logs, OTel traces, RFC 9457 fixes).
2. **Documentation & contract updates** (feature flag sections, current phase, contract naming standard).

Given the repo state:
- Trust Spine T0 items are still pending—no CycloneDX/SLSA tooling or JSONL dual-write exists yet—so prioritizing them avoids further drift.【F:AGENTS.md†L1-L95】【F:CDI_INFRASTRUCTURE.md†L1-L189】
- Contracts for phases 19/20 remain absent, leaving automation blind to active work (confirmed in Section 2).
- Enabling RFC 9457 by default in non-prod is low risk: the middleware already exists and tests can be extended to cover both shapes.【F:src/middleware/problemDetails.ts†L1-L200】

**Verdict:** The final plan is realistic, sequencing governance catch-up and Trust Spine hardening before layering HITL/MCP scope. Approving it aligns delivery with the audit evidence and regulatory expectations.

## 5. Recommendation
Approve the auditor's directive to proceed with:
1. Authoring Phase 19/20 contracts and updating AGENTS/CDI_INFRASTRUCTURE to reflect active feature flags and Trust Spine requirements.
2. Implementing the Trust Spine artifacts (CycloneDX SBOM, SLSA provenance, JSONL action logs, default-on RFC 9457 in non-prod, and initial OTel bootstrap) to satisfy Gate G2.

This keeps runtime changes behind existing feature flags while restoring contract governance and evidence fidelity ahead of the production transition.
