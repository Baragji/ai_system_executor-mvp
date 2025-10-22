I’ll read the three docs, then compare 04_5%_to_100%_plan.md against the repo and give you a concrete go/no‑go plus next steps.

Context Review

docs/08_181025_todays_status/01_explaining_workflow_system.md: Explains the workflow gates and evidence flow. Notes that LangGraph tests (replay, parity, performance) were executed under flag with timestamps/evidence captured. Gate auto‑update is in place.
docs/08_181025_todays_status/02_understanding_langgraph_current_state.md: Confirms current implementation is a minimal one‑node StateGraph wrapper around StepQueue. Mocks are used in tests; no live LLM evidence. Highlights feature gaps (multi‑node, checkpoints, HITL, conditional routing).
docs/08_181025_todays_status/03_external_review.md: Re-frames anger into a staged approach: minimal integration first, then wire real LLM e2e and incrementally layer full graph capabilities.
Alignment Verdict

High-level intent: Aligned. 04_5%_to_100%_plan.md aims to deliver a real multi‑node LangGraph with durability, HITL, and a gated real‑LLM e2e test behind the AGENTS_RUNTIME flag. That matches the repo’s direction and constraints.
Minor misalignments and tweaks needed:
Test HTTP client: plan uses node-fetch; repo does not depend on it. Use Node 20+ global fetch or keep using supertest only when importing the server is not required. For the real‑LLM e2e, prefer global fetch against an externally started server to avoid test aliasing of LangGraph.
Vitest alias: vitest.config.ts aliases @langchain/langgraph to a test stub. Ensure the e2e test only talks over HTTP to a separately started server (npm run dev) so the real library is used. Do not import server/graph in the e2e test.
Checkpointer import: plan imports @langchain/langgraph-checkpoint/MemorySaver. It is present transitively in the lockfile and works without adding a new dependency entry. If desired, you can explicitly justify it as part of the approved LangGraph stack (no new runtime beyond what’s already installed).
API stability: adding a HITL “approve” route is fine (non‑breaking). Keep POST /api/execute semantics identical (202 + Location).
Given the above, the plan is “mostly aligned” and requires the small adjustments listed. Below is the concrete, repo‑specific roadmap with exact steps, resources, and timeline.

Implementation Roadmap

Prereqs

Environment: Node 20+, TypeScript build, Vitest.
Keys: OPENAI_API_KEY in .env (present).
Flags: Use AGENTS_RUNTIME=langgraph to route new runtime.
Note on tests: Keep unit tests mocked for speed/coverage; add a gated e2e test for live LLM.
Phase 0: Live LLM Sanity (0.5 day)

Create a smoke script to call the existing OpenAI provider:
Path: scripts/smoke-openai.ts
Use src/llm/providers/openai.ts via existing provider API (OpenAIProvider already exists).
Run: set -a; source .env; set +a && tsx scripts/smoke-openai.ts
Success: prints a short response and exits 0.
Phase 1: Real Multi‑Node Graph (1–1.5 days)

Implement multi‑node StateGraph in src/orchestrator/graph.ts:1 with:
Nodes: clarify → plan → generate → test → conditional (deliver | repair loop) → deliver.
Edges: conditional via addConditionalEdges.
Checkpointer: MemorySaver from @langchain/langgraph-checkpoint with thread_id for durability.
HITL: insert an interrupt in clarify; provide a dev auto‑approve path controlled by HITL_AUTO_APPROVE=1.
Use existing modules: src/clarification/generateQuestions.ts, src/planning/decomposeTask.ts, src/planning/executeTaskPlan.ts, src/runner/runInSandbox.ts, src/repair/multiTurnRepair.ts.
Keep buildExecutionId and executionsStore updates consistent with current patterns:
Write transitions: started → running → completed/failed.
Wire logs and output to the store fields used by GET /api/executions/:id.
Phase 2: Server Wiring (0.5 day)

