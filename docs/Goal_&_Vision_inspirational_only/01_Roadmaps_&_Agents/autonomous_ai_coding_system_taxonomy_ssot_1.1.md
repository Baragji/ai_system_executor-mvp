# [DEPRECATED] Autonomous AI Coding System — Taxonomy (SSOT v1.1)

Note: This file is superseded by `autonomous_ai_coding_system_taxonomy_ssot_v1.2.md` (full, reconciled, standalone). Use v1.2 for all planning and evidence mapping. This file remains for historical reference.

**Owner:** Yousef Baragji  
**Status:** Production‑ready taxonomy  
**Version:** 1.1 (adds Research‑package deltas)  
**Date:** 2025‑09‑29 (Europe/Amsterdam)

---

## Purpose
Single‑source, copy‑pasteable taxonomy of functions for the autonomous AI coding system. Structured to align with SSOT gates (G0–G8), phases (P0–P6/Delivery), and evidence packages. All entries list **Function → Subfunctions → Phase → Standards/Tools → Evidence Artifacts → Gate**.

> **Artifact naming:** Names below match emitted files from procedures (e.g., `correlation_matrix.csv`, `mc_log_timeline.md`). Where a JSON aggregation exists, it’s noted as a *normalized export*.

---

## Section Map
1. Master Taxonomy Table (concise)  
2. Domain Breakdowns (expanded)  
3. Evidence Packages & File Naming  
4. CSV Export (copy‑paste)  
5. JSON Export Schema (machine‑readable)  
6. Implementation Roadmap (P1/P2 focus)  
7. Glossary

---

## 1) Master Taxonomy Table (Concise)

