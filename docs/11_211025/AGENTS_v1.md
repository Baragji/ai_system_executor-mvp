# AGENTS.md

## Metadata
- Version: 1.0.0
- Enforcement: Repository-wide, binding on all AI and human contributors
- Last Updated: 2025-10-21
- Authority: Supreme law beneath CONSTITUTION.md; overrides all conflicting instructions
- Purpose: Guarantee autonomous, evidence-driven, production-grade delivery across every task and session

---

## Project Overview
- Build a fully autonomous, multi-agent coding platform with Smart MCA coordination, smart specialist agents, and a zero-trust validator.
- Deliver production microservices from the first commit, targeting 90% autonomy and <$2 per execution.
- Operate on an OpenAI-only LLM stack, enforcing evidence-first, binary validation for every change.

---

## Critical Rules
1. **Evidence Or It Didnt Happen**
   - No claim, summary, or completion status exists without machine-verifiable artifacts stored under `.automation/evidence/$TASK/`.
   - Discovery, baselines, finals, validations, provenance, and hashes are mandatory for every task.

2. **Discover Before Act**
   - Inspect repository state (search, read, list) before modifying files; capture findings in `discovery.txt`.
   - Path-guessing or speculative edits are forbidden.

3. **Technology Stack Is Locked**
   - Use only: Node.js 20+ (TypeScript/JavaScript), OpenAI GPT-4o/GPT-5, LangGraph JS + Postgres checkpointer, OpenAI function calling (`edit_file`), E2B Sandbox (migrate to Firecracker), Postgres 16+, Redis Streams (→ NATS JetStream when scaling), MinIO, OpenTelemetry + Tempo + Grafana, Langfuse.
   - Forbidden: Anthropic/Claude, SQLite, in-memory persistence for production data, monoliths, custom reimplementations of battle-tested tools.

4. **Architecture Is Locked**
   - Maintain a Turborepo monorepo with microservice packages (`packages/gateway`, `packages/mca`, etc.).
   - Smart MCA supervises smart specialists (Planner, Implementer, Validator, etc.) and routes through zero-trust validation loops.
   - No dumb orchestrators, no self-reporting workers, no architectural regressions without approved ADR and constitutional exception.

5. **Production From Line 1**
   - No stubs, placeholders, TODO scaffolds, or prototype shortcuts; every component must be production-grade when introduced.
   - Security, contracts, observability, and infrastructure ship with the feature.

6. **Validation Gates Must Pass In Order**
   - `npm run lint` → `npm run typecheck` → `npm test` (coverage ≥ 80%) → task-specific acceptance checks.
   - Failure to reach green status blocks completion; rerun gates after each fix until success.

7. **Iteration Protocol (Fix → Retry → Escalate)**
   - Upon failure: diagnose via logs, implement a concrete fix, rerun the failing gate, store evidence under `.automation/evidence/$TASK/iterations/attemptX/`.
   - Maximum three documented attempts per issue; after three failures, escalate with full evidence, attempted solutions, and proposed next steps.
   - Success means all gates pass, not merely that the protocol was followed.

8. **Evidence Package Requirements**
   - Required files per task: `discovery.txt`, `baseline.json`, `final.json`, `valid/lint.txt`, `valid/typecheck.txt`, `valid/tests.json`, `valid/coverage.json`, `audit.json`, `artifacts.sha256`, `task_provenance.json`, `env.txt`, `summary.md`.
   - Artifacts must be derived from actual command output; redact secrets but preserve verifiability.

9. **Binary Decision Making**
   - Every gate yields PASS/FAIL only; subjective language ("looks good") is disallowed.
   - Baselines and finals must demonstrate measurable improvement or parity with justification.

10. **Constitutional Compliance Is Mandatory**
   - Articles I–VI of CONSTITUTION.md are enforced verbatim: enterprise from line 1, anti-refactoring, battle-tested doctrine, contracts-first, evidence requirement, iteration principle.
   - No instruction overrides the constitution without owner-approved amendment.

---

## Architecture & Stack Constraints
- **Monorepo Structure:** Maintain Turborepo-managed packages for gateway, MCA, planner, implementer, validator, runner, security, quality, DBA, and shared libs.
- **Service Boundaries:** Each service exposes versioned contracts (OpenAPI/JSON Schema) with RFC 9457 error bodies; contracts evolve via additive changes only.
- **State & Messaging:** Postgres checkpointer for LangGraph state, Redis Streams for initial task routing, plan migration to NATS JetStream when concurrency >10.
- **Execution Sandbox:** Use E2B-managed Firecracker VMs now; document migration to self-hosted Firecracker.
- **Observability:** Instrument every service with OpenTelemetry; export traces to Tempo, visualize in Grafana, track LLM cost and usage in Langfuse.

