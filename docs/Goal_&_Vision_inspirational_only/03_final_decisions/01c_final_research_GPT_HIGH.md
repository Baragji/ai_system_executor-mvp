Below is a current (Oct‑2025), evidence‑backed strategic roadmap and an executable Phase 1 session plan that fits your CDI style (Discover → Implement → Evidence → Validate), with concrete packages/versions, realistic timelines, trade‑offs, and gate evidence. It assumes TypeScript‑only, no Python, and keeps your existing API contracts intact.

Part 1: High‑Level Strategic Roadmap

Phase T0: Trust Spine vNext

Objective: Elevate supply‑chain, error model, and telemetry to Fortune‑500 baselines without changing APIs.
Duration: 2 weeks (incremental, low risk; limited surface change).
Dependencies: None.
Key Decisions:
Framework: CycloneDX SBOM via @cyclonedx/cyclonedx-npm v4.0.3 — production‑used in Node orgs to produce 1.6 SBOMs.
Framework: SLSA v1 provenance (GitHub SLSA generator workflow) — widely adopted by large enterprises; no runtime impact.
Framework: RFC 9457 Problem Details (HTTP error envelopes) — standardizes error responses for clients/SIEM.
Framework: OpenTelemetry JS (api v1.9.0, sdk-node v0.206.0, instrumentation-openai v0.4.0) — GenAI semantic conventions for agent spans.
Trade‑offs: Small increases in CI complexity; adding error envelope middleware requires tests and careful mapping.
Deliverables:
CycloneDX SBOM artifact (spdx retained; add cdx).
RFC 9457 error middleware and tests.
OTel baseline; request/test spans (foundation for agent spans next).
SIEM-friendly JSONL action logs (.telemetry/ai_actions.jsonl).
Success Criteria:
SBOM (CycloneDX 1.6 JSON) built reproducibly.
Error responses follow RFC 9457 for 4xx/5xx.
OTel spans produced locally; no perf/regressions in tests.
Gate Requirements (G2→G3):
Evidence: sbom.cdx.json; sample application/problem+json files; OTel span dump; action log samples.
Validation: npm run sbom (exit 0); npm test (coverage >= 80/75); lint/typecheck 0 issues.
Phase M1: Orchestration Modernization (LangGraph.js)

Objective: Replace bespoke orchestration loops with LangGraph.js under a feature flag, preserving StepQueue as fallback.
Duration: 2–3 weeks (one flow conversion + tests).
Dependencies: T0 (telemetry/error scaffolding helps observability).
Key Decisions:
Framework: @langchain/langgraph v0.4.9 (LangGraph.js) — production docs, official LangChain JS family; used for controllable agents and stateful graphs.
Architecture: Feature‑flagged runtime (env AGENTS_RUNTIME=langgraph); StepQueue default.
MCP compatibility: @modelcontextprotocol/sdk v1.20.0 for future tool interop (scaffold only in this phase).
Trade‑offs: Adds dependency; team pivots to graph model. Mitigated via feature flag and limited blast radius.
Deliverables:
experi ments/langgraph/graph.ts mapping clarify → plan → single/generate → test → repair.
Adapter to persist LangGraph state via existing checkpointStore (src/orchestrator/checkpointStore.ts).
Abstraction boundary documented; step parity tests pass with AGENTS_RUNTIME=langgraph.
Success Criteria:
All tests pass in both modes; complexity (LOC) of orchestration code falls ≥30% for covered flow.
Gate Requirements (G2→G3):
Evidence: RESULTS.md with metrics; dual‑mode test evidence; performance note.
Phase U1: Chat Interaction & HITL Bridge

Objective: Real‑time user interaction (SSE/long‑poll) and MCP tool readiness without frameworks.
Duration: 2 weeks (vanilla JS only).
Dependencies: M1 recommended (graph eventing); T0 helpful (telemetry).
Key Decisions:
Framework: MCP protocol alignment via @modelcontextprotocol/sdk v1.20.0 (tool scaffolds, typed contracts).
Architecture: Vanilla JS chat in /public (no frameworks), SSE for progress; POST /api/chat to raise clarify/pause/resume.
Trade‑offs: Simpler UI; less DX than React. Meets current constraints and avoids drift.
Deliverables:
/public/chat.js, /public/chat.css, minimal pane integrated into index.html.
Server endpoints returning SSE updates and consuming chat events → orchestrator interrupts/resume.
Success Criteria:
Chat sends/receives events; clarifications resolved via chat; UI tests updated (Playwright).
Gate Requirements (G1→G2):
Evidence: Screenshots, Playwright runs, logs of clarified/resolved states.
Phase P1: Policy Gates & Guardrails

