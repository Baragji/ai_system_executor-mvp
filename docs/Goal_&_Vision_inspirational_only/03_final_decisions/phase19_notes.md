Discovery Artifacts

Added: .automation/phase19_autonomous_transition_discovery_note.md
Added: .automation/phase19_autonomous_transition_discovery.json
These document exact integration points, code snippets, compliance with ai-stack.json, and a proposed approach.

Key Integration Points

Orchestrator switch (feature-flag): src/server.ts:1508
Progress SSE stream (HITL): src/server.ts:2173
LLM boundary (OTel GenAI spans): src/llm/index.ts:88
Planner bridge: src/planning/decomposeTask.ts:195
Implementer validation: src/contracts/validators.ts:86
Tester bridge: src/runner/runInSandbox.ts:78
— — —

Comparative Analysis

Claude (TypeScript Viability, Architecture Proof)

Claim: Fortune-500-grade autonomous agents are viable in TS (production wins; MCP maturity; OWASP LLM compliance achievable).
Recommended stack: LangGraph.js orchestrator; Vercel AI SDK 5 for serving; MCP for tools; Cloudflare/Vercel for execution; Langfuse + OTel; compliance via CycloneDX/SLSA; HITL and security controls.
Strength: Broad ecosystem maturity evidence; cloud infra posture; compliance guardrails.
Refs: docs/…/01a_final_research_Claude.md:1
GPT_RA (Repo-Aware, Phased Orchestrator Plan)

Proposal: Phase 0 (LangGraph + OTel + MCP skeleton) then Phase 1 (Planner/Implementer/Tester/Critic agents) mapped to our modules; HITL via SSE/WS; strong CI gate/evidence discipline.
Strength: Direct mapping to our files and functions; discipline around gates, testing, and evidence.
Refs: docs/…/01b_final_research_GPT_RA.md:1
GPT_HIGH (Trust Spine First, Non-Breaking Upgrades)

Proposal: Phase T0 “Trust Spine” (CycloneDX, SLSA provenance, RFC 9457 errors, OTel baseline, SIEM-friendly JSONL); then M1 LangGraph behind feature flag; U1 HITL chat (vanilla JS); P1 policy gates (Semgrep/Gitleaks); O1 deep observability/evals.
Strength: Non-breaking changes first; strong supply chain and error model; keeps APIs intact; aligns to CDI “ship perfect or never”.
Refs: docs/…/01c_final_research_GPT_HIGH.md:1
Convergence

TypeScript-first is viable and preferred for our stack constraint (ai-stack.json).
Orchestration needs controlled, resumable flows (LangGraph.js) with feature-flag to de-risk.
OTel GenAI semantic conventions + Langfuse are the right observability posture.
MCP is the on-ramp for durable tools integration, used conservatively with policy.
HITL gates are essential (SSE-based progress and approvals).
Compliance: CycloneDX SBOM alongside current SPDX; policy scans (OWASP LLM/NIST alignment).
— — —

Decision Framework

Decision Criteria

Safety & Compliance: OWASP LLM Top 10, NIST 800-218A, SBOM+SLSA, RFC 9457 errors.
Observability & Operability: OTel GenAI spans; traceability to steps/tests; SIEM export.
Determinism & Control: Graph-based orchestration with HITL pauses/resume and approval gates.
Stack Conformance: TS-only, Node 20, no frontend frameworks.
Interop & Portability: MCP for tools; no vendor lock-in at orchestrator boundary.
DX & Maintainability: Minimal API changes; feature flags; CI gates; coverage ≥80/75.
Gate Model (aligned with CDI)

G1: Baseline validation (lint/typecheck/tests/contracts/SBOM).
G2: Trust spine (OTel baseline, RFC 9457 errors, optional CycloneDX).
G3: Orchestrator modernization behind feature flag; parity tests with StepQueue.
G4: HITL chat + policy gates; deep observability and eval logs.
— — —

Recommended Path (Actionable Decision)

Choose TypeScript-only architecture with optional hybrid microservice for bespoke model training (not needed now). Adopt LangGraph.js as the orchestrator under a feature flag; keep existing StepQueue as default runtime for safety and parity.
Implement OTel GenAI baseline at the LLM boundary and step edges; optionally integrate Langfuse for developer observability.
Prepare MCP server skeleton with strict allow-lists; start with read-only FS/Git/HTTP tools.
Add a simple vanilla JS chat under /public to support clarify/pause/resume (HITL); reuse existing SSE endpoints.
Expand SBOM to include CycloneDX 1.6 in addition to current SPDX; RFC 9457 error envelopes without changing API routes.
No breaking API changes; all changes behind feature flags; evidence artifacts recorded under .automation.
Rationale: This blends Claude’s ecosystem maturity, GPT_RA’s repo-aware orchestration mapping, and GPT_HIGH’s “trust spine first” non-breaking upgrades—fully aligned to ai-stack.json and CDI_INFRASTRUCTURE.md.

