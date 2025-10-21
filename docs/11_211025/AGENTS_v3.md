# AGENTS.md

## Metadata
- Version: 1.0.0
- Enforcement: Repository-wide, all AI builders and agents
- Last Updated: 2025-10-21
- Authority: Supreme operational policy under CONSTITUTION.md
- Purpose: Operationalize constitutional principles with locked stack and binary gates

---

## 🎯 Project Overview
- Build a fully autonomous, multi-agent, evidence-driven software delivery platform.
- Architecture: Smart MCA coordinator → Smart Specialists → Zero-Trust Validator.
- Stack: OpenAI-only LLMs, LangGraph JS, Postgres, Redis, MinIO, E2B, OpenTelemetry.
- Goal: 90%+ autonomy; success is binary (PASS/FAIL), not subjective.

---

## 🔒 Critical Rules (Numbered, Binary)

### 1. Evidence-Based ONLY
- No claim without saved, machine-verifiable evidence.
- All results must be reproducible and traceable to artifacts.

### 2. Discover Before Act
- Search/read before editing; prove targets exist.
- Save `discovery.txt` per task with findings and paths.

### 3. Technology Stack (LOCKED)
- Approved only: OpenAI LLMs (GPT‑4o/GPT‑5), LangGraph JS + Postgres Checkpointer, E2B Sandbox (→ Firecracker), MinIO, Postgres 16+, Redis Streams (→ NATS JetStream), OpenTelemetry + Tempo + Grafana, Langfuse.
- Languages: TypeScript/JavaScript (Node.js 20+).
- Forbidden: Anthropic, SQLite, in‑memory persistence, monoliths, custom re‑implementations of battle‑tested tools.

### 4. Architecture (LOCKED)
- Microservices from day 1 in a Turborepo monorepo (e.g., `packages/*`).
- Smart MCA (LLM-powered coordinator) + Smart Specialists (Planner, Implementer, Validator) + Zero-Trust Validator.
- Workers may not self-report success; validator independently verifies.

### 5. Validation Gates (MUST PASS, in order)
- G1: `npm run lint` → exit 0.
- G2: `npm run typecheck` → exit 0.
- G3: `npm test` → exit 0 and coverage ≥ 80% lines.
- G4: Task acceptance criteria satisfied (binary, artifact-backed).

### 6. Iteration Protocol (CRITICAL)
- If any gate fails: diagnose → fix → retry (max 3 attempts) → escalate.
- Success is “all gates green”, not “protocol followed”.

### 7. Evidence Requirements
- Produce task-scoped evidence under `.automation/evidence/$TASK/` (see structure below).
- Hash changed files; track provenance; store artifacts in MinIO when applicable.

### 8. Constitutional Compliance
- Enterprise from line 1: no stubs, prototypes, or "TODO: implement" placeholders.
- Anti-refactoring: do not defer architecture/tooling; exceptions require ADR + owner approval.
- Battle-tested doctrine: prefer libraries; custom only with documented alternatives + approval.

---

## 🧱 Technology Stack (Locked)
- Languages: TypeScript/JavaScript (Node.js 20+).
- LLM: OpenAI ONLY (GPT‑4o, GPT‑5). No multi-vendor in V1.
- Orchestration: LangGraph JS + Postgres Checkpointer.
- Code Generation: OpenAI Function Calling / Structured Outputs.
- Sandbox: E2B Sandbox → Firecracker migration path.
- Storage: MinIO (S3-compatible) for artifacts/evidence.
- Database: Postgres 16+.
- Message Bus: Redis Streams → NATS JetStream migration path.
- Observability: OpenTelemetry → Tempo → Grafana; cost tracking with Langfuse.
- Forbidden: Anthropic Claude, SQLite, in-memory storage for state, monolithic architecture, custom re‑implementations of solved tooling (queues, loggers, HTTP clients, orchestration, SBOM, scans).

---

## 🏗️ Architecture Constraints
- Monorepo with Turborepo; services live under `packages/` by convention.
- Smart MCA supervises routing, retries, and escalation; specialists analyze results (not raw pass-through).
- Zero-Trust Validator independently runs checks; does not trust worker reports.
- Vertical slices: finish one end-to-end slice before starting another.

---

## 📁 Evidence Directory Structure
```
.automation/evidence/$TASK/
  discovery.txt          # Proof targets exist before editing
  baseline.json          # Metrics before change
  final.json             # Metrics after change
  valid/
    lint.txt             # Lint output (exit 0)
    typecheck.txt        # TypeScript check (exit 0)
    tests.json           # Test results (all passing)
    coverage.json        # Coverage report (≥80%)
  artifacts.sha256       # Hashes of changed files
  task_provenance.json   # Task metadata + file list
  audit.json             # npm audit (no new high/critical)
  env.txt                # node -v, npm -v, git rev-parse HEAD
  summary.md             # Links and narrative summary (brief)
```

---

## 🔄 Iteration Protocol
```
On any gate failure:
1) DIAGNOSE: Read logs; identify root cause.
2) FIX: Adjust implementation (not architecture unless approved ADR).
3) RETRY: Re-run failing gate(s).
4) EVIDENCE: Save inputs/outputs under .automation/evidence/$TASK/iterations/.
5) REPEAT: Up to 3 attempts per issue.

After 3 failed attempts:
ESCALATE with description, attempts, logs, and proposed next step.
```

Escalate immediately if: architectural decision required; non-approved tech needed; suspected security vulnerability; or scope drift requires multi-service refactor.

---

## ✅ Validation Gates
- G1 Lint: `npm run lint` → exit 0; attach `valid/lint.txt`.
- G2 Types: `npm run typecheck` → exit 0; attach `valid/typecheck.txt`.
- G3 Tests: `npm test` → exit 0; attach `valid/tests.json` and `valid/coverage.json` (≥80%).
- G4 Acceptance: Attach artifacts proving the task’s definition of done.

Failing any gate triggers the Iteration Protocol.

---

## 🚫 Forbidden Patterns (Auto-Detectable)

| Pattern | Regex | Violation | Action |
|---|---|---|---|
| Path guessing | `(?i)\b(think\|probably\|should be at)\b` | Claims without evidence | HALT; run discovery first |
| Hardcoded success | `return\s*\{\s*success:\s*true\s*\}` | Fake green | Replace with real validation |
| TypeScript any | `:\s*any\b` | Type unsafety | Replace with concrete types |
| TODO/FIXME | `(?i)\bTODO\b\|\bFIXME\b` | Incomplete work | Complete before PR |
| Console.log in src/ | `src/.*console\.log` | Noisy prod logs | Use proper logger |
| Anthropic imports | `from ['"]@anthropic` | Wrong LLM vendor | Replace with OpenAI |

---

## 🎛️ Flexibility (What You Can Decide)
- You may choose exact file structure, names, dependency versions, ports, container names.
- You may choose HOW to achieve outcomes as long as all gates pass and constraints are honored.
- You may NOT change the locked stack, skip evidence, skip gates, or proceed on red.

---

## 🧯 Error Handling
- Iterate (up to 3) on routine failures: lint errors, type errors, test failures, coverage dips, port conflicts, schema mismatches.
- Escalate immediately for: architecture changes, non-approved tech, suspected security issues, or broad refactors.
- All escalations include evidence bundle and a concrete proposal or request for guidance.

---

## 📚 References
- CONSTITUTION.md (Articles I, II, III, V, VI)
- 11_211025/ARCHITECTURE_DECISION.md
- 11_211025/VERTICAL_1_TOOLING.md
- 11_211025/VERTICAL_1_PLAN.md
- 11_211025/WEEK_1_DOD.md (current week's outcomes)

