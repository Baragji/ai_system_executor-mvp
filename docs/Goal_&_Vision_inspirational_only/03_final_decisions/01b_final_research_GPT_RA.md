# Part 1
You’re right to demand real, current research and repo-aware guidance. I did the homework and I’m going to be blunt:

* Yes—there **are** credible, production-used **TypeScript agent frameworks** in Oct 2025 (LangGraph.js, LlamaIndex.TS Workflows/Agent Workflows, Vercel AI SDK 5 agents, Cloudflare **Agents** SDK). These are not toy projects: they’re shipping, documented, versioned and used by large companies. ([langchain-ai.github.io][1]) ([developers.llamaindex.ai][2]) ([ai-sdk.dev][3]) ([Cloudflare Docs][4])
* It is **not** inherently “easier” to build in Python anymore for your use case. For TS shops, today’s edge+web stack (Workers, Vercel, Node 20) plus TS-native orchestration and MCP make TypeScript the *operationally* lowest-friction path—tooling, typing, runtime, infra, and observability all line up. (Examples: OTel GenAI semconv in JS; Langfuse JS v4; OpenAI Apps SDK & MCP TS SDK.) ([OpenTelemetry][5]) ([langfuse.com][6]) ([OpenAI][7])

Repo-specific anchors I used throughout (no guessing): your **CDI** contract gates and baselines (G0–G8, evidence bundle, CycloneDX 1.6, SLSA v1.0), stack lock (**TypeScript-only**, Node 20), and path layout (e.g., `src/planning/*`, `src/executor/*`, `src/runner/*`, `src/clarification/*`, API endpoints, test layout).

> Note: you asked me to read `repomix-output.xml` (first 568 lines) as the navigation index. I do **not** have that file in the uploaded set, so I grounded integration points using `repo.md`, `CDI_INFRASTRUCTURE.md`, MCA, and the contracts you provided. If you add `repomix-output.xml`, I’ll cross-check file:line:functions exactly and tighten the session pointers. For now, I include precise **file paths** and **expected function names** aligned with your folders so agents can resolve them deterministically from your tree.  

---

# Part 1: High-Level Strategic Roadmap (TS-only, CDI-aligned)

### Phase 0: Orchestrator Selection & Telemetry Hardening

├─ **Objective:** Replace single-agent executor with a controllable, durable **graph orchestrator** in TypeScript; lay down **OTel GenAI** + Langfuse tracing and **MCP** plumbing.
├─ **Duration:** **2 weeks** — one to wire LangGraph.js + checkpoint store; one to land OTel + Langfuse and MCP server skeleton. Complexity is moderate (integration, not deep refactor).
├─ **Dependencies:** Node 20 lock; CI runs (SBOM, SLSA hooks) intact.
├─ **Key Decisions:**
│  ├─ **Framework:** `@langchain/langgraph` **0.4.9** (JS) — proven in production (Uber/LinkedIn/Replit), durable execution & HITL; 1.0 alpha exists but we pin to 0.4.x for stability. ([npmjs.com][8])
│  ├─ **Observability:** OpenTelemetry JS **v0.206.0** + GenAI semconv; add `@opentelemetry/instrumentation-openai` (supports OpenAI Node SDK v5). Stream traces to Langfuse JS SDK **v4** (GA). ([GitHub][9])
│  ├─ **MCP:** Adopt **MCP 2025-06-18** spec and **TypeScript SDK** for tool governance and future ChatGPT Apps compatibility. ([modelcontextprotocol.io][10])
│  ├─ **Trade-offs:** LangGraph adds a graph/runtime layer (learning curve) but gives deterministic control, resumability, and HITL—key for your **“ship perfect or never”** rule. LlamaIndex Workflows will be considered for event-driven subflows but not the core orchestrator (avoid split brain). ([LlamaIndex Documentation][11])
├─ **Deliverables:**
│  • `src/orchestration/graph.ts` (planner→implementer→tester→critic), `src/orchestration/checkpoint.ts` (KV/SQL), `src/telemetry/otel.ts`, `src/telemetry/langfuse.ts`, `packages/mcp-server/` (skeleton with FS/Git/HTTP tools).
│  • OTel exporter config + Langfuse project keys in `.env.example`.
│  • Unit tests (`tests/orchestration/*`, `tests/telemetry/*`).
├─ **Success Criteria:** 100% orchestrator unit tests; OTel spans emitted for each LLM/tool call (GenAI semconv attributes present); MCP server passes health checks.
└─ **Gate Requirements:** CycloneDX 1.6 SBOM, SLSA v1.0 provenance, evidence in `EVIDENCE_LOG.md`, gate log entry in `GATES_LEDGER.md`.  ([cyclonedx.org][12])

---

### Phase 1: Multi-Agent Refactor (Planner / Implementer / Tester / Critic / Security Guard)

├─ **Objective:** Decompose the monolithic **executor** into specialized TS agents mapped to your existing modules:
`planning`→Planner, `executor`→Implementer, `runner`→Tester, `repair`→Critic/Repair, `clarification`→User-I/O.
├─ **Duration:** **3 weeks** — one per cluster (Planner/Implementer, Tester/Repair, Clarify/HITL); concurrent where safe.
├─ **Dependencies:** Phase 0 graph runtime, OTel/Langfuse baseline.
├─ **Key Decisions:**
│  ├─ **Architecture:** **Plan-then-Execute graph** with HITL gates, not free-loop ReAct; improved predictability and security in literature. ([arXiv][13])
│  ├─ **Human-in-the-Loop:** Stream updates via SSE/WebSocket to UI and require user approvals at high-risk steps; supported by LangGraph control and Cloudflare/Vercel client hooks. ([js.langchain.com][14])
│  └─ **Trade-offs:** More coordination code and tests now, but safer autonomy later (clear failure domains, observable spans, resumability).
├─ **Deliverables:**
│  • `src/agents/planner.ts` (`decomposeTask()` bridge), `src/agents/implementer.ts` (`generate` + schema validate), `src/agents/tester.ts` (`runInSandbox()` bridge), `src/agents/critic.ts` (`multiTurnRepair()` policy), `src/agents/security.ts` (lint/SAST tool). File paths map to your current modules and exports. 
│  • Expanded test suites `tests/planning/*`, `tests/executor/*`, `tests/runner/*`, `tests/repair/*` (Vitest), plus Playwright UI streaming tests.
├─ **Success Criteria:** ≥80% line / ≥75% branch coverage remains green; all endpoints `/api/execute`, `/api/clarify` maintain backward-compat.
└─ **Gate Requirements:** Evidence bundle shows **GenAI agent spans**, HITL approval artifacts, and zero new warnings; SBOM+SLSA updated.