— — —

Roadmap & CDI Updates

Trust Spine vNext (G1→G2, 2 weeks)

OTel baseline (env-gated import in server): hook at src/llm/index.ts:88 and step edges; document allowed attributes (no PII).
RFC 9457 error envelopes middleware (no route/contract break).
Optional: CycloneDX 1.6 alongside existing SPDX (new script); SBOM “passes” remains unchanged.
CDI: add evidence index under .automation/ with spans dump and problem+json examples.
Notes: Protected workflow files will need CODEOWNERS for CI tweaks; defer until proposal merged.
Orchestration Modernization (G2→G3, 2–3 weeks)

Add LangGraph runtime as experiment; env AGENTS_RUNTIME=langgraph.
Map nodes to existing modules:
Planner → src/planning/decomposeTask.ts:195
Implementer → validateExecutorOutput in src/contracts/validators.ts:86
Tester → src/runner/runInSandbox.ts:78
Critic/Repair → existing repair flow under src/repair/*
Switch point at src/server.ts:1508 to route to StepQueue or graph; maintain StepQueue default.
Parity tests to show identical outcomes in both modes.
HITL & Chat (G2→G3, 2 weeks)

Vanilla JS /public/chat.js + /public/chat.css; reuse src/server.ts:2173 progress stream, add minimal POST endpoints if needed (no frameworks).
Wire pause/resume to src/orchestrator/abortSignal.ts:1.
Policy Gates & Guardrails (G3→G4, 2 weeks)

Semgrep for OWASP LLM Top-10 rules; Gitleaks for secrets; npm audit thresholds.
Document suppressions; keep CI green; CODEOWNERS approval for adding new workflow jobs.
Deep Observability & Evaluation (G3→G4, 2 weeks)

Add span attributes (phase, stepType, attempt, result.status).
Extend src/telemetry/events.ts:70 to optional JSONL dual-write .telemetry/ai_actions.jsonl.
Eval logs for plan/repair loops; export minimal artifacts to .automation/.
MCP Tools Scaffold (parallel, 1 week)

packages/mcp-server/ skeleton + strict policy; start with read-only tools; do not enable by default.
— — —

CDI Framework Adjustments (No protected file changes yet)

Evidence additions: create .automation/* evidence indices for trust spine (spans, problem+json examples, SBOM artifacts).
Contract validation: unchanged (still npm run contract:check).
SBOM: keep npm run sbom (SPDX) as-is; propose new “sbom:cdx” script in a separate PR with justification; CODEOWNERS approval will be required for any CI changes.
— — —

Milestones, Dependencies, Risks

Milestones

T0 Trust Spine vNext (2w) → G2
M1 Orchestration (LangGraph flagged) (2–3w) → G3
U1 HITL Chat (2w) → G3
P1 Policy Gates (2w) → G4
O1 Deep Observability/Evals (2w) → G4
M (MCP Scaffold) (1w, parallel)
Dependencies

T0 precedes M1/U1 (telemetry and error model help debugging).
Policy gates benefit from stability post-M1/U1.
Deep observability after OTel baseline (T0).
Risks & Mitigation

Orchestrator adoption: feature-flag; parity tests; rollback to StepQueue instantly.
Coverage drift: add focused tests for telemetry/error wrappers; keep ≥80/75.
Performance: OTel env-gated; use console/OTLP minimal exporters first.
Compliance drift: purge Python framework options from clarify prompts (currently text only in src/clarification/generateQuestions.ts:1); enforce TS-only options via tests.
Tool sprawl: start MCP read-only; allow-lists; strong time/size limits.
— — —

Validation Plan

No code changes yet; discovery complete.
When ready to implement, we’ll:
Preserve all APIs; guard new behavior behind flags.
Keep CI green: npm run lint, npm run typecheck, npm test, npm run contract:check, npm run sbom.
Attach evidence artifacts in .automation/ for each gate.
Would you like me to proceed with the Phase T0 “Trust Spine” implementation (OTel baseline and RFC 9457 errors) behind environment flags, or start with scaffolding the LangGraph runtime under a feature flag?