| # | Function | Subfunctions (examples) | Phase | Standards / Tools | Evidence Artifacts (examples) | Gate |
|---:|---|---|---:|---|---|---|
| 1 | **Natural Language → Code** | NL→code prompts; requirements ingestion | P1 | LLM runtime; prompt templates | `prompts/req_ingest.md`; `sessions/*.log` | G1 |
| 2 | **Multi‑language Code Generation** | 20+ langs/frameworks; templates | P1 | Codegen libs; scaffolds | `generated/**`; `build_logs/*.md` | G2 |
| 3 | **Project Type Detection** | FastAPI/Flask/CLI/etc. | P1 | Heuristics; repo parsers | `detection/report.md` | G1 |
| 4 | **Architecture Decision Making** | Stack & pattern selection; ADRs | P1 | ADR template | `docs/ADRs/ADR-*.md` | G1 |
| 5 | **Task Decomposition** | Epics→stories→microtasks; acceptance tests | P1 | Planner loop | `plan/WORK_BREAKDOWN.md`; `tests/acceptance/*` | G1 |
| 6 | **Dependency & Version Mgmt** | Resolution; pinning; upgrades | P1 | uv/pip‑compile/npm/pnpm | `requirements.lock`; `pnpm-lock.yaml` | G2 |
| 7 | **Package Reality Verification** | Detect ghost/retired deps | P1 | custom verifier | `evidence/pkg_reality_report.md` | G2 |
| 8 | **Static Code Analysis** | Lint/type/security | P1 | Ruff, MyPy, Bandit, Semgrep | `evidence/static_checks/*.txt` | G2 |
| 9 | **Secrets Detection** | Pre‑commit + CI | P1 | gitleaks, trufflehog | `evidence/secrets_scan/*.txt` | G2 |
| 10 | **Vuln/Deps Scanning** | SBOM/audit | P1 | pip‑audit, CycloneDX | `sbom/SBOM.json` | G3 |
| 11 | **Code Quality Scoring** | thresholds | P1 | composite scoring | `evidence/quality_score.json` | G3 |
| 12 | **Test Gen & Execution** | unit/integration/e2e | P1 | pytest, playwright, etc. | `reports/tests/*.xml` | G3 |
| 13 | **Coverage Enforcement** | min thresholds | P1 | coverage.py | `coverage/coverage.xml` | G3 |
| 14 | **Property‑based & Mutation** | Hypothesis; mutmut | P1 | hypothesis, mutmut | `mutation/mutmut_report.txt` | G3 |
| 15 | **Performance Benchmarking** | latency/throughput | P2 | bench scripts | `perf/benchmarks.md` | G4 |
| 16 | **Technical Debt Detection** | clones/complexity | P1 | radon/xenon, jscpd | `evidence/complexity/*.txt` | G3 |
| 17 | **Persistent Context Preservation** | project state | P1 | state store | `state/context/*.json` | G1 |
| 18 | **Machine‑Digestible Context (MDC)** | schema’d context | P1 | MDC rules | `state/mdc/*.json` | G1 |
| 19 | **Temporal Knowledge Graph** | code evolution | P2 | KG builder | `state/tkg/*.json` | G4 |
| 20 | **Cross‑Project Learning** | transfer learning | P3 | privacy guard | `state/transfer/*.json` | G5 |
| 21 | **Session State Management** | resume work | P1 | session logs | `sessions/*.log` | G1 |
| 22 | **Multi‑Agent Coordination** | RA/AA/IA/QA/SA/DBA/DA/FOPS | P1 | Orchestrator | `orchestration/graph.yaml` | G2 |
| 23 | **Workflow State Management** | phases, retries | P1 | Redis/KV | `state/run/*` | G2 |
| 24 | **Thin Internal Orchestrator (policy/routing/caps)** | agent routing (Copilot vs Q); **time/cost caps**; policy engine; NFR hint injection; action‑log sink | P1 | LangGraph/LiteLLM/LiteGuard; policy middleware | `orchestration/policy_router.py`; `policies/runtime/*.yaml`; `metrics/cost/caps.yaml` | G2 |
| 25 | **Human Approval Checkpoints** | interrupts/approvals | P1 | approval hooks | `evidence/approvals/*.json` | G2 |
| 26 | **Error Recovery & Self‑Correction** | retries/rollback | P1 | strategy | `evidence/recovery/*.md` | G3 |
| 27 | **Iterative Refinement** | plan→code→critique loops | P1 | loop controller | `evidence/loops/*.log` | G2 |
| 28 | **Digital Immune System** | proactive threat detect | P2 | policy‑as‑code | `evidence/immune/*.json` | G4 |
| 29 | **Policy‑as‑Code Enforcement** | security policies | P1 | semgrep/rules | `policies/*.yaml` | G3 |
| 30 | **SBOM Generation** | CycloneDX | P1 | cyclonedx | `sbom/SBOM.json` | G3 |
| 31 | **Supply Chain Security** | SLSA provenance | P1 | attestations | `provenance/*.intoto.jsonl` | G4 |
| 32 | **Compliance Validation** | OWASP/NIST/ISO/EU AI Act | P1 | mapping docs | `docs/compliance/*.md` | G4 |
| 33 | **Data Residency & Vendor Policy** | EU pinning; no‑training; logs off | P1 | provider cfgs | `evidence/vendor_policy/*.md` | G4 |
| 34 | **Build‑vs‑Buy Decision Engine** | decision tree; **ComparativeMatrix.csv**; **DecisionRecord.json**; owners/RACI; acceptance criteria | P1 | research package templates | `research/ComparativeMatrix.csv`; `research/DecisionRecord.json`; `research/RACI.md` | G1 |
| 35 | **IDE Integration** | VS Code/JetBrains | P2 | extensions | `docs/ide_setup.md` | G3 |
| 36 | **Git Integration** | commits/branching | P1 | git hooks | `evidence/git/*.md` | G2 |
| 37 | **CI/CD Integration** | tests/deploy | P1 | GH Actions | `.github/workflows/*.yml` | G3 |
| 38 | **Containerization** | Docker→K8s | P1 | docker/k8s | `deploy/*` | G4 |
| 39 | **Multi‑Env Support** | dev/stage/prod | P1 | env cfg | `env/*.yaml` | G3 |
| 40 | **Environment Fingerprinting** | capture/replicate/hash | P1 | fingerprint tool | `evidence/env/env_fingerprint.json` | G2 |
| 41 | **Architectural Pattern Recognition** | DDD, hexagonal, etc. | P2 | analyzers | `evidence/arch/patterns.md` | G4 |
| 42 | **Refactoring Recommendations** | automated suggestions | P2 | refactor bot | `evidence/refactor/*.md` | G4 |
| 43 | **Documentation Generation** | API docs/comments | P1 | OpenAPI/docstrings | `docs/api/openapi.yaml` | G3 |
| 44 | **Specification Clarification** | Socratic Q/A | P1 | planner prompts | `docs/spec/questions.md` | G2 |
| 45 | **Strategic Dev Consultation** | high‑level guidance | P2 | advisor agent | `docs/strategy/*.md` | G4 |
| 46 | **Real‑time Performance Monitoring** | health/metrics | P2 | metrics stack | `metrics/*.md` | G4 |
| 47 | **KPI Instrumentation (DORA/SPACE) & Go/No‑Go Gates** | lead time; review cycle; MTTR; defect escape; **phase Go/No‑Go criteria** | P1 | KPI collectors; gate rules | `metrics/kpi/*.csv`; `go_nogo/criteria.md`; `go_nogo/phase_report.md` | G3 |
| 48 | **Cost Tracking & Optimization** | token/cost | P1 | cost trackers | `metrics/cost/*.csv` | G3 |
| 49 | **Quality Metrics Dashboard** | score trends | P2 | dashboard | `metrics/quality/*.csv` | G4 |
| 50 | **Error Tracking & Alerting** | exceptions | P2 | Sentry/etc. | `metrics/errors/*.md` | G4 |
| 51 | **Usage Analytics** | feature usage | P2 | analytics | `metrics/usage/*.csv` | G4 |
| 52 | **Notifications & Webhooks** | WS progress; Slack/Discord; email/desktop; gate pings | P1 | WS server; webhooks | `notifications/delivery_log.csv` | G3 |
| 53 | **AI Action Logs → SIEM (auditability)** | structured AI action logs; retention policy; SIEM parsers; ISO 42001/EU AI Act trails | P1 | logfmt/jsonl; SIEM | `logs/ai_actions/*.jsonl`; `siem/parsers/*.conf`; `siem/retention_policy.md` | G4 |
| 54 | **Event Bus & DLQ** | Kafka/RabbitMQ; DLQ/retry/replay | P2 | messaging | `evidence/bus/dlq_metrics.csv` | G5 |
| 55 | **Research Agent (RA)** | requirements; tech scans | P1 | RA prompts | `handoffs/RA/*.md` | G1 |
| 56 | **Architecture Agent (AA)** | system design; ADRs | P1 | AA toolchain | `handoffs/AA/*.md` | G1 |
| 57 | **Implementation Agent (IA)** | code gen/dev | P1 | IA runners | `handoffs/IA/*.md` | G2 |
| 58 | **Security Agent (SA)** | SAST/SBOM/chaos | P1 | SA rules | `handoffs/SA/*.md` | G3 |
| 59 | **Quality Assurance Agent (QA)** | tests/validation | P1 | QA suites | `handoffs/QA/*.md` | G3 |
| 60 | **DevOps Agent (DA)** | CI/CD/infra/release | P1 | DA playbooks | `handoffs/DA/*.md` | G4 |
| 61 | **Database Agent (DBA)** | schema/migrations | P1 | migration tools | `handoffs/DBA/*.md` | G3 |
| 62 | **Docs Agent** | READMEs/ADRs/compliance | P1 | doc toolchain | `handoffs/DOCS/*.md` | G3 |
| 63 | **Atomic Stability Recovery** | commit↔MC log correlation; shortlist; zero‑trust validate | P2 | forensic scripts | `recovery/correlation_matrix.csv`; `recovery/mc_log_timeline.md`; `recovery/candidates.csv` | G5 |
| 64 | **Release Controls** | protected branches; merge queue; auto‑revert | P1 | repo rules | `evidence/release/branch_protection.md`; `merge_queue/logs.md` | G4 |
| 65 | **FinOps Policy** | per‑phase € caps; token ceilings; 80% alerts | P1 | policy cfg | `policies/finops.yaml`; `metrics/cost/budget_alerts.csv` | G2 |
| 66 | **Benchmark Harness & Golden Task Suite** | internal **SWE‑bench‑style harness**; per‑language golden tasks; pass‑rate targets (≥70% Verified‑like; ≥95% golden) | P1 | harness; runners | `benchmarks/harness/**`; `benchmarks/results.csv`; `golden_tasks/**` | G3 |
| 67 | **Governance Pack Generator (ISO 42001 + EU AI Act GPAI)** | technical file assembly; DPIA templates; ASVS/SSDF control mappings; privacy mode attestations; **zero‑retention/EU processing** configs | P1 | docs/gen scripts | `governance/technical_file/**`; `governance/dpia/*.md`; `governance/control_mappings/*.csv`; `governance/privacy_attestations.md` | G4 |

