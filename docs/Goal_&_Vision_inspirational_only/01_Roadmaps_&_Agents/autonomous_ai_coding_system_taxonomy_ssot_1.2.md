# Autonomous AI Coding System — Taxonomy (SSOT v1.2)

Owner: Yousef Baragji  
Status: Production‑ready taxonomy  
Version: 1.2 (reconciles gates, clarifies priority, fixes JSON export)  
Date: 2025‑09‑30 (Europe/Amsterdam)

---

Purpose
- Single‑source taxonomy of functions for the autonomous AI coding system. Aligned with gates G0–G8 and canonical evidence paths.  
- This v1.2 supersedes v1.1 without changing function scope; it clarifies priority labeling, fixes JSON example validity, and aligns evidence paths with the reconciled roadmap v2.

Priority vs Phase
- Interpret the former “Phase” values (P1/P2/P3) as Priority levels:  
  - Required = P1 (must‑have for MVP)  
  - Enhanced = P2 (post‑MVP improvements)  
  - Advanced = P3 (future iterations)  
- Time‑sequencing is defined by the roadmap phases (Phase 0–6). This taxonomy stays time‑agnostic.

Gates
- Gate range is standardized to G0–G8. Where v1.1 mentioned G0–G8 already, v1.2 keeps that scope and aligns names to roadmap v2.

Canonical Evidence Paths (extract)
- Static checks: `evidence/static_checks/{ruff|mypy|bandit|semgrep}.txt`  
- Secrets: `evidence/secrets_scan/gitleaks.txt`  
- SBOM: `sbom/SBOM.json`  
- Release controls: `evidence/release/branch_protection.md`  
- KPI/Go‑No‑Go: `metrics/kpi/*.csv`, `go_nogo/criteria.md`, `go_nogo/phase_report.md`  
- FinOps: `policies/finops.yaml`, `metrics/cost/budget_report.csv`, `metrics/cost/budget_alerts.csv`  
- SIEM/audit: `logs/ai_actions/*.jsonl`, `siem/parsers/*.conf`, `siem/retention_policy.md`  
- Recovery: `recovery/correlation_matrix.csv`, `recovery/mc_log_timeline.md`, `recovery/candidates.csv`

Master Taxonomy (Full)
- The following table lists all 67 functions. P1/P2/P3 from v1.1 are mapped to Priority (Required/Enhanced/Advanced).

