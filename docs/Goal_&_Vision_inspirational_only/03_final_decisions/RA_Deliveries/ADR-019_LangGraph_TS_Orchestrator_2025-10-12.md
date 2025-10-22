# ADR-019 — Adopt LangGraph.js Orchestrator (TS) with Trust-Spine First

- **Status**: Proposed → Approved (pending MCA sign-off)
- **Date**: 2025-10-12
- **Owners**: AA (orchestration), IA (impl), SA (policy), DA (CI/CD), QA (tests), MCA (gates)
- **Scope**: Replace single-executor runtime with a deterministic, resumable graph orchestrator in **TypeScript**; keep current CDI contracts and evidence model. No Python.

## Context
- Repo is **TypeScript-only** (Node 20). CI enforces contracts, coverage and warnings=0.
- Existing modules provide the building blocks we will *compose* into a graph:
  - `src/planning/decomposeTask.ts` (task breakdown)
  - `src/executor/schema.ts` (output validation)
  - `src/runner/runInSandbox.ts` (test execution)
  - `src/repair/multiTurnRepair.ts` (guided repair loop)
  - `src/clarification/detectMissing.ts` (requirements gaps)
  - `src/orchestrator/stateMachine.ts`, `src/orchestrator/jobQueue.ts`, `src/orchestrator/abortSignal.ts` (current orchestration primitives)
  - API entrypoint: `src/server.ts` (routes for /api/…)

## Decision
Adopt **@langchain/langgraph@0.6.10** to build a **StateGraph** with nodes:
**Clarify → Plan → Generate → Test → Repair → Deliver**, with **deterministic re-entry** from checkpoints.
- Keep existing StepQueue/stateMachine as **fallback** behind a feature flag.
- Add **OpenTelemetry GenAI** spans + **Langfuse** ingestion for every LLM/tool action.
- Govern tools through **MCP (TS SDK)** with a strict allow-list and audit logs.
- Evidence-first: **CycloneDX 1.6 SBOM** + **SLSA v1.0** provenance emitted per build.

## Consequences
- **Pros**: Deterministic, resumable orchestration; auditable HITL approvals; vendor-neutral tool contract (MCP).
- **Cons**: Extra graph wiring and tests; version pinning required to avoid churn.

## Alternatives Considered
1) **Vercel AI SDK 5 (Agents) only** — excellent DX/Edge, but weaker explicit graph semantics for CDI gate mapping.
2) **Cloudflare Agents runtime first** — strong Edge durability; risks coupling infra before parity is proven.
3) **LlamaIndex.TS Workflows** — powerful event-driven subflows; we will selectively adopt for RAG/planning but not as the top-level orchestrator.

## Implementation Plan (Phase 19)
### M0 — Trust-Spine (must pass before runtime change)
- Keep **TS-only** and Node 20.
- CI artifacts at each build: CycloneDX 1.6 SBOM, SLSA v1.0 provenance, RFC 9457 error envelopes.
- Stand up **OTel GenAI** spans (JS) → **Langfuse** OTel endpoint; keep JSONL action logs for diff.

### M1 — Orchestrator (feature-flagged)
- Create `src/orchestrator/graph.ts`, `types.ts`, `checkpoints.ts`, `adapter.ts`.
- Wire POST **`/api/execute`** in `src/server.ts` to call the adapter *when* `AGENTS_RUNTIME=langgraph`; default remains StepQueue.
- Map nodes to existing modules:
  - Planner → `src/planning/decomposeTask.ts`
  - Implementer → `src/executor/*.ts` (schema + writeFiles + outputProcessing)
  - Tester → `src/runner/runInSandbox.ts`
  - Critic/Repair → `src/repair/multiTurnRepair.ts`
  - Clarifier → `src/clarification/detectMissing.ts`
- Add **deterministic mode** (seed) and **checkpoint round-trip** tests.
- Coverage for orchestrator ≥ **90%**, branch ≥ **75%**. Overhead < **500 ms/transition**.

### M2 — HITL + MCP
- Add SSE/WebSocket stream from graph to UI; approval gates for risky actions.
- Ship **MCP** server (`packages/mcp-server/`) with tools: `fs.readFile` (read-only), `git.status|diff|commit` (guarded), `http.fetch` (allow-list).

### M3 — Edge Pilot (optional in this ADR scope)
- Adapters for Vercel Edge/Cloudflare Workers once parity and HITL are stable.

## Rollback Plan
- Feature flag: `AGENTS_RUNTIME=stepqueue` (default). One-line revert in `src/server.ts` leaves the old path intact.
- Keep **StepQueue/stateMachine** codepaths until M2 completes and parity SLOs are met for 30 days.
- If perf or error rate degrades: disable flag, open incident with attached Langfuse traces and RFC 9457 samples.

## Security, Compliance & Governance Mapping
- **OWASP ASVS v5.0**: V1 (Architecture), V5 (Validation/Sanitization), V9 (Comm/Transport), V12 (Files/Resources).
- **OWASP LLM Top 10 (2025)**: Prompt Injection, Tool Abuse, Data Exfiltration, Excessive Agency, Supply Chain.
- **NIST CSF 2.0**: Govern/Identify/Protect/Detect/Respond functions mapped to gates (see checklist).
- **NIST SSDF SP 800-218** (incl. 218A for GenAI): CI checks, provenance, evidence.
- **ISO/IEC 42001**: AI MS documentation & technical file updated via governance pack.
- **EU AI Act (GPAI obligations)**: Technical documentation, policies, logs retained.

## Version Pins & Interfaces
- `@langchain/langgraph@0.6.10`
- `@opentelemetry/api`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/instrumentation-openai`
- `@langfuse/node@^4`
- `modelcontextprotocol/typescript-sdk` (server & client)
- Node 20.x (LTS)

## Acceptance (Phase 19 exit)
- G2 (Trust-Spine) passes with artifacts attached.
- G3 (Orchestrator Pilot) parity: tests green, deterministic replay, perf budget.
- G4 (HITL/MCP) enabled behind approvals with audit logs.
- No new warnings; coverage bars maintained; zero critical vulns.