> **Count:** 67 primary functions (each includes multiple subfunctions) — comfortably exceeds the “120+ subfunctions” target when expanded.

---

## 2) Domain Breakdowns (Expanded)

### 2.1 Core System & Planning
- **Requirements & NL→Code**: prompt packs; acceptance‑criteria extraction.  
- **Decomposition**: epics → stories → microtasks with time/complexity/resource estimates.  
- **Architecture Decisions**: ADRs with rationale/alternatives/consequences.  
- **Build‑vs‑Buy Decision Engine**: ComparativeMatrix.csv, DecisionRecord.json, RACI, acceptance criteria.

### 2.2 Quality, Security & Compliance
- **Static Analysis & Secrets/SCA**: ruff/mypy/bandit/semgrep; gitleaks/trufflehog; SBOM; license policy.  
- **Compliance**: ASVS v5; NIST CSF/SSDF; ISO/IEC 42001; EU AI Act GPAI posture.  
- **Governance Pack Generator**: technical file, DPIAs, control mappings, privacy attestations.

### 2.3 Testing & Validation
- **Unit/Integration/E2E**; coverage gates; mutation/property tests.  
- **Benchmark Harness & Golden Tasks**: internal SWE‑bench‑style harness; language‑specific golden suites; target pass‑rates.