| # | Function | Priority | Standards/Tools | Evidence Artifacts | Gate |
|---:|---|---|---|---|---|
| 1 | Natural Language → Code | Required | LLM runtime; prompt templates | `prompts/req_ingest.md`; `sessions/*.log` | G1 |
| 2 | Multi‑language Code Generation | Required | Codegen libs; scaffolds | `generated/**`; `build_logs/*.md` | G2 |
| 3 | Project Type Detection | Required | Heuristics; repo parsers | `detection/report.md` | G1 |
| 4 | Architecture Decision Making | Required | ADR template | `docs/ADRs/ADR-*.md` | G1 |
| 5 | Task Decomposition | Required | Planner loop | `plan/WORK_BREAKDOWN.md`; `tests/acceptance/*` | G1 |
| 6 | Dependency & Version Mgmt | Required | uv/pip‑compile/npm/pnpm | `requirements.lock`; `pnpm-lock.yaml` | G2 |
| 7 | Package Reality Verification | Required | custom verifier | `evidence/pkg_reality_report.md` | G2 |
| 8 | Static Code Analysis | Required | ruff; mypy; bandit; semgrep | `evidence/static_checks/*.txt` | G2 |
| 9 | Secrets Detection | Required | gitleaks; trufflehog | `evidence/secrets_scan/*.txt` | G2 |
| 10 | Vuln/Deps Scanning | Required | pip‑audit; CycloneDX | `sbom/SBOM.json` | G3 |
| 11 | Code Quality Scoring | Required | composite scoring | `evidence/quality_score.json` | G3 |
| 12 | Test Gen & Execution | Required | pytest; playwright | `reports/tests/*.xml` | G3 |
| 13 | Coverage Enforcement | Required | coverage.py | `coverage/coverage.xml` | G3 |
| 14 | Property‑based & Mutation | Required | hypothesis; mutmut | `mutation/mutmut_report.txt` | G3 |
| 15 | Performance Benchmarking | Enhanced | bench scripts | `perf/benchmarks.md` | G4 |
| 16 | Technical Debt Detection | Required | radon/xenon; jscpd | `evidence/complexity/*.txt` | G3 |
| 17 | Persistent Context Preservation | Required | state store | `state/context/*.json` | G1 |
| 18 | Machine‑Digestible Context (MDC) | Required | MDC rules | `state/mdc/*.json` | G1 |
| 19 | Temporal Knowledge Graph | Enhanced | KG builder | `state/tkg/*.json` | G4 |
| 20 | Cross‑Project Learning | Advanced | privacy guard | `state/transfer/*.json` | G5 |
| 21 | Session State Management | Required | session logs | `sessions/*.log` | G1 |
| 22 | Multi‑Agent Coordination | Required | Orchestrator | `orchestration/graph.yaml` | G2 |
| 23 | Workflow State Management | Required | Redis/KV | `state/run/*` | G2 |
| 24 | Thin Internal Orchestrator (policy/routing/caps) | Required | LangGraph/LiteLLM/LiteGuard | `orchestration/policy_router.py`; `policies/runtime/*.yaml`; `metrics/cost/caps.yaml` | G2 |
| 25 | Human Approval Checkpoints | Required | approval hooks | `evidence/approvals/*.json` | G2 |
| 26 | Error Recovery & Self‑Correction | Required | strategy | `evidence/recovery/*.md` | G3 |
| 27 | Iterative Refinement | Required | loop controller | `evidence/loops/*.log` | G2 |
| 28 | Digital Immune System | Enhanced | policy‑as‑code | `evidence/immune/*.json` | G4 |
| 29 | Policy‑as‑Code Enforcement | Required | semgrep/rules | `policies/*.yaml` | G3 |
| 30 | SBOM Generation | Required | cyclonedx | `sbom/SBOM.json` | G3 |
| 31 | Supply Chain Security | Required | attestations | `provenance/*.intoto.jsonl` | G4 |
| 32 | Compliance Validation | Required | mapping docs | `docs/compliance/*.md` | G4 |
| 33 | Data Residency & Vendor Policy | Required | provider cfgs | `evidence/vendor_policy/*.md` | G4 |
| 34 | Build‑vs‑Buy Decision Engine | Required | research package | `research/ComparativeMatrix.csv`; `research/DecisionRecord.json`; `research/RACI.md` | G1 |
| 35 | IDE Integration | Enhanced | extensions | `docs/ide_setup.md` | G3 |
| 36 | Git Integration | Required | git hooks | `evidence/git/*.md` | G2 |
| 37 | CI/CD Integration | Required | GH Actions | `.github/workflows/*.yml` | G3 |
| 38 | Containerization | Required | docker; k8s | `deploy/*` | G4 |
| 39 | Multi‑Env Support | Required | env cfg | `env/*.yaml` | G3 |
| 40 | Environment Fingerprinting | Required | fingerprint tool | `evidence/env/env_fingerprint.json` | G2 |
| 41 | Architectural Pattern Recognition | Enhanced | analyzers | `evidence/arch/patterns.md` | G4 |
| 42 | Refactoring Recommendations | Enhanced | refactor bot | `evidence/refactor/*.md` | G4 |
| 43 | Documentation Generation | Required | OpenAPI; docstrings | `docs/api/openapi.yaml` | G3 |
| 44 | Specification Clarification | Required | planner prompts | `docs/spec/questions.md` | G2 |
| 45 | Strategic Dev Consultation | Enhanced | advisor agent | `docs/strategy/*.md` | G4 |
| 46 | Real‑time Performance Monitoring | Enhanced | metrics stack | `metrics/*.md` | G4 |
| 47 | KPI Instrumentation & Go/No‑Go | Required | KPI collectors; gate rules | `metrics/kpi/*.csv`; `go_nogo/criteria.md`; `go_nogo/phase_report.md` | G3 |
| 48 | Cost Tracking & Optimization | Required | cost trackers | `metrics/cost/*.csv` | G3 |
| 49 | Quality Metrics Dashboard | Enhanced | dashboard | `metrics/quality/*.csv` | G4 |
| 50 | Error Tracking & Alerting | Enhanced | Sentry/etc. | `metrics/errors/*.md` | G4 |
| 51 | Usage Analytics | Enhanced | analytics | `metrics/usage/*.csv` | G4 |
| 52 | Notifications & Webhooks | Required | WS server; webhooks | `notifications/delivery_log.csv` | G3 |
| 53 | AI Action Logs → SIEM | Required | logfmt/jsonl/SIEM | `logs/ai_actions/*.jsonl`; `siem/parsers/*.conf`; `siem/retention_policy.md` | G4 |
| 54 | Event Bus & DLQ | Enhanced | messaging | `evidence/bus/dlq_metrics.csv` | G5 |
| 55 | Research Agent (RA) | Required | RA prompts | `handoffs/RA/*.md` | G1 |
| 56 | Architecture Agent (AA) | Required | AA toolchain | `handoffs/AA/*.md` | G1 |
| 57 | Implementation Agent (IA) | Required | IA runners | `handoffs/IA/*.md` | G2 |
| 58 | Security Agent (SA) | Required | SA rules | `handoffs/SA/*.md` | G3 |
| 59 | Quality Assurance Agent (QA) | Required | QA suites | `handoffs/QA/*.md` | G3 |
| 60 | DevOps Agent (DA) | Required | DA playbooks | `handoffs/DA/*.md` | G4 |
| 61 | Database Agent (DBA) | Required | migration tools | `handoffs/DBA/*.md` | G3 |
| 62 | Docs Agent | Required | doc toolchain | `handoffs/DOCS/*.md` | G3 |
| 63 | Atomic Stability Recovery | Enhanced | forensic scripts | `recovery/correlation_matrix.csv`; `recovery/mc_log_timeline.md`; `recovery/candidates.csv` | G5 |
| 64 | Release Controls | Required | repo rules | `evidence/release/branch_protection.md`; `merge_queue/logs.md` | G4 |
| 65 | FinOps Policy | Required | policy cfg | `policies/finops.yaml`; `metrics/cost/budget_alerts.csv` | G2 |
| 66 | Benchmark Harness & Golden Task Suite | Required | harness; runners | `benchmarks/harness/**`; `benchmarks/results.csv`; `golden_tasks/**` | G3 |
| 67 | Governance Pack Generator (ISO42001 + EU AI Act GPAI) | Required | docs/gen scripts | `governance/technical_file/**`; `governance/dpia/*.md`; `governance/control_mappings/*.csv`; `governance/privacy_attestations.md` | G4 |