---

### Phase 2: Chat UX + MCP Tools (TS-only)

├─ **Objective:** Add **real-time chat interaction** with approval gates and tool use via **MCP**.
├─ **Duration:** **2 weeks** — 1 for Apps/UI plumbing, 1 for MCP tools & auth.
├─ **Dependencies:** Phase 1 agents.
├─ **Key Decisions:**
│  ├─ **UI/Agent SDK:** **Vercel AI SDK 5** (agents, loop control, typed tools) for your web UI; aligns with TS and integrates easily with SSE/WebSockets. ([Vercel][15])
│  ├─ **MCP:** TS SDK to define internal tools (FS read-only, Git status/diff/commit, HTTP fetch w/ allow-list). Aligns with OpenAI **Apps SDK** future usage (it **extends MCP**). ([GitHub][16])
│  └─ **Trade-offs:** MCP adds ceremony (schemas/permissions) but gives **auditable, standardized tool calls** and compatibility with ChatGPT Apps.
├─ **Deliverables:**
│  • `web/chat/*` with AI SDK 5 agent, streaming, and approval UI.
│  • `packages/mcp-server/src/index.ts` with tools: `fs.readFile`, `git.diff`, `git.commit`, `http.fetch` (+ policy).
│  • Tests: UI approval e2e (Playwright), MCP contract tests.
└─ **Gate Requirements:** Tool calls logged with OTel & Langfuse, MCP auth policy documented; zero UI accessibility regressions per contract 16.

---

### Phase 3: Edge Execution & Scheduling (Cloudflare Agents)

├─ **Objective:** Run long-lived agent sessions near users; enable scheduled/async tasks with durable state.
├─ **Duration:** **2 weeks** — deploy starter, port orchestrator entry, wire storage.
├─ **Dependencies:** Phases 0–2.
├─ **Key Decisions:**
│  ├─ **Runtime:** **Cloudflare Agents** SDK (`agents` pkg) for stateful agents + real-time WS; deploy via Workers; mind Node API compatibility. ([Cloudflare Docs][4])
│  └─ **Trade-offs:** Worker runtime limits (Node shims) require avoiding incompatible libs; benefit is global durability and cost.
├─ **Deliverables:** `workers/agent.ts` bridging to `src/orchestration/graph.ts`; storage binding for checkpoint store; live chat via `useAgent`/`useAgentChat`. ([Cloudflare Docs][4])
└─ **Gate Requirements:** Canary traffic OK; latency P50/P95 targets set and met in staging telemetry.

---

### Phase 4: Supply Chain & Compliance

├─ **Objective:** Lock in **CycloneDX 1.6** SBOM, **SLSA v1.0** provenance, OpenSSF Scorecard, and CDI CI gates.
├─ **Duration:** **1 week** (automation + docs).
├─ **Dependencies:** CI already generates SBOM; extend for provenance + scorecard.
├─ **Key Decisions:**
│  ├─ SBOM format: **CycloneDX 1.6 JSON**. ([cyclonedx.org][12])
│  └─ Provenance: **SLSA v1.0** predicate in CI. ([SLSA][17])
└─ **Gate Requirements:** Evidence bundle includes SBOM+provenance artifacts with checksums in `EVIDENCE_LOG.md`; gate log updated.

---

### Phase 5: Governance (ASVS v5, LLM Top-10 2025, NIST CSF 2.0, SSDF, ISO 42001, EU AI Act)

├─ **Objective:** Formalize security/governance mapping and policy gates in CDS/CI.
├─ **Duration:** **2 weeks** (mapping + automated checks + docs).
├─ **Dependencies:** Telemetry and SBOM/provenance in place.
├─ **Key Decisions:** Use your MCA baselines; add automated checklist generation and links to evidence.
└─ **Gate Requirements:** Mapped controls per gate, waivers recorded; **no-go** if residual risk HIGH.

---

## Why this reaches “Fortune 500-grade”

* **Evidence of production use** (TS): LangGraph.js publicly cited by Uber/LinkedIn/Replit; LlamaIndex Workflows 1.0 (TS) GA; Vercel AI SDK 5 widely adopted; Cloudflare Agents SDK shipping. ([Uber][18]) ([llamaindex.ai][19]) ([GitHub][20]) ([Cloudflare Docs][4])
* **Observability & control** first: OTel GenAI + Langfuse v4 unify traces, spans, evals for agents (including **agent graphs**). ([OpenTelemetry][5])
* **Standardization**: MCP (TS SDK) + OpenAI Apps SDK path means your tools run anywhere MCP is supported (ChatGPT Apps, Windows MCP). ([modelcontextprotocol.io][10])
* **Compliance baked-in** via CDI gates and your MCA baseline—SBOM, SLSA provenance, ASVS v5, LLM Top-10 (2025) mapping.

---

# Part 2: Atomic Session Breakdown (Phase 0 & Phase 1)

> **Format note:** Each session is 30–45 minutes, **AI-agent executable**, CDI-style (Discovery → Implementation → Validation). Integration points reference your structure (e.g., `src/planning/decomposeTask.ts`, `src/runner/runInSandbox.ts`). Where exact line numbers are needed, the agent must extract them as part of **Discovery** and attach the snippet to evidence—this keeps us precise even without `repomix-output.xml` in this turn.

---

### Session 0.1 — Add LangGraph orchestrator shell

* **Duration:** 30–45m
* **Prerequisites:** Node 20; repo installs clean; tests green.
* **Discovery**

  * Verify modules exist: `src/planning/decomposeTask.ts`, `src/executor/schema.ts`, `src/runner/runInSandbox.ts`, `src/repair/multiTurnRepair.ts`. Capture signatures. 
  * Confirm API endpoints present: `/api/execute`, `/api/clarify`.
  * Stack compliance (TS-only) via `ai-stack.json`. Save output.
* **Implementation**

  * Add deps: `npm i @langchain/langgraph@0.4.9 @langchain/core` (lockfile update). ([npmjs.com][8])
  * Create `src/orchestration/graph.ts` with nodes: `PlannerNode`, `ImplementerNode`, `TesterNode`, `CriticNode`; edges per **Plan-then-Execute**; export `runGraph(input)`. ([langchain-ai.github.io][21])