### 2.4 Context & Knowledge
- **MDC/TKG**: schemas and temporal graphs.  
- **Evidence Chain**: commit↔log correlation and candidate stability scoring.

### 2.5 Orchestration & Runtime
- **Agents & Graph**: orchestration with interrupts; Redis/KV state.  
- **Thin Internal Orchestrator**: routing (Copilot/Q), policy engine, cost/time caps, NFR hinting, action‑log sink.  
- **Event Bus & DLQ**: Kafka/RabbitMQ with retries/quarantine/replay.

### 2.6 Delivery, Ops & Release
- **CI/CD**: Actions; environments; containerization; provenance attestations.  
- **Release Controls**: protected branches; required checks; merge queue; auto‑revert.  
- **Monitoring & KPIs**: metrics, DORA/SPACE, Go/No‑Go; action logs → SIEM; notifications; cost tracking.

---

## 3) Evidence Packages & File Naming (Canonical)

**Static analysis:**  
- `evidence/static_checks/ruff.txt`  
- `evidence/static_checks/mypy.txt`  
- `evidence/static_checks/bandit.txt`  
- `evidence/static_checks/semgrep.txt`

**Secrets & deps:**  
- `evidence/secrets_scan/gitleaks.txt`  
- `evidence/deps/pip_audit.txt`  
- `sbom/SBOM.json`  
- `licenses/licenses.csv`

**Testing & coverage:**  
- `reports/tests/junit.xml`  
- `coverage/coverage.xml`  
- `mutation/mutmut_report.txt`  
- `property_tests/hypothesis_summary.md`