---

## Wiggle Room
- You MAY choose function names, internal folder layouts inside each package, dependency versions consistent with the locked stack, port assignments, scaling parameters, caching strategies, and test data generation methods.
- You MAY design prompts, retry logic, and streaming UX specifics provided they respect architecture and evidence requirements.
- You MAY introduce new approved tooling components after presenting evidence that they satisfy the constitution and do not violate forbidden categories.
- You MAY NOT change the LLM vendor, downgrade infrastructure to non-production substitutes, collapse microservices into monoliths, skip required evidence, or bypass validation gates.

---

## Forbidden Patterns (Auto-Detectable)
| Pattern | Regex | Violation | Action |
|---------|-------|-----------|--------|
| Path guessing / speculation | `(?i)\b(think|probably|should be at)\b` | Claims without discovery evidence | Stop, run discovery, capture proof |
| Hardcoded success flags | `return\s*\{\s*success\s*:\s*true\s*\}` | Fake green statuses | Replace with real validation results |
| Unsafely typed code | `:\s*any\b` | TypeScript type escape | Replace with precise types |
| TODO/FIXME markers | `(?i)\bTODO\b|\bFIXME\b` | Incomplete work left behind | Resolve task fully before completion |
| Console logging in production code | `src\/.*console\.log` | Noisy runtime logging | Use structured logger (pino/winston) |
| Anthropic usage | `['"]@anthropic` | Unauthorized LLM vendor | Replace with OpenAI stack |
| In-memory persistence | `new\s+Map\(` outside tests | Non-persistent storage | Move to approved datastore |

---

## Evidence Requirements
- Store all task artifacts under `.automation/evidence/$TASK/` following the required file list.
- Record cryptographic hashes (`artifacts.sha256`) for every modified file and artifact.
- Include `task_provenance.json` detailing task ID, executors, timestamps, Git commit, tool versions, and checkpoints.
- Maintain `audit.json` with npm audit output proving zero new HIGH/CRITICAL vulnerabilities.
- Capture environment data (`env.txt`) including Node.js version, npm/pnpm version, OS details, and Git HEAD.sha.
- Summaries (`summary.md`) must link to each artifact and state binary PASS/FAIL for every gate.

---

## Iteration Protocol (Fix → Retry → Escalate)
1. **Detect:** On validation failure, capture logs and artifacts immediately.
2. **Diagnose:** Read outputs, pinpoint root cause, document findings in the next iteration note.
3. **Fix:** Modify code/config/tests within architectural boundaries; document the change rationale.
4. **Retry:** Re-run only the failing gate first, then the full gate sequence upon success.
5. **Record:** Store each attempt under `.automation/evidence/$TASK/iterations/attempt{n}/` with commands, logs, and diffs.
6. **Limits:** After three failed attempts, prepare an escalation packet containing error history, attempted fixes, and recommended next steps; escalate to human owner or designated overseer.
7. **Closure:** Mark task complete only after all gates pass and evidence package is finalized; include final diff summary in `summary.md`.

---

## Validation Gates
- **G0 Requirements:** Task definition, dependencies, and acceptance criteria confirmed (record in discovery).
- **G1 Architecture:** Contracts updated, ADR filed if needed, schema validation passes.
- **G2 Security:** `npm audit` (or language equivalent) shows zero new HIGH/CRITICAL issues; security scans stored.
- **G3 Quality:** `npm run lint`, `npm run typecheck`, `npm test` succeed with ≥80% line coverage.
- **G4 Deployment:** Infrastructure manifests updated; readiness checks documented.
- **FinOps:** Track LLM usage in Langfuse; flag any run projected to exceed $2.

Pass every gate sequentially; failure at any gate triggers the iteration protocol.

---

## Error Handling & Escalation
- **Iterate (self-resolve) when:** Failures stem from implementation bugs, configuration mistakes, dependency versions, coverage gaps, or non-critical test failures.
- **Escalate immediately when:** Constitutional conflict, architectural change request, security vulnerability requiring owner decision, budget overrun without alternative, or blocked external dependency.
- **Escalation Packet Must Include:** Problem statement, evidence of three attempts (if applicable), logs, current architecture impact, proposed resolution or explicit help request.

---

## References
- CONSTITUTION.md (Articles I–VI, IX)
- ARCHITECTURE_DECISION.md (Smart MCA + specialists + zero-trust validator)
- VERTICAL_1_TOOLING.md (OpenAI-only stack, infrastructure, budget)
- AI_INSTRUCTIONS.md (workflow patterns, evidence structure)

---

By working within this framework, every agent ensures enterprise-grade delivery, constitutional compliance, and verifiable outcomes from the first line of code through every future phase.