JSON Export (valid example)
```json
{
  "$schema": "https://example.com/umca/taxonomy.schema.json",
  "version": "1.2",
  "generated_at": "2025-09-30T00:00:00Z",
  "items": [
    {
      "id": 24,
      "function": "Thin Internal Orchestrator (policy/routing/caps)",
      "priority": "Required",
      "standards_tools": ["LangGraph", "LiteLLM", "policy middleware"],
      "evidence_artifacts": [
        "orchestration/policy_router.py",
        "policies/runtime/*.yaml",
        "metrics/cost/caps.yaml"
      ],
      "gate": "G2"
    },
    {
      "id": 34,
      "function": "Build-vs-Buy Decision Engine",
      "priority": "Required",
      "evidence_artifacts": [
        "research/ComparativeMatrix.csv",
        "research/DecisionRecord.json",
        "research/RACI.md"
      ],
      "gate": "G1"
    },
    {
      "id": 47,
      "function": "KPI Instrumentation (DORA/SPACE) & Go/No-Go Gates",
      "priority": "Required",
      "evidence_artifacts": [
        "metrics/kpi/*.csv",
        "go_nogo/criteria.md",
        "go_nogo/phase_report.md"
      ],
      "gate": "G3"
    },
    {
      "id": 53,
      "function": "AI Action Logs → SIEM (auditability)",
      "priority": "Required",
      "evidence_artifacts": [
        "logs/ai_actions/*.jsonl",
        "siem/parsers/*.conf",
        "siem/retention_policy.md"
      ],
      "gate": "G4"
    },
    {
      "id": 66,
      "function": "Benchmark Harness & Golden Task Suite",
      "priority": "Required",
      "evidence_artifacts": [
        "benchmarks/harness/**",
        "benchmarks/results.csv",
        "golden_tasks/**"
      ],
      "gate": "G3"
    }
  ]
}
```

Implementation Notes
- Use the reconciled roadmap v2 for sequencing. This taxonomy defines the “what” and “proof,” while the roadmap defines the “how” and “when.”

End of File