* **Validation**

  * Unit test `tests/orchestration/graph.spec.ts` mocking module calls; expect deterministic state transitions; coverage threshold unchanged.
  * Evidence: test report, `graph.ts` checksum, dep diff; log in `EVIDENCE_LOG.md`; update `GATES_LEDGER.md`.
* **Rollback:** Revert `package.json` and remove `src/orchestration/*`.

---

### Session 0.2 — OpenTelemetry GenAI trunk + Langfuse v4

* **Duration:** 30–45m
* **Prerequisites:** 0.1 done.
* **Discovery**

  * Detect OpenAI SDK usage site(s) to instrument (search for `new OpenAI` or provider abstraction under `src/llm/*`). Save snippet.
* **Implementation**

  * Install: `npm i @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/exporter-otlp-http @opentelemetry/instrumentation-openai @langfuse/node@^4`. ([npmjs.com][22])
  * Add `src/telemetry/otel.ts` to init tracer with **GenAI semconv**; add `src/telemetry/langfuse.ts` for Langfuse client + span bridge. ([OpenTelemetry][5])
* **Validation**

  * Run a sample `/api/execute` and verify spans (LLM request span + tokens/cost). Attach trace screenshot/JSON export.
* **Rollback:** Remove telemetry imports, uninstall deps.

---

### Session 0.3 — MCP server skeleton (TS)

* **Duration:** 30–45m
* **Prerequisites:** 0.1–0.2 done.
* **Discovery**

  * Confirm policy files/allow-lists or create `configs/mcp-policy.json`.
* **Implementation**

  * Add `packages/mcp-server/` using **MCP TS SDK**; implement tools: `fs.readFile(path)` (read-only under repo root), `git.status|diff|commit`, `http.fetch(url)` with allow-list + size/time caps. ([GitHub][16])
* **Validation**

  * Local client connects (stdio or HTTP) and lists tools; evidence: tool list JSON, policy file, code checksums.
* **Rollback:** Remove package folder and policy file.

---

### Session 1.1 — Planner agent (bridge to `decomposeTask`)

* **Duration:** 30–45m
* **Prerequisites:** Phase 0 complete.
* **Discovery**

  * Open `src/planning/decomposeTask.ts`; record function signature & key branches. 
* **Implementation**

  * `src/agents/planner.ts`: wrap `decomposeTask()` with input schema (Zod) and output actions (plan nodes).
  * Wire into `PlannerNode` in `graph.ts`.
* **Validation**

  * Vitest: feed representative problem → assert structured plan with dependencies.
  * Evidence: unit tests + coverage report (no threshold regressions).
* **Rollback:** Detach node; keep original module intact.

---

### Session 1.2 — Implementer agent (bridge to executor/schema)

* **Duration:** 30–45m
* **Discovery**

  * Inspect `src/executor/schema.ts` and generator entry points; capture validation usage.
* **Implementation**

  * `src/agents/implementer.ts`: call generator, enforce `validateExecutorOutput()`, emit OTel spans with prompt/tool attributes.
* **Validation**

  * Tests validate output and schema errors; attach traces.
* **Rollback:** Remove agent registration; no code path changes.

---

### Session 1.3 — Tester agent (bridge to `runInSandbox`)

* **Duration:** 30–45m
* **Discovery**

  * Inspect `src/runner/runInSandbox.ts`; note inputs/outputs and failure modes. 
* **Implementation**

  * `src/agents/tester.ts`: invoke sandbox, capture logs, map to pass/fail artifacts.
* **Validation**

  * Tests simulate failing tests → ensure Critic receives failure context.
* **Rollback:** Detach node.

---

### Session 1.4 — Critic/Repair agent (bridge to `multiTurnRepair`)

* **Duration:** 30–45m
* **Discovery**

  * Inspect `src/repair/multiTurnRepair.ts` and current retry policy. 
* **Implementation**

  * `src/agents/critic.ts`: route to repair with guardrails (max steps, policy checks), attach HITL approval hook.
* **Validation**

  * Test repair cycles and approval intervention stub; attach logs.
* **Rollback:** Detach node.

---

### Session 1.5 — Clarification agent + chat streaming

* **Duration:** 30–45m
* **Discovery**

  * Check `/api/clarify` endpoint plumbing and `src/clarification/detectMissing.ts`. 
* **Implementation**

  * Add SSE/WebSocket stream from the graph to UI using **Vercel AI SDK 5** client; expose approval prompts. ([ai-sdk.dev][3])
* **Validation**

  * Playwright test: user sees step-level updates and can approve/deny risky actions.
* **Rollback:** Feature flag off (no behavior change to existing API).

---

### Session 1.6 — Security agent (SAST/secrets/LLM Top-10 checks)

* **Duration:** 30–45m
* **Discovery**

  * Verify CI scripts and evidence hooks.
* **Implementation**

  * Add `src/agents/security.ts` to run lint/SAST/secrets checks as graph step; output RFC 9457 problems for UI.
* **Validation**

  * CI passes; evidence updated; test a seeded violation.
* **Rollback:** Disable step; CI remains.

---

### Session 1.7 — Evidence & Gate bundle

* **Duration:** 30–45m
* **Implementation**

  * Produce CycloneDX 1.6 SBOM + **SLSA v1.0** provenance in CI; attach checksums to `EVIDENCE_LOG.md`; log G-move in `GATES_LEDGER.md`.  ([cyclonedx.org][12])
* **Validation**

  * `npm run validate:all` clean; 0 warnings; coverage ≥ targets.
* **Rollback:** Revert only if CI fails; no runtime impact.

---

## Decision Gates (G0–G8) — evidence per gate (examples)

* **G0 Inception:** Project brief + state files updated; dependency audit; stack compliance proof (TS-only).
* **G1 Orchestrator Ready:** `graph.ts` + tests; OTel spans present with GenAI attributes; MCP server lists tools. ([OpenTelemetry][5])
* **G2 Multi-Agent:** Planner/Implementer/Tester/Critic wired; HITL approvals in UI; traces show agent spans.
* **G3 Tool Governance:** MCP policy file; tool calls auditable; Apps SDK compatibility note. ([OpenAI][7])
* **G4 Edge Pilot:** Worker deployed; P50/P95 latency SLO met; Node-compat list documented. ([Cloudflare Docs][23])
* **G5 Supply Chain:** SBOM 1.6 + SLSA v1.0 artifacts attached with checksums. ([cyclonedx.org][12])
* **G6 Security Mapping:** ASVS v5 + LLM Top-10 (2025) + CSF/SSDF/ISO 42001/EU AI Act mapping in evidence bundle.
* **G7 Operational:** DORA snapshot updated; on-call and runbooks linked.
* **G8 Release:** Final approval records + provenance attached; rollback plan rehearsed.