Confirm the flag branch already calls LangGraph:
src/server.ts:1555 runtime flag
src/server.ts:1751 fire‑and‑forget runWithLangGraph(...) and 202 + Location response
Adjust only if needed to pass prompt/projectName into the new graph entry while preserving current API behavior.
Optional: add POST /api/executions/:id/approve (non‑breaking) to support HITL resume later; for dev, auto‑approve via env to keep e2e simple.
Phase 3: Real‑LLM E2E Test (0.5 day)

Add opt‑in e2e test that uses live HTTP against a separately started server.
Path: tests/e2e/langgraph-real-llm.e2e.test.ts
Use Node’s global fetch (no node-fetch dependency).
Gating: run only if RUN_REAL_LLM=1.
Flow: POST /api/execute (202) → poll GET /api/executions/:id until completed or failed.
Assert: reaches completed, logs runtime=langgraph, and an output object exists.
Command:
Terminal A: set -a; source .env; set +a && AGENTS_RUNTIME=langgraph npm run dev
Terminal B: RUN_REAL_LLM=1 vitest tests/e2e/langgraph-real-llm.e2e.test.ts --run
Phase 4: Evidence + Docs (0.5 day)

Record an evidence line in .automation/evidence/langgraph/actions.jsonl with timestamp, command, executionId, and status.
Optional: add UI screenshot and output path to .automation/evidence/langgraph/ui/.
Update a short discovery note summarizing integration points:
src/server.ts:1555 (runtime switch), src/server.ts:1751 (invoke graph)
src/orchestrator/graph.ts:1 (multi‑node graph entry)
Phase 5: Validation + Quality Gates (0.5 day)

Run:
npm run lint
npm run typecheck
Unit tests: npm test (mocks remain in unit tests)
(Optional) Focused execute subset with thresholds disabled:
VITEST_MIN_LINES=0 VITEST_MIN_BRANCHES=0 VITEST_MIN_FUNCTIONS=0 VITEST_MIN_STATEMENTS=0 AGENTS_RUNTIME=langgraph npm test -- -t execute
Confirm no warnings and no API breakage.
Phase 6: UI Toggle (optional, 0.5 day)

If the UI forces StepQueue, add a runtime toggle:
Client: ?runtime=langgraph query param or X-Agents-Runtime: langgraph header.
Server: prioritize param/header over env in POST /api/execute.
Timeline

Total: 2.5–3.5 days (single engineer) including e2e and documentation.
Parallelizable: Phase 0 can be done while sketching Phase 1; Phase 4/5 after code lands.
Required Resources

OpenAI API budget for light e2e runs (small model like gpt-5).
Node 20+ and existing repo scripts.
No new dependencies:
Use Node’s global fetch in tests.
@langchain/langgraph-checkpoint is already installed transitively; using it does not add a new package to package.json.
Repo-Specific Modifications Needed

Replace node-fetch in the plan with native fetch to avoid adding a new dependency.
Ensure the e2e test does not import app/server to avoid the Vitest alias for @langchain/langgraph:
Start the server separately (npm run dev) and test over HTTP.
Keep the flag path returning 202 + Location and updating executionsStore to preserve API and polling semantics.
If you add HITL, guard it with HITL_AUTO_APPROVE=1 in dev until a full resume payload is wired.
Impact and Justification

Risk: Live LLM variability and latency. Mitigated with small prompt, generous timeout (≤120s), and minimal I/O.
Code complexity: Moderate increase in graph.ts; contained and feature-flagged; existing StepQueue remains for fallback.
Tests: Unit tests remain mocked for speed and coverage; e2e is opt‑in and not counted toward coverage thresholds.
Compliance: No breaking API changes; no new dependencies; TypeScript + ESLint remain green.
If you want, I can generate the exact file diffs for the multi‑node graph skeleton and the gated e2e test using global fetch, tuned to the repo’s module names and current server wiring.