Objective: Harden security posture with LLM app controls and secrets scanning; enforce at CI.
Duration: 2 weeks.
Dependencies: T0 (provenance/SBOM) preferable.
Key Decisions:
Tools: Semgrep rules for LLM Top‑10 (2025) policies; Gitleaks for secrets; npm audit gating.
Optional runtime guard: Could add a guard proxy later; keep for E phase.
Trade‑offs: CI time increases; need suppression workflow for false‑positives.
Deliverables:
CI gates for semgrep scan, gitleaks, npm audit with thresholds; policy docs mapping to OWASP LLM Top‑10 (2025), NIST 800‑218A.
Success Criteria:
Scans pass with thresholds; exceptions documented; no red in CI.
Gate Requirements (G3→G4):
Evidence: scan reports archived; policy checklist; pass/fail logs.
Phase O1: Deep Observability (Agent Spans & Evaluation)

Objective: GenAI agent spans, trace correlation, and eval logging for plan/repair loops.
Duration: 2 weeks.
Dependencies: T0, M1.
Key Decisions:
Frameworks: OpenTelemetry JS (api 1.9.0, sdk-node 0.206.0), instrumentation-openai 0.4.0; Langfuse client (langfuse 3.38.5) or OTel‑only if you prefer vendor‑neutral.
Architecture: Per‑step spans (clarify, plan, single, test, repair) with attributes (prompt tokens, retries, cache hit).
Trade‑offs: Sampling config and PII redaction need policy.
Deliverables:
Span instrumentation for StepQueue+LangGraph; exporter config; eval logs for selected flows.
Success Criteria:
Spans visible in local collector; no sensitive data in payloads.
Gate Requirements (G3→G4):
Evidence: trace exports; redaction policy doc; span schema.
Phase MA2: Multi‑Agent Specialization (Within TS)

Objective: Introduce RA/AA/SA/IA/QA/DBA/DA step types and evidence bundles without UI/API breakage.
Duration: 3 weeks.
Dependencies: M1, O1.
Key Decisions:
Orchestration: LangGraph subgraphs per agent role; StepQueue compatibility.
Evidence: Per‑step outputs (ADRs, threat notes, test matrices) stored in .automation/fixtures/<project>/<session>/.
Trade‑offs: More steps; longer runs; mitigated by conditional optional steps and stopOnSuccess flags.
Deliverables:
Agents modeled as steps; payload schemas; test coverage for step transitions; evidence indexer.
Success Criteria:
Workflows succeed with optional steps; evidence bundles complete and validated.
Gate Requirements (G4→G5):
Evidence: per‑agent artifacts; ledger/index; step coverage tests.
Phase E2: Edge & Platform Options (Optional)

Objective: Prepare for edge deployment or vendorized agent runtimes while retaining portability.
Duration: 2–3 weeks (opt‑in).
Dependencies: M1, O1.
Key Decisions (with production use evidence):
Cloudflare Agents SDK @cloudflare/agents v0.0.16 — TS‑native agent runtime on Workers (state, HITL, scheduling); platform docs show production examples.
Vercel AI SDK ai v5.0.68 — Agent control loops for web apps; widely adopted in Next.js ecosystem.
Trade‑offs: Vendor coupling; control vs time‑to‑market trade‑off. Keep optional behind adapters.
Deliverables:
Prototype a single flow on Workers or Vercel with MCP tools; document adapter layer and limits.
Success Criteria:
Parity flow runs at edge with acceptable latency; instrumentation intact.
Gate Requirements (G5):
Evidence: deployment config; perf snapshots; adapter docs.
Part 2: Atomic Session Breakdown (Phase T0: Trust Spine vNext)

Session T0.1: Add CycloneDX SBOM