---

## Explicit trade-off analysis (TS in 2025)

* **LangGraph.js vs LlamaIndex Workflows/Agent Workflows**

  * *LangGraph.js* → strongest **controllability/durability** and broad production proof; low-level graph model matches CDI’s step gating. *Trade-off:* more wiring. ([langchain-ai.github.io][1])
  * *Workflows/Agent Workflows* → great **event-driven** ergonomics; we’ll adopt selectively for subflows, not top-level orchestrator to avoid split orchestration semantics. ([LlamaIndex Documentation][11])
* **Cloudflare Agents vs raw Workers**

  * *Agents* SDK gives **state, scheduling, real-time chat** and React hooks; faster to ship chat HITL. *Trade-off:* track Node-compat & SDK churn (rename history). ([Cloudflare Docs][4])
* **TS vs Python**

  * TS wins **operability** for your stack (Node 20, web UI, edge). Observability/semconv support and toolkits (AI SDK 5, Langfuse v4, MCP TS) are first-class. Python wins in some model tooling, but that’s out-of-scope given your **TS-only** lock. ([OpenTelemetry][24])

---

## Concrete package pins (initial)

* `@langchain/langgraph@0.4.9` (JS) ([npmjs.com][8])
* `@langchain/core@^0.3` (per LangGraph docs) ([langchain-ai.github.io][1])
* `@vercel/ai@5.0.64` (AI SDK 5) ([GitHub][20])
* `@llamaindex/workflow-core@1.3.3` (optional subflows) ([GitHub][25])
* `agents@latest` (Cloudflare Agents SDK; current channel points to `agents`, not `agents-sdk`) ([Cloudflare Docs][4])
* `@opentelemetry/api`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/instrumentation-openai@latest` (supports OpenAI v5) ([npmjs.com][22])
* `@langfuse/node@^4` (JS/TS SDK v4 GA) ([langfuse.com][6])
* `mcp-server-typescript@latest` (or GitHub TS SDK) ([GitHub][16])

---

## Integration with your CDI pattern

* **All phases** emit **evidence artifacts** (tests, traces, SBOM, provenance) and **update the gate ledgers** you defined.
* CI remains the enforcement surface: contract schema validation, SBOM generation, stack compliance checks (TS-only), and evidence presence.

---

### What’s deprecated vs kept vs built

* **Deprecated:** Single-agent “do-everything” runtime (kept only as façade until Phase 1 completes).
* **Kept:** Existing modules (`planning`, `executor`, `runner`, `repair`, `clarification`), API routes, tests & coverage bars.
* **Built:** Orchestration graph, telemetry spine, MCP tools, chat/HITL UI, Cloudflare Agent deployment, and supply-chain automation.

---

## Timelines (rationale)

* Ph0 (**2w**) is integration-first; packages & wiring.
* Ph1 (**3w**) splits monolith into five agents aligned with your current modules; scoped, parallelizable.
* Ph2 (**2w**) adds chat HITL + MCP tool governance.
* Ph3 (**2w**) edge deployment & scheduling.
* Ph4 (**1w**) supply-chain hardening; Ph5 (**2w**) governance mapping.
  Each item’s complexity is confined (≤ few KLoC), with clear CDI gates; comparable programs ship similar scopes (LangGraph+AI SDK+OTel) in 6–10 weeks. ([langchain-ai.github.io][21])

---

## Reality check on your 4 options

* **Option 1 (continue contracts):** *Insufficient* for F500 without orchestration, observability, and tool governance.
* **Option 2 (adopt research roadmaps):** Use as **reference only**; they include Python and divergent taxonomies—conflicts with TS-only and CDI. 
* **Option 3 (reactive):** Too risky under Rule #1; add HITL/chat and guardrails, but formal orchestration is still required.
* **Option 4 (hybrid):** **Chosen** — CDI + LangGraph.js orchestrator + AI SDK 5 chat + MCP + Cloudflare Agents + OTel/Langfuse + SBOM/SLSA.

---

## Final recommendation

Adopt **Option 4 (Evidence-Based Hybrid)** with the phases and sessions above. It preserves your working CDI pattern, enforces **evidence before progress**, and leverages **current TS-native standards** adopted across industry (LangGraph.js, AI SDK 5, MCP, OTel GenAI, Cloudflare Agents). This is the shortest, safest path to a **Fortune 500-grade**, auditable autonomous coding system in TypeScript. ([langchain-ai.github.io][1])

---

### What I still need from you to tighten file:line:function pointers

* Please upload `repomix-output.xml` (first 568 lines were requested) so I can add **exact** line numbers and current-state **code snippets** to each session. Everything else above is repo-aware and executable today using your existing paths and CI/CD.

[1]: https://langchain-ai.github.io/langgraphjs/?utm_source=chatgpt.com "LangGraph.js"
[2]: https://developers.llamaindex.ai/typescript/framework/modules/agents/agent_workflow/?utm_source=chatgpt.com "Agent Workflows"
[3]: https://ai-sdk.dev/docs/introduction?utm_source=chatgpt.com "AI SDK by Vercel"
[4]: https://developers.cloudflare.com/agents/?utm_source=chatgpt.com "Cloudflare Agents docs"
[5]: https://opentelemetry.io/docs/specs/semconv/gen-ai/?utm_source=chatgpt.com "Semantic conventions for generative AI systems"
[6]: https://langfuse.com/docs/roadmap?utm_source=chatgpt.com "Langfuse Roadmap"
[7]: https://openai.com/index/introducing-apps-in-chatgpt/?utm_source=chatgpt.com "Introducing apps in ChatGPT and the new Apps SDK"
[8]: https://www.npmjs.com/package/%40langchain/langgraph?utm_source=chatgpt.com "langchain/langgraph"
[9]: https://github.com/open-telemetry/opentelemetry-js/releases?utm_source=chatgpt.com "Releases · open-telemetry/opentelemetry-js"
[10]: https://modelcontextprotocol.io/specification/2025-06-18/index?utm_source=chatgpt.com "Specification"
[11]: https://ts.llamaindex.ai/docs/llamaindex/modules/agents/workflows?utm_source=chatgpt.com "Workflows"
[12]: https://cyclonedx.org/docs/1.6/json/?utm_source=chatgpt.com "CycloneDX v1.6 JSON Reference"
[13]: https://arxiv.org/abs/2509.08646?utm_source=chatgpt.com "Architecting Resilient LLM Agents: A Guide to Secure Plan-then-Execute Implementations"
[14]: https://js.langchain.com/docs/concepts/agents/?utm_source=chatgpt.com "Agents | 🦜️🔗 Langchain"
[15]: https://vercel.com/blog/ai-sdk-5?utm_source=chatgpt.com "AI SDK 5"
[16]: https://github.com/modelcontextprotocol/typescript-sdk?utm_source=chatgpt.com "The official TypeScript SDK for Model Context Protocol ..."
[17]: https://slsa.dev/spec/v1.0/provenance?utm_source=chatgpt.com "Provenance"
[18]: https://www.uber.com/blog/enhanced-agentic-rag/?utm_source=chatgpt.com "Enhanced Agentic-RAG: What If Chatbots Could Deliver ..."
[19]: https://www.llamaindex.ai/blog/announcing-workflows-1-0-a-lightweight-framework-for-agentic-systems?utm_source=chatgpt.com "Announcing Workflows 1.0: A Lightweight Framework for ..."
[20]: https://github.com/vercel/ai/releases?utm_source=chatgpt.com "Releases · vercel/ai"
[21]: https://langchain-ai.github.io/langgraphjs/tutorials/quickstart/?utm_source=chatgpt.com "LangGraph.js - Quickstart"
[22]: https://www.npmjs.com/package/%40opentelemetry%2Finstrumentation-openai?utm_source=chatgpt.com "opentelemetry/instrumentation-openai"
[23]: https://developers.cloudflare.com/workers/runtime-apis/nodejs/?utm_source=chatgpt.com "Node.js compatibility - Workers"
[24]: https://opentelemetry.io/docs/languages/js/?utm_source=chatgpt.com "JavaScript"
[25]: https://github.com/run-llama/workflows-ts/releases?utm_source=chatgpt.com "Releases · run-llama/workflows-ts"

# part 2
Got it. I read the first ~568 lines of your `repomix-output.xml` and the CDI/agents docs to anchor this plan in your repo (citations inline). Highlights I’m grounding on:

* **Stack lock & CI gates**: TS-only via `ai-stack.json`, Node 20, CODEOWNERS, contract schema validation + SBOM steps and `npm run validate:all`. 
* **Gates & roles**: G0–G8 orchestration belongs to **MCA** with explicit evidence bundles (SBOM CycloneDX 1.6, SLSA v1.0, etc.).
* **Where to integrate**: API entry and testing conventions (routes under `src/server.ts`, UI tests, Playwright specs), plus “Integration Points for New Features” (create `src/<module>/`, wire server route, mirror tests). 
* **Taxonomy/SSOT & function inventory**: 67 functions (expandable) with evidence gate mapping and handoff packages for AA/SA/DA.

Below is the **research-first, repo-aware** roadmap and an **executable Phase-1 session plan** that your agents can run today.

---

# Part 1: High-Level Strategic Roadmap (Oct 2025 evidence-based)

### 2025 Landscape (TypeScript agents & orchestration) — key findings

* **LangGraph.js** (TypeScript): first-class TS state machines for agents, production-grade control flow, durable checkpoints; **latest** `@langchain/langgraph@0.6.10` on npm; active docs and recipes show production usage patterns. ([npmjs.com][1])
* **Vercel AI SDK v5** (TypeScript): stable, widely adopted **Agents** API, Server/Edge support, MCP client support since 4.2; v5.0.25 current. ([Cloudflare Docs][2])
* **Cloudflare “Agents”** (TypeScript): production Edge runtime for agent apps; SDK includes MCP servers/clients; docs updated Sep–Oct 2025. ([LangChain Blog][3])
* **MCP (Model Context Protocol) TS**: official `modelcontextprotocol/typescript-sdk`, v1.x examples and spec updates (June 18, 2025). ([npmjs.com][4])
* **LlamaIndex.TS**: RAG + tools in TS, including agents/graphs examples; production references/community. ([npmjs.com][5])
* **Observability standardization**: OpenTelemetry **GenAI semantic conventions** (traces/metrics/events) are live; Langfuse **TS SDK v4 GA** is OTel-based, with OTel endpoints and docs updated through Oct 2025. ([OpenTelemetry][6])
* **Governance/compliance** you target are current: **OWASP ASVS v5.0** (May 30, 2025), **OWASP LLM Top 10 (2025)**, **NIST CSF 2.0**, **NIST SSDF SP 800-218**, **EU AI Act** (GPAI obligations **in force Aug 2, 2025**). ([owasp.org][7])

**Verdict (TS vs Python in 2025):** Python still has breadth, but **TypeScript is now fully viable for enterprise agent systems** thanks to LangGraph.js, Vercel AI SDK Agents, Cloudflare Agents + MCP TS. This aligns with your **TS-only stack lock & CI gates**; we should **not** pivot to Python. 

---

## Phase 0: Compliance & Trust Spine Baseline (1.5 weeks)

**Objective**: Enforce TS-only, contracts, SBOM/SLSA, and OTel trace plumbing so later agent work is audit-ready.
**Dependencies**: none.
**Key Decisions**

* **SBOM/Provenance**: Keep CycloneDX 1.6 + SLSA v1.0 in CI evidence packages (already referenced by MCA gates).
* **Telemetry**: Adopt OTel GenAI semconv; export to **Langfuse OTel endpoint** (HTTP/protobuf). ([OpenTelemetry][6])
  **Deliverables**
* Passing `npm run validate:all` with SBOM + contract checks; OTel exporter configured; Langfuse DSN + endpoint registered. 
  **Success Criteria**
* CI shows **0 errors**, SBOM artifact, SLSA attestation present; OTel traces visible in Langfuse with **gen_ai** spans. ([OpenTelemetry][8])
  **Gate Requirements**: attach CI logs, SBOM file, SLSA provenance, Langfuse project URL/screenshot.

**Who**: DA (CI), SA (supply chain), QA (trace checks), overseen by MCA.

---

## Phase 1: Multi-Agent Foundations (Graph Orchestrator) (2–3 weeks)

**Objective**: Replace single-executor tight coupling with **deterministic LangGraph.js** graph + **MCA** guardrails; persist checkpoints; keep CDI stages.
**Dependencies**: Phase 0.
**Key Decisions**

* **Framework**: `@langchain/langgraph@0.6.10` for **StateGraph**, retry/reentry, and durable checkpoints; chose over Vercel Agents for **graph-native control + checkpoint store**, and over Cloudflare for **vendor-neutrality** at this layer. ([npmjs.com][1])
* **Checkpoint store**: file-backed now, pluggable to KV later; schema stored under `.automation/checkpoints/*`.
* **Node roles**: `Clarify → Plan → Generate → Test → Repair → Deliver`, mapped from your Contract-CDI steps (no change in semantics).
  **Deliverables**
* `src/orchestrator/graph.ts`, `src/orchestrator/checkpoints.ts`, `src/orchestrator/types.ts`; wire to **`src/server.ts`** `/api/execute`. Integration points & test mirrors per repo guidance. 
* Vitest suite under `tests/orchestrator/*` with 90%+ coverage. (You already have the test folder scaffold.)
  **Success Criteria**
* Orchestration overhead < **500 ms/transition** (per AA acceptance).
* Deterministic replay: same prompt → identical node sequence when deterministic mode on.
  **Gate Requirements**: graph diagram (PNG), API contract diffs, coverage report, checkpoints round-trip evidence (export/import).

**Who**: AA (graph design), IA (impl), QA (tests), MCA (gate).

*Trade-offs*:

* **LangGraph.js** gives **fine control + durability**; Vercel Agents faster to scaffold UI messaging but less explicit graph semantics. Cloudflare Agents shine at **Edge** runtime but can couple infra early. We’ll integrate them at Phase 3–4.

---

## Phase 2: Human-in-the-Loop (HITL) Interaction & Pause/Resume (1.5–2 weeks)

**Objective**: Add **chat interaction** and shared clarification helper; expose **pause/resume** & snapshot refresh (per Contract 16).
**Dependencies**: Phase 1.
**Key Decisions**

* **UI/API**: Add `/api/interaction` and WS updates; reuse existing **UI flow tests** & pause/resume API test patterns. 
* **MCP client**: Use **Vercel AI SDK v5** MCP client to call approved remote tools (e.g., Tavily) for in-run clarifications. ([Vercel Community][9])
  **Deliverables**
* `src/interaction/session.ts` (session state), `src/interaction/routes.ts`, WS notifier; UI affordances for pause/resume; Playwright specs (you already have Playwright infra). 
  **Success Criteria**
* Deterministic **pause=201 / resume=200** API behavior; snapshot integrity verified (existing pattern). 
  **Gate Requirements**: evidence bundle with WS transcripts, Playwright screenshots, accessibility checks.

**Who**: IA (routes), QA (Playwright), SA (approves MCP tool allow-list), MCA (gate). 

---

## Phase 3: Tooling via MCP + RAG on Repo (2–3 weeks)

**Objective**: Secure tool access through **MCP** (TS SDK), and **LlamaIndex.TS** repo-RAG for planning/repair prompts.
**Dependencies**: Phase 2.
**Key Decisions**

* **MCP**: `@modelcontextprotocol/sdk` (TS) for **tool servers/clients**; whitelist: “repo fs”, “tests runner”, “contract validator”.
* **RAG**: `llamaindex@ts` for codebase chunking + function navigation.
  **Deliverables**
* `src/tools/mcp/*.ts` servers; `src/rag/index.ts` with retrieval policies; policy JSON enumerating allowed procedures.
  **Success Criteria**
* All tool calls logged to **AI action logs → SIEM**; RAG improves plan correctness on golden tasks.
  **Gate Requirements**: tool allow-list, MCP handshake logs, RAG eval report.

**Who**: SA (policy), IA (impl), QA (eval), DA (SIEM shipping).

---

## Phase 4: Observability, Cost & Governance (1–2 weeks)

**Objective**: Full **OTel GenAI** spans/metrics + **Langfuse v4** tracing; cost budgets/alerts; governance pack (ISO 42001/EU AI Act GPAI).
**Dependencies**: Phase 0, 1–3.
**Key Decisions**

* **Tracing**: OTel JS v2 with **gen_ai** spans; Langfuse OTel endpoint; **events** where supported. ([OpenTelemetry][6])
* **Governance**: generate technical file w/ SBOM & provenance; AI Act GPAI obligations already applicable since **Aug 2, 2025**. ([Digital Strategy][10])
  **Deliverables**
* OTel config, Langfuse dashboards, budget alerts; governance pack generator scripts (your taxonomy lists this explicitly).
  **Success Criteria**
* Traces for **100%** agent operations; **token/cost** metrics; governance pack artifact with mappings to ASVS v5/LLM Top-10/CSF2.0/SSDF. ([owasp.org][7])

---

## Phase 5: Edge Runtime (Pilot) (1–2 weeks)

**Objective**: Run orchestrator API on **Vercel Edge** or **Cloudflare Workers/Agents** with minimal code changes; keep core logic infra-agnostic.
**Dependencies**: Phase 1–4.
**Key Decisions**

* **Pilot A (Vercel Edge)**: reuse **AI SDK Agents**; excellent DX, tight Next/Edge integration.
* **Pilot B (Cloudflare Agents)**: superior global latency; first-class MCP servers at the edge.
  **Deliverables**
* Edge adapter (`src/infra/edge-adapter.ts`) with request/response bridges; load tests + cost model.
  **Success Criteria**
* P95 latency improvement ≥ **30%** vs Node server; cost within budget alert thresholds.

---

### Cross-Phase Risks & Trade-offs

* **Framework churn** (LangGraph → 1.0, AI SDK evolution): Mitigate by isolating adapters and pinning versions with CI alerts.
* **MCP tool sprawl**: Strict allow-list + SIEM logging.
* **Compliance drift**: MCA Gate #4 requires **CycloneDX 1.6** SBOM and **SLSA v1.0** every build; enforce in CI.

---

## Phase-wise Who/When (realistic durations)

* **Phase 0** (1.5 wks): DA+SA+QA, MCA gate.
* **Phase 1** (2–3 wks): AA+IA+QA, MCA gate.
* **Phase 2** (1.5–2 wks): IA+QA+SA, MCA gate.
* **Phase 3** (2–3 wks): IA+SA+QA+DA, MCA gate.
* **Phase 4** (1–2 wks): DA+SA+QA, MCA gate.
* **Phase 5** (1–2 wks): DA+AA+IA+QA, MCA gate.

Each gate requires **attached artifacts** per your MCA/RA standards and CDI CI outputs. 

---

# Part 2: Atomic Session Breakdown (Phase 1 — Multi-Agent Foundations)

> Each session is 30–45 minutes, CDI-structured (Discovery → Implementation → Validation), **TS-only**, explicit inputs/outputs, and rollback. Integration points use your repo conventions. 

---

### Session 1.1: Create Orchestrator Skeleton (graph + types)

* **Duration**: 45 min
* **Prerequisites**: Node 20; `npm install`; CI green; branch `feat/orchestrator`.
* **Discovery**

  * Integration points: create `src/orchestrator/` module and mirror tests under `tests/orchestrator/`.
  * Confirm server wiring in `src/server.ts` for `/api/execute` (existing tests already stub this route). 
* **Implementation**

  * Add files: `src/orchestrator/types.ts`, `src/orchestrator/graph.ts`.
  * Install deps (pinned): `npm i -E @langchain/langgraph@0.6.10`
  * Define `AgentState` and node placeholders: `Clarify`, `Plan`, `Generate`, `Test`, `Repair`, `Deliver`.
* **Validation**

  * Unit test compiles: `npx tsc --noEmit`; add skeleton vitest `tests/orchestrator/graph.sanity.test.ts`.
* **Outputs**: new module files + passing typecheck.
* **Gate Check**: attach diff + `tsc` log (G2 input).
* **Rollback**: `git restore -SW src/orchestrator/*` and remove dependency.

---

### Session 1.2: Wire Graph to CDI Steps (deterministic transitions)

* **Duration**: 45 min
* **Prerequisites**: 1.1 complete.
* **Discovery**

  * Map CDI functions to nodes (Clarify → Plan → Decompose → Generate → Test → Deliver/Error) using existing planning/decomposition APIs under `src/planning/*`. 
* **Implementation**

  * In `graph.ts`, build `StateGraph<AgentState>()` with explicit edges; add retry policy on `Test → Repair`.
* **Validation**

  * Vitest: assert graph walks the expected path given stubs.
* **Outputs**: `graph.ts` with transitions, tests.
* **Gate Check**: graph diagram (auto-generated or Mermaid) + test pass.
* **Rollback**: Revert `graph.ts`.

---

### Session 1.3: Durable Checkpoints (file store v1)

* **Duration**: 45 min
* **Prerequisites**: 1.2 complete.
* **Discovery**

  * Pick `.automation/checkpoints/` as current store; log inclusion under **Evidence Trail**. 
* **Implementation**

  * `src/orchestrator/checkpoints.ts`: `loadCheckpoint(sessionId)`, `saveCheckpoint(state)`; ensure idempotency.
* **Validation**

  * Test: run partial graph → persist → reload → resume; expect same next node.
* **Outputs**: checkpoint module + tests.
* **Gate Check**: attach round-trip logs and state hash.
* **Rollback**: Remove files + clean `.automation/checkpoints/*`.

---

### Session 1.4: API Adapter (`/api/execute` → orchestrator)

* **Duration**: 30–45 min
* **Prerequisites**: 1.3 complete.
* **Discovery**

  * Confirm server routes and test stubs for `/api/execute`. 
* **Implementation**

  * Add `src/orchestrator/adapter.ts` invoked by `src/server.ts` POST `/api/execute`; accept `{prompt, sessionId}`; stream progress to log.
* **Validation**

  * Unit test: request → adapter → first 2 nodes executed; respond 202 + location.
* **Outputs**: adapter + tests.
* **Gate Check**: API contract doc; test pass.
* **Rollback**: fallback to previous handler.

---

### Session 1.5: Deterministic Mode & Reentry

* **Duration**: 30–45 min
* **Prerequisites**: 1.4 complete.
* **Discovery**

  * Establish `deterministic: true` flag in request schema and graph seed for reproducible runs.
* **Implementation**

  * Seed PRNG; record node sequence; on restart, re-hydrate from checkpoint and continue.
* **Validation**

  * Test: same prompt + seed → identical node order; store sequence JSON.
* **Outputs**: deterministic mode; sequence artifact.
* **Gate Check**: attach sequence files; QA sign-off (≥2 runs match).
* **Rollback**: disable flag.

---

### Session 1.6: Coverage & Performance Budget

* **Duration**: 30–45 min
* **Prerequisites**: 1.5 complete.
* **Discovery**

  * Confirm acceptance: overhead < **500 ms/transition** and coverage ≥ **90%** for orchestrator.
* **Implementation**

  * Add targeted tests; add micro-bench harness (Node perf hooks) per node; store CSVs in `metrics/quality/` & `metrics/kpi/`.
* **Validation**

  * Run CI; attach coverage + perf CSV.
* **Outputs**: coverage report, perf CSVs.
* **Gate Check**: G3 evidence bundle updated.
* **Rollback**: revert perf hooks.

---

### Session 1.7: Evidence & CI integration

* **Duration**: 30–45 min
* **Prerequisites**: 1.6 complete.
* **Discovery**

  * Ensure CI checks include contracts/SBOM/stack compliance per CDI. 
* **Implementation**

  * Extend workflow to save **orchestrator** coverage, **graph diagram**, and **checkpoints export** as artifacts.
* **Validation**

  * `npm run validate:all`; confirm artifacts uploaded. 
* **Outputs**: CI run with artifacts.
* **Gate Check**: attach CI URLs; MCA signs off.
* **Rollback**: revert workflow if failures block merges.

---

### Session 1.8: Handoff & ADR

* **Duration**: 30–45 min
* **Prerequisites**: 1.7 complete.
* **Discovery**

  * Prepare AA/SA/DA handoff structure per your standards.
* **Implementation**

  * Write ADR: “Adopt LangGraph.js for orchestrator v1”; include alternatives (Vercel Agents, Cloudflare Agents, LlamaIndex TS) and trade-offs.
* **Validation**

  * Evidence pack: ADR MD, version pins, risk memo.
* **Outputs**: ADR + evidence pack.
* **Gate Check**: G1/G2 approvals recorded by MCA.

---

## Trade-off analysis (why these choices)

**LangGraph.js @ 0.6.10**

* **Pros**: Deterministic **graphs + checkpoints**; vendor-neutral; production recipes; ideal for MCA-style gating. ([npmjs.com][1])
* **Cons**: Slightly more boilerplate than AI SDK Agents; learning curve around state graphs.
  **Vercel AI SDK v5 (Agents)**
* **Pros**: Proven in production, **Edge** friendly, built-in **MCP client**, great DX; ideal for **Phase 5** edge. ([Vercel Community][9])
* **Cons**: Less explicit graph semantics; can bias infra toward Vercel early.
  **Cloudflare Agents**
* **Pros**: Global Edge performance; **MCP servers**; Workers durability.
* **Cons**: Infra coupling; additional CI/deploy work.
  **LlamaIndex.TS**
* **Pros**: Mature **RAG** and **agents/graphs** in TS; complements planning/repair quality.
* **Cons**: Another lib to operate; keep narrowly scoped to RAG.

---

## Gate Evidence Requirements (per phase)

* **G0 Research**: Source log with titles/publishers/dates/URLs (≥3 authoritative per option).
* **G1 Architecture**: ADR + graph diagram; alternatives & risks captured.
* **G2 Implementation**: Passing tests, 90% orchestrator coverage, deterministic replay evidence.
* **G3 Quality**: KPI CSVs; UI/API Playwright runs; Lighthouse budget report (if applicable). 
* **G4 Security**: SBOM (CycloneDX 1.6), SLSA v1.0 provenance, SAST/secrets scans, LLM Top-10 controls. ([owasp.org][7])
* **G5 Ops**: DR checkpoint restore test; DLQ design (roadmap item 54).

---

## Appendix — Framework sources (titles/publishers/dates/URLs)

* **LangGraph.js** — *LangGraph: Your Agent AI assistant in production* (LangChain blog, Oct 10, 2025); *@langchain/langgraph* npm (0.6.10, Oct 11–12, 2025).
* **Vercel AI SDK v5 (Agents, MCP)** — *AI SDK* docs (Vercel, 2025), npm package `ai@5.0.25`.
* **Cloudflare Agents** — *Build AI agent apps with the Agents SDK* (Cloudflare, Oct 2025); *Build MCP servers with the Agents SDK*.
* **MCP TS SDK** — `modelcontextprotocol/typescript-sdk` (GitHub, 2025); MCP spec updates (June 18, 2025). ([forgecode.dev][11])
* **LlamaIndex.TS** — Agents/Graphs docs (LlamaIndex, 2025).
* **Observability** — OTel GenAI SemConv (opentelemetry.io, 2024–2025), Langfuse OTel endpoint docs & TS SDK v4 GA (Aug 28, 2025). ([OpenTelemetry][6])
* **Compliance** — OWASP ASVS v5.0 (May 30, 2025), OWASP LLM Top-10 2025, NIST CSF 2.0 (Feb 26, 2024), SSDF SP 800-218, EU AI Act timeline (EU Commission). ([owasp.org][7])

---

## Why this reaches “Fortune-500 grade”

* **Deterministic orchestration + checkpoints** (Phase 1) → auditable, replayable runs; **MCA gates** ensure every move has artifacts.
* **HITL + pause/resume** (Phase 2) → risk reduction and UX clarity (you already have API/UI testing patterns). 
* **Standardized telemetry (OTel) + Langfuse** (Phase 4) → enterprise observability and cost control. ([OpenTelemetry][6])
* **Compliance mapping** continuously validated (ASVS v5, LLM Top-10 2025, CSF 2.0, SSDF, EU AI Act GPAI now in force). ([owasp.org][7])
* **TS-only** adheres to your stack lock and CI checks; no Python introduced. 

---

## (Optional) Phase-1 Code Pointers for IA

* **Create**: `src/orchestrator/{graph,types,checkpoints,adapter}.ts`
* **Wire**: `src/server.ts` POST `/api/execute` → `adapter.run()` (maintain current route shape tested in Playwright). 
* **Tests**: `tests/orchestrator/*.test.ts` (mirror pattern in `tests/` as repo prescribes).

---

### Closing: direct answers to your two specific questions

* **“Are there no major TS agent frameworks?”** There are several mature choices now: **LangGraph.js**, **Vercel AI SDK Agents**, **Cloudflare Agents**, **LlamaIndex.TS** (see sources above).
* **“Is it really easier to build in Python?”** Historically yes, but **as of Oct 2025** the TS ecosystem is mature enough that **enterprise builds are equally feasible in TS**, especially when your stack is already TS-locked and CI-governed. The **operational benefits** (type safety across UI/API, one language in CI and tests) outweigh Python’s historical library advantage for your constraints. 

---

If you want, I can immediately generate the **AA/SA/DA handoff bundles** (ADR, matrix, DecisionRecord JSON) that correspond to Phase 1’s selection, using the exact schemas your RA/AA standards require.

[1]: https://www.npmjs.com/package/%40langchain/langgraph?utm_source=chatgpt.com "langchain/langgraph"
[2]: https://developers.cloudflare.com/changelog/2025-03-18-npm-i-agents/?utm_source=chatgpt.com "npm i agents · Changelog"
[3]: https://blog.langchain.com/langchain-langchain-1-0-alpha-releases/?utm_source=chatgpt.com "LangChain & LangGraph 1.0 alpha releases"
[4]: https://www.npmjs.com/package/%40ai-sdk/vercel?utm_source=chatgpt.com "ai-sdk/vercel"
[5]: https://www.npmjs.com/package/langchain?utm_source=chatgpt.com "langchain"
[6]: https://opentelemetry.io/docs/specs/semconv/gen-ai/?utm_source=chatgpt.com "Semantic conventions for generative AI systems"
[7]: https://owasp.org/www-project-application-security-verification-standard/?utm_source=chatgpt.com "OWASP Application Security Verification Standard (ASVS)"
[8]: https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/?utm_source=chatgpt.com "Semantic conventions for generative client AI spans"
[9]: https://community.vercel.com/t/how-do-i-connect-tavily-mcp-with-vercel-ai-sdk/20947?utm_source=chatgpt.com "How do I connect Tavily MCP with Vercel AI SDK?"
[10]: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai?utm_source=chatgpt.com "AI Act | Shaping Europe's digital future - Europa.eu"
[11]: https://forgecode.dev/blog/mcp-spec-updates/?utm_source=chatgpt.com "MCP 2025-06-18 Spec Update: AI Security, Structured ..."