**Performance & benchmarks:**  
- `perf/benchmarks.md`  
- `benchmarks/harness/**`  
- `benchmarks/results.csv`  
- `golden_tasks/**`

**Context & knowledge:**  
- `state/mdc/context.json`  
- `state/tkg/graph.json`

**Orchestration & state:**  
- `orchestration/graph.yaml`  
- `orchestration/policy_router.py`  
- `state/run/{runId}/state.json`

**Recovery:**  
- `recovery/correlation_matrix.csv`  
- `recovery/mc_log_timeline.md`  
- `recovery/candidates.csv`  
- `recovery/final_recommendation.md`  
- *(optional normalized export)* `recovery/correlation_matrix.json`

**Release & compliance:**  
- `.github/workflows/*.yml`  
- `provenance/*.intoto.jsonl`  
- `docs/compliance/mappings.md`  
- `governance/technical_file/**`  
- `governance/dpia/*.md`  
- `governance/control_mappings/*.csv`  
- `governance/privacy_attestations.md`  
- `evidence/release/branch_protection.md`  
- `merge_queue/logs.md`

**FinOps:**  
- `policies/finops.yaml`  
- `metrics/cost/budget_report.csv`  
- `metrics/cost/budget_alerts.csv`

**Monitoring & SIEM:**  
- `logs/ai_actions/*.jsonl`  
- `siem/parsers/*.conf`  
- `siem/retention_policy.md`  
- `metrics/kpi/*.csv`  
- `go_nogo/criteria.md`  
- `go_nogo/phase_report.md`  
- `notifications/delivery_log.csv`  
- `notifications/webhook_failures.csv`

---

## 4) CSV Export (Master Table)