Duration: 30–45 minutes
Prerequisites: package.json scripts; current sbom.spdx.json (retained).
Discovery:
Integration: package.json (scripts), CI job (references if present).
Current: sbom.spdx.json exists at root; no CycloneDX generation.
Compliance: matches ai-stack.json; no new runtime deps.
Implementation:
Add dev dep: @cyclonedx/cyclonedx-npm@4.0.3.
Add script: "sbom:cdx": "cyclonedx-npm --output-file sbom.cdx.json --output-format JSON".
Keep existing "sbom" but make it run both: "npm run sbom:cdx && existing spdx step".
Tests:
Add test file: tests/meta/sbom-cyclonedx.test.ts asserting file exists and valid JSON with "bomFormat": "CycloneDX".
Artifacts: sbom.cdx.json
Validation:
Success: npm run sbom exits 0; test passes.
Gate: archive sbom.cdx.json in CI artifacts.
Rollback: remove dep and script; delete sbom.cdx.json.
Session T0.2: RFC 9457 Problem Details Middleware

Duration: 45 minutes
Prerequisites: src/server.ts; API tests exist.
Discovery:
File: src/server.ts:2000 (error handlers and route tails).
Current: ad‑hoc error responses; not standardized as problem+json.
Implementation:
Add function toProblem(status, title, detail, instance?) returning RFC 9457 structure; set Content-Type: application/problem+json.
Wrap catch blocks in routes (e.g., /api/execute, /api/sessions/*) to use standardized response for 4xx/5xx without changing semantics.
Tests:
Add tests/api/problem-details.test.ts: simulate a 400 and 500 path; assert Content-Type, "type", "title", "status", "detail".
Artifacts: examples under .automation/fixtures/problem-examples/*.json.
Validation:
Success: tests pass; no existing status codes changed.
Rollback: revert middleware calls; keep helper file if harmless.
Session T0.3: OTel Baseline (SDK + Node Auto)

Duration: 45 minutes
Prerequisites: Node 20+.
Discovery:
Files: server entry (src/server.ts), start script; no OTel bootstrap.
Implementation:
Add deps: @opentelemetry/api@1.9.0, @opentelemetry/sdk-node@0.206.0, @opentelemetry/auto-instrumentations-node (matching minor), @opentelemetry/instrumentation-openai@0.4.0 (if OpenAI used).
Add bootstrap file src/telemetry/otel.ts initializing NodeSDK (console/exporter local by default), resource service.name="umca-executor".
Import bootstrap early in server.ts (import './telemetry/otel.js' guarded by env OTEL_ENABLED).
Tests:
Smoke test tests/telemetry/otel-baseline.test.ts that starts app with OTEL_ENABLED=1 and verifies no crash; optionally assert process emits diagnostic logs.
Artifacts: .automation/evidence/otel-config.md (what spans are expected).
Validation:
Success: app runs; tests & performance unaffected.
Rollback: disable OTEL_ENABLED or remove import.
Session T0.4: SIEM JSONL Action Log

Duration: 30–45 minutes
Prerequisites: src/telemetry/events.ts exists.
Discovery:
File: src/telemetry/events.ts — currently logs to .telemetry/events.log.
Implementation:
Extend logEvent to dual‑write (configurable): append compact JSONL to .telemetry/ai_actions.jsonl for key actions (generation_start/complete, plan_progress, repair attempt).
Ensure rotation hint: document size‑based rotation (manual for now).
Tests:
New test tests/telemetry/ai-actions-log.test.ts: call logEvent; assert file append and JSON parseability.
Artifacts: .telemetry/ai_actions.jsonl (sample redacted).
Validation:
Success: test passes; file grows with runs; no PII leakage (doc).
Rollback: feature flag to disable dual‑write.
Session T0.5: Add “npm run sbom” Aggregator

Duration: 30 minutes
Prerequisites: T0.1 done.
Discovery: package.json scripts.
Implementation:
Set "sbom": "npm run sbom:cdx && node scripts/sbom-spdx-orig.mjs" (or existing).
Add README note (CDI evidence) on artifacts.
Tests: none beyond T0.1; rely on earlier test.
Artifacts: sbom.cdx.json included in CI.
Validation: npm run sbom exit 0.
Rollback: restore prior "sbom".
Session T0.6: Problem Details Back‑compat Audit

Duration: 30 minutes
Prerequisites: T0.2 done.
Discovery: grep all routes for status codes and error bodies.
Implementation:
Ensure we send the same status codes as before; add instance with request path; map validation errors with details array.
Tests:
Expand tests/api to cover representative endpoints (clarify, files, run-tests).
Artifacts: .automation/fixtures/problem-examples/* expanded.
Validation: No prior tests fail; new tests pass.
Rollback: revert mapping for any route that diverges.
Session T0.7: OTel Attributes Baseline (No PII)

Duration: 30 minutes
Prerequisites: T0.3 done.
Discovery: identify spans to tag (phase, step, sessionId hash).
Implementation:
Add span attributes for stepType, attempt, result.status; hash sessionId before tagging.
Tests:
Unit test for hasher; smoke test for attribute presence (via in‑memory exporter if configured).
Artifacts: policy doc for attribute allowlist.
Validation: trace shows attributes, no PII flag.
Rollback: remove attributes; keep baseline.
Session T0.8: Evidence Packaging

Duration: 30 minutes
Prerequisites: T0.* sessions completed.
Discovery: .automation directory organization.
Implementation:
Add evidence index .automation/trust_spine_vnext_evidence.json referencing sbom.cdx.json, problem‑examples, otel-config, ai_actions sample.
Tests: none.
Validation: index is valid JSON; paths resolve.
Rollback: delete index file.
How This Fits Your CDI Pattern

Each session begins with documented discovery (file paths + current code), exact changes, test coverage targets (keeping 80/75), artifacts, and gate evidence. Evidence is collected under .automation/* and validated by tests/CI checks.
No protected files are required to change unless you later add SLSA workflows (can be a separate contract that CODEOWNERS approve).
Supporting Research (Oct‑2025)

LangGraph.js: @langchain/langgraph v0.4.9 (npm dist‑tag latest); Official JS graph for controllable agents, production docs (LangChain).
LlamaIndex.TS: llamaindex v0.12.0 (npm); TS agents and Workflows feature; production docs.
Vercel AI SDK: ai v5.0.68 (npm) — SDK v5 shipped with agentic loop support; widely used in Next.js.
MCP TS SDK: @modelcontextprotocol/sdk v1.20.0 (npm); typed tooling protocol used by OpenAI Apps, Cloudflare “code mode”.
Cloudflare Agents SDK: @cloudflare/agents v0.0.16 (npm); TS‑native agent runtime on Workers with tool vendoring & scheduling.
OpenTelemetry JS: @opentelemetry/api v1.9.0; @opentelemetry/sdk-node v0.206.0; @opentelemetry/instrumentation-openai v0.4.0 (npm); GenAI semantic conventions, growing JS support.
CycloneDX for Node: @cyclonedx/cyclonedx-npm v4.0.3 (npm); produces CycloneDX 1.6 JSON.
BullMQ (future optional queue): bullmq v5.61.0 (npm) — proven Redis‑backed queue in Node.
Why These Choices (Trade‑offs)

TS‑First Orchestration: LangGraph.js + MCP now provide production‑grade orchestration and tool protocols in TypeScript, avoiding a rewrite and preserving typed DX. Trade‑off: learning curve; mitigated via feature flag and limited scope conversion.
Trust Spine Before Orchestration: SBOM/provenance, standardized errors, and OTel baselines reduce incident risk and ease later expansions. Trade‑off: CI time; offset by enterprise expectations and quick wins.
Vanilla Chat: You keep /public constraint and still gain HITL. Trade‑off: less UI sugar; acceptable within current non‑framework policy.
Gates Mapping (Evidence per Gate)

G0 – Requirements/Brief: Updated Phase objectives + acceptance in .automation phase note.
G1 – Planning/Design: T0 plan doc; Problem Details design note; OTel design (attribute allowlist).
G2 – Build/Setup: CycloneDX tooling integrated; OTel bootstrap; dual‑write logs; tests stubbed.
G3 – Verification: All tests pass; coverage met; sample traces/action logs; problem responses validated.
G4 – Security/Compliance: Semgrep/Gitleaks policies (Phase P1); provenance integrated; SBOM archived per run.
G5 – Ops/Deployment: Optional edge prototype and productionized traces; SLOs defined.
G6–G8 – Advanced AI/Continuous Improvement: After MA2 and O1 expansion; evaluation gates and continuous improvement loops.
Next Steps I can do now

Draft a brief ADR and contract JSON for “Phase T0 – Trust Spine vNext” aligning to your contracts/Roadmap_execution structure, with the exact evidence and validations enumerated above.
Prepare a LangGraph.js spike plan (M1) with a minimal graph and feature flag wiring, including test toggles and rollback.
If you want the ADR + contract stubs added into contracts/Roadmap_execution and .automation discovery notes now, say the word and I’ll scaffold them with the package versions and evidence files listed here.