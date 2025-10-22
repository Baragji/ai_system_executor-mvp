# Evidence Log (Template) — Phase 19

- **Run ID**: {commit_sha} / {build_number}
- **Date**: 2025-10-12

## G2 — Trust-Spine
- SBOM: `.automation/evidence/G2/sbom.cdx.json` — checksum: {sha256}
- Provenance: `.automation/evidence/G2/provenance.intoto.jsonl`
- OTel export: `.automation/evidence/G2/otel_trace_export.json`
- Action logs: `.automation/evidence/G2/actions.jsonl`
- RFC 9457 errors: `.automation/evidence/G2/errors_rfc9457.jsonl`

## G3 — Orchestrator Pilot
- Parity tests: `.automation/evidence/G3/parity_tests.report.json`
- Deterministic sequence: `.automation/evidence/G3/deterministic_sequence.json`
- Coverage: `.automation/evidence/G3/coverage_orchestrator.json`
- Perf budget: `.automation/evidence/G3/perf_budget.csv`

## G4 — HITL + MCP
- HITL transcript: `.automation/evidence/G4/hitl_transcript.jsonl`
- MCP allow-list: `.automation/evidence/G4/mcp_policy.json`
- Tool audit: `.automation/evidence/G4/tool_audit.jsonl`
- Security scan: `.automation/evidence/G4/security_scan.report.json`