```csv
id,function,subfunctions,phase,standards_tools,evidence_artifacts,gate
1,Natural Language to Code,"NL→code prompts; requirements ingestion",P1,"LLM runtime; prompt templates","prompts/req_ingest.md|sessions/*.log",G1
2,Multi-language Code Generation,"20+ langs/frameworks; templates",P1,"Codegen libs; scaffolds","generated/**|build_logs/*.md",G2
3,Project Type Detection,"FastAPI/Flask/CLI/etc.",P1,"Heuristics; repo parsers","detection/report.md",G1
4,Architecture Decision Making,"Stack & pattern selection; ADRs",P1,ADR template,"docs/ADRs/ADR-*.md",G1
5,Task Decomposition,"Epics→stories→microtasks; acceptance tests",P1,Planner loop,"plan/WORK_BREAKDOWN.md|tests/acceptance/*",G1
6,Dependency & Version Mgmt,Resolution; pinning; upgrades,P1,uv|pip-compile|npm|pnpm,"requirements.lock|pnpm-lock.yaml",G2
7,Package Reality Verification,Detect ghost/retired deps,P1,custom verifier,"evidence/pkg_reality_report.md",G2
8,Static Code Analysis,lint|types|security,P1,"ruff|mypy|bandit|semgrep","evidence/static_checks/*.txt",G2
9,Secrets Detection,pre-commit+CI,P1,"gitleaks|trufflehog","evidence/secrets_scan/*.txt",G2
10,Vuln/Deps Scanning,SBOM/audit,P1,"pip-audit|CycloneDX","sbom/SBOM.json",G3
11,Code Quality Scoring,thresholds,P1,composite scoring,"evidence/quality_score.json",G3
12,Test Gen & Execution,unit|integration|e2e,P1,pytest|playwright,"reports/tests/*.xml",G3
13,Coverage Enforcement,min thresholds,P1,coverage.py,"coverage/coverage.xml",G3
14,Property-based & Mutation,Hypothesis|mutmut,P1,hypothesis|mutmut,"mutation/mutmut_report.txt",G3
15,Performance Benchmarking,latency|throughput,P2,bench scripts,"perf/benchmarks.md",G4
16,Technical Debt Detection,clones|complexity,P1,"radon|xenon|jscpd","evidence/complexity/*.txt",G3
17,Persistent Context Preservation,project state,P1,state store,"state/context/*.json",G1
18,Machine-Digestible Context (MDC),schema'd context,P1,MDC rules,"state/mdc/*.json",G1
19,Temporal Knowledge Graph,code evolution,P2,KG builder,"state/tkg/*.json",G4
20,Cross-Project Learning,transfer learning,P3,privacy guard,"state/transfer/*.json",G5
21,Session State Management,resume work,P1,session logs,"sessions/*.log",G1
22,Multi-Agent Coordination,RA/AA/IA/QA/SA/DBA/DA/FOPS,P1,Orchestrator,"orchestration/graph.yaml",G2
23,Workflow State Management,phases|retries,P1,Redis/KV,"state/run/*",G2
24,Thin Internal Orchestrator (policy/routing/caps),routing Copilot|Q; time|cost caps; policy engine; NFR hints; action-log sink,P1,LangGraph|LiteLLM|LiteGuard,"orchestration/policy_router.py|policies/runtime/*.yaml|metrics/cost/caps.yaml",G2
25,Human Approval Checkpoints,interrupts|approvals,P1,approval hooks,"evidence/approvals/*.json",G2
26,Error Recovery & Self-Correction,retries|rollback,P1,strategy,"evidence/recovery/*.md",G3
27,Iterative Refinement,plan→code→critique loops,P1,loop controller,"evidence/loops/*.log",G2
28,Digital Immune System,proactive threat detect,P2,policy-as-code,"evidence/immune/*.json",G4
29,Policy-as-Code Enforcement,security policies,P1,semgrep/rules,"policies/*.yaml",G3
30,SBOM Generation,CycloneDX,P1,cyclonedx,"sbom/SBOM.json",G3
31,Supply Chain Security,SLSA provenance,P1,attestations,"provenance/*.intoto.jsonl",G4
32,Compliance Validation,OWASP|NIST|ISO|EU,P1,mapping docs,"docs/compliance/*.md",G4
33,Data Residency & Vendor Policy,EU pinning|no-training|logs-off,P1,provider cfgs,"evidence/vendor_policy/*.md",G4
34,Build-vs-Buy Decision Engine,decision tree|ComparativeMatrix.csv|DecisionRecord.json|RACI|acceptance,P1,research package,"research/ComparativeMatrix.csv|research/DecisionRecord.json|research/RACI.md",G1
35,IDE Integration,VS Code|JetBrains,P2,extensions,"docs/ide_setup.md",G3
36,Git Integration,commits|branching,P1,git hooks,"evidence/git/*.md",G2
37,CI/CD Integration,tests|deploy,P1,GH Actions,".github/workflows/*.yml",G3
38,Containerization,Docker→K8s,P1,docker|k8s,"deploy/*",G4
39,Multi-Env Support,dev|stage|prod,P1,env cfg,"env/*.yaml",G3
40,Environment Fingerprinting,capture|replicate|hash,P1,fingerprint tool,"evidence/env/env_fingerprint.json",G2
41,Architectural Pattern Recognition,DDD|hexagonal,P2,analyzers,"evidence/arch/patterns.md",G4
42,Refactoring Recommendations,automated suggestions,P2,refactor bot,"evidence/refactor/*.md",G4
43,Documentation Generation,API docs|comments,P1,OpenAPI|docstrings,"docs/api/openapi.yaml",G3
44,Specification Clarification,Socratic Q/A,P1,planner prompts,"docs/spec/questions.md",G2
45,Strategic Dev Consultation,high-level guidance,P2,advisor agent,"docs/strategy/*.md",G4
46,Real-time Performance Monitoring,health|metrics,P2,metrics stack,"metrics/*.md",G4
47,KPI Instrumentation (DORA/SPACE) & Go/No-Go Gates,lead time|review cycle|MTTR|defect escape|Go/No-Go,P1,KPI collectors|gate rules,"metrics/kpi/*.csv|go_nogo/criteria.md|go_nogo/phase_report.md",G3
48,Cost Tracking & Optimization,token|cost,P1,cost trackers,"metrics/cost/*.csv",G3
49,Quality Metrics Dashboard,score trends,P2,dashboard,"metrics/quality/*.csv",G4
50,Error Tracking & Alerting,exceptions,P2,Sentry/etc.,"metrics/errors/*.md",G4
51,Usage Analytics,feature usage,P2,analytics,"metrics/usage/*.csv",G4
52,Notifications & Webhooks,WS progress|Slack/Discord|email,P1,WS server|webhooks,"notifications/delivery_log.csv",G3
53,AI Action Logs → SIEM (auditability),structured logs|retention|parsers|ISO42001|EU AI Act,P1,logfmt|jsonl|SIEM,"logs/ai_actions/*.jsonl|siem/parsers/*.conf|siem/retention_policy.md",G4
54,Event Bus & DLQ,DLQ|retry|replay,P2,messaging,"evidence/bus/dlq_metrics.csv",G5
55,Research Agent (RA),requirements|tech scans,P1,RA prompts,"handoffs/RA/*.md",G1
56,Architecture Agent (AA),system design|ADRs,P1,AA toolchain,"handoffs/AA/*.md",G1
57,Implementation Agent (IA),code gen/dev,P1,IA runners,"handoffs/IA/*.md",G2
58,Security Agent (SA),SAST|SBOM|chaos,P1,SA rules,"handoffs/SA/*.md",G3
59,Quality Assurance Agent (QA),tests|validation,P1,QA suites,"handoffs/QA/*.md",G3
60,DevOps Agent (DA),CI/CD|infra|release,P1,DA playbooks,"handoffs/DA/*.md",G4
61,Database Agent (DBA),schema|migrations,P1,migration tools,"handoffs/DBA/*.md",G3
62,Docs Agent,READMEs|ADRs|compliance,P1,doc toolchain,"handoffs/DOCS/*.md",G3
63,Atomic Stability Recovery,commit↔MC log|shortlist|validate,P2,forensic scripts,"recovery/correlation_matrix.csv|recovery/mc_log_timeline.md|recovery/candidates.csv",G5
64,Release Controls,protected branches|merge queue|auto-revert,P1,repo rules,"evidence/release/branch_protection.md|merge_queue/logs.md",G4
65,FinOps Policy,phase caps|token ceilings|80% alerts,P1,policy cfg,"policies/finops.yaml|metrics/cost/budget_alerts.csv",G2
66,Benchmark Harness & Golden Task Suite,SWE-bench-style harness|golden tasks|targets,P1,harness|runners,"benchmarks/harness/**|benchmarks/results.csv|golden_tasks/**",G3
67,Governance Pack Generator (ISO42001 + EU AI Act GPAI),technical file|DPIA|ASVS/SSDF mappings|privacy attestations|zero-retention|EU processing,P1,docs/gen scripts,"governance/technical_file/**|governance/dpia/*.md|governance/control_mappings/*.csv|governance/privacy_attestations.md",G4
```

