# Codex

 read Claude’s review and checked each point against the repo and tests. Here’s the evidence-based verdict and a corrected, concrete plan.

Verdict

Claude is right on the critical gaps: version awareness, function signature mismatches, and durability scope.
Your existing wins remain valid: runtime activation, parity/replay/perf evidence, and the crucial “Vitest alias trap” insight.
Evidence

Vitest alias trap exists:
vitest.config.ts:62 maps @langchain/langgraph to tests/setup/langgraph-runtime-stub.ts.
tests/orchestrator/parity.test.ts:3 imports ../../src/server.js (thus the stubbed graph in tests).
Current runtime flag + invoke are real:
src/server.ts:1555 sets useLangGraph.
src/server.ts:1751 invokes runWithLangGraph(...) and returns 202 earlier with Location.
Graph uses real StateGraph but no checkpointer:
src/orchestrator/graph.ts:1 imports @langchain/langgraph and compile() with no checkpointer (no durability).
Version mismatch risk:
package.json has @langchain/langgraph: "0.4.9", not 0.6.x.
Function signature mismatch (plan vs repo):
src/clarification/generateQuestions.ts:28 is generateQuestions(missing: MissingInfoType[], prompt?: string), not (prompt: string).
OpenAI provider is real and used by generateJSON:
src/llm/providers/openai.ts:72 defines OpenAIProvider calling the OpenAI chat API.
Node fetch availability (no node-fetch needed): engines >=20.10.0 <21 in package.json.
Corrected Plan (Finalized, repo-specific, evidence-backed)

Phase 0.1 — Interface Discovery (2–3 hours)

Confirm function signatures to avoid compile-time breaks:
Clarify: src/clarification/generateQuestions.ts:28 requires MissingInfoType[] + optional prompt.
Plan: src/planning/decomposeTask.ts:195 accepts (prompt, clarifications?).
Execute plan: src/planning/executeTaskPlan.ts:80 expects (plan, context).
Runner and repair already integrated in src/server.ts:1151 onward; reuse those flows inside nodes.
Outcome: A minimal adapter map for graph nodes that calls existing module functions with correct args.
Phase 0.2 — Version Lock (1 hour)

Stick with @langchain/langgraph@0.4.9 already in package.json to avoid dependency churn.
Do not reference 0.6.x-only APIs. Validate that StateGraph, START, END are sufficient (present in src/orchestrator/graph.ts:1).
Note: Checkpointer API existed but you currently compile without it; durability stays out-of-scope for this pass.
Phase 1 — Multi‑Node Graph (0.75–1.25 days)

File: src/orchestrator/graph.ts:1
Implement nodes using existing modules, preserving current server behavior:
Nodes: clarify → plan → generate → test → conditional (deliver | repair loop) → deliver.
Use generateQuestions(missing: MissingInfoType[], prompt?: string) correctly; compute missing via your existing logic or a conservative empty set when not applicable.
Planning via decomposeTask(prompt, clarifications?).
Generation via generateJSON(...) as orchestrated in runSingleExecution path (src/server.ts:1080–1340).
Testing via runInSandbox and repair via multiTurnRepair (src/server.ts:1188 onward shows integration).
Edges: addEdge(START, "clarify"), addEdge("clarify","plan"), addEdge("plan","generate"), addEdge("generate","test"), conditional to “deliver” or “repair” and loop.
Keep compile() without a checkpointer (dev-only durability later in Phase 7).
Update the executions store during transitions using existing helpers (you already use createExecution, updateExecution, completeExecution, failExecution in server; mirror that logic if needed in graph).
Phase 2 — Server Invariants (0.5 day)

Preserve the API:
POST /api/execute returns 202 + Location when AGENTS_RUNTIME=langgraph (already true at src/server.ts:1751 region).
Ensure payload fields passed into runWithLangGraph match node expectations (prompt, projectName, clarifications).
Do not break legacy StepQueue path (untouched else-branch).
Phase 3 — Real‑LLM E2E (HTTP, no alias) (0.5 day)

Add an opt‑in test that uses live HTTP and Node 20 global fetch:
Path: tests/e2e/langgraph-real-llm.e2e.test.ts
Only run when RUN_REAL_LLM=1 is set.
Procedure:
Terminal A: set -a; source .env; set +a && AGENTS_RUNTIME=langgraph npm run dev
Terminal B: RUN_REAL_LLM=1 vitest tests/e2e/langgraph-real-llm.e2e.test.ts --run
Test does: POST /api/execute with small prompt → expects 202 with executionId → polls GET /api/executions/:id until completed (≤120s) → asserts output present.
This avoids the Vitest alias (vitest.config.ts:62) by not importing server code in the test.
Phase 4 — Evidence & Auditing (0.25 day)

Append a JSONL entry after the e2e run:
Path: .automation/evidence/langgraph/actions.jsonl
Fields: timestamp, cmd, executionId, status, duration_ms.
Keep existing evidence flows intact; npm run state:next:auto should not be required for e2e, but evidence is persisted.
Phase 5 — UI Toggle (optional, 0.25 day)

If UI forces StepQueue, add runtime override:
Client: include ?runtime=langgraph or X-Agents-Runtime: langgraph.
Server change:
src/server.ts in POST /api/execute: prefer req.query.runtime or header over process.env (keep default to env).
Verify clicking “Execute” results in 202 and eventual completion.
Phase 6 — Quality Gates (0.25 day)

Run validators:
npm run lint
npm run typecheck
Unit tests: npm test (mocks remain for coverage). Focused execute subset if needed:
VITEST_MIN_LINES=0 VITEST_MIN_BRANCHES=0 VITEST_MIN_FUNCTIONS=0 VITEST_MIN_STATEMENTS=0 AGENTS_RUNTIME=langgraph npm test -- -t execute
Confirm no warnings and zero API drift.
Phase 7 — Durability (Production-Ready) (0.75–1 day)

Scope this as a follow‑up to keep this pass focused:
Dev checkpointer: MemorySaver from @langchain/langgraph-checkpoint is suitable for local/dev but not HA/multi‑instance.
Production: plan a persistent checkpointer (e.g., Postgres/Redis) and resume semantics with thread_id.
Decision: either accept “no durability” for now (current state: src/orchestrator/graph.ts:1 compiles without checkpointer) or add MemorySaver for dev and ticket a production checkpointer.
Acceptance Criteria

Real graph orchestration (multi-node + conditional loop) lives in src/orchestrator/graph.ts:1 and executes via AGENTS_RUNTIME=langgraph, without breaking the API.
E2E test (HTTP, no imports) passes with a real OpenAI key:
Command: server in one shell; in another RUN_REAL_LLM=1 vitest tests/e2e/langgraph-real-llm.e2e.test.ts --run
Evidence captured at .automation/evidence/langgraph/actions.jsonl including executionId.
Lint, typecheck pass; unit tests remain green.
Timeline

2.5–3.5 days total:
Discovery + version lock: 0.5 day
Multi-node graph: 1–1.25 days
Server invariants + e2e test: 1 day
Evidence, UI toggle (optional), quality gates: 0.5 day
Durability plan (optional dev saver now, prod later): 0.75–1 day
If you want, I can draft the exact tests/e2e/langgraph-real-llm.e2e.test.ts and a minimal multi‑node graph.ts skeleton aligned with your current function signatures (using the correct generateQuestions(missing, prompt) and existing plan/repair/test flows).