---

## 5) JSON Export Schema (Machine‑Readable)

```json
{
  "$schema": "https://example.com/umca/taxonomy.schema.json",
  "version": "1.1",
  "generated_at": "2025-09-29T00:00:00Z",
  "items": [
    {"id": 1, "function": "Natural Language to Code", "subfunctions": ["NL→code prompts", "requirements ingestion"], "phase": "P1", "standards_tools": ["LLM runtime", "prompt templates"], "evidence_artifacts": ["prompts/req_ingest.md", "sessions/*.log"], "gate": "G1"},
    {"id": 24, "function": "Thin Internal Orchestrator (policy/routing/caps)", "subfunctions": ["agent routing", "time/cost caps", "policy engine", "NFR hint injection", "action-log sink"], "phase": "P1", "standards_tools": ["LangGraph", "LiteLLM", "policy middleware"], "evidence_artifacts": ["orchestration/policy_router.py", "policies/runtime/*.yaml", "metrics/cost/caps.yaml"], "gate": "G2"},
    {"id": 34, "function": "Build-vs-Buy Decision Engine", "subfunctions": ["decision tree", "ComparativeMatrix.csv", "DecisionRecord.json", "RACI", "acceptance criteria"], "phase": "P1", "standards_tools": ["research package"], "evidence_artifacts": ["research/ComparativeMatrix.csv", "research/DecisionRecord.json", "research/RACI.md"], "gate": "G1"},
    {"id": 47, "function": "KPI Instrumentation (DORA/SPACE) & Go/No-Go Gates", "subfunctions": ["lead time", "review cycle", "MTTR", "defect escape", "Go/No-Go"], "phase": "P1", "standards_tools": ["KPI collectors", "gate rules"], "evidence_artifacts": ["metrics/kpi/*.csv", "go_nogo/criteria.md", "go_nogo/phase_report.md"], "gate": "G3"},
    {"id": 53, "function": "AI Action Logs → SIEM (auditability)", "subfunctions": ["structured logs", "retention", "SIEM parsers", "ISO 42001", "EU AI Act"], "phase": "P1", "standards_tools": ["logfmt", "jsonl", "SIEM"], "evidence_artifacts": ["logs/ai_actions/*.jsonl", "siem/parsers/*.conf", "siem/retention_policy.md"], "gate": "G4"},
    {"id": 66, "function": "Benchmark Harness & Golden Task Suite", "subfunctions": ["SWE-bench-style harness", "golden tasks", "targets"], "phase": "P1", "standards_tools": ["harness", "runners"], "evidence_artifacts": ["benchmarks/harness/**", "benchmarks/results.csv", "golden_tasks/**"], "gate": "G3"},
    {"id": 67, "function": "Governance Pack Generator (ISO 42001 + EU AI Act GPAI)", "subfunctions": ["technical file", "DPIA", "ASVS/SSDF mappings", "privacy attestations", "zero-retention/EU processing"], "phase": "P1", "standards_tools": ["docs/gen scripts"], "evidence_artifacts": ["governance/technical_file/**", "governance/dpia/*.md", "governance/control_mappings/*.csv", "governance/privacy_attestations.md"], "gate": "G4"}
    /* … other entries matching CSV … */
  ]
}
```

---

## 6) Implementation Roadmap (P1/P2 Focus)

**P1 (Enable the rails)**  
- **G1:** Scope + Plan Pack (requirements, ADR skeletons, **Build‑vs‑Buy Decision Engine** artifacts).  
- **G2:** Static checks + secrets + package reality + env fingerprinting + **Thin Internal Orchestrator** with routing/caps.  
- **G3:** Tests+coverage; SBOM & quality score; notifications wired; **KPI instrumentation + Go/No‑Go**; **Benchmark harness & golden tasks** established.  
- **G4:** CI/CD deploy to staging; provenance artifacts; **AI action logs → SIEM**; **Governance Pack** first draft; release controls (merge queue, auto‑revert).  
- **FinOps:** per‑phase caps and 80% alerts.

**P2 (Deepen autonomy & resilience)**  
- Event Bus & DLQ; Digital Immune System; Temporal Knowledge Graph.  
- Performance bench; pattern recognition; refactor recommendations.  
- Atomic Stability Recovery missions and zero‑trust validation packs.

---

## 7) Glossary
- **ADR:** Architecture Decision Record.  
- **DLQ:** Dead‑Letter Queue for failed messages.  
- **DORA/SPACE:** Engineering KPI frameworks for throughput/quality.  
- **GPAI:** General‑Purpose AI (EU AI Act).  
- **MDC/TKG:** Machine‑Digestible Context / Temporal Knowledge Graph.  
- **SLSA:** Supply‑chain Levels for Software Artifacts.  
- **WS:** WebSocket.

---

**End of File**
