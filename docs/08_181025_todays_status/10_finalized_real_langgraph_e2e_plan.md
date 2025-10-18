# Finalized Plan — Real LangGraph Orchestration With Live LLM Evidence (Repo‑Aligned)

Authoritative sources used for validation:
- Repo files: `package.json`, `vitest.config.ts:62`, `src/server.ts:1555`, `src/server.ts:1751`, `src/orchestrator/graph.ts:1`, `src/llm/providers/openai.ts:72`, `src/llm/index.ts:89`, `src/runner/runInSandbox.ts:87`, `src/repair/multiTurnRepair.ts:273`, `src/planning/decomposeTask.ts:195`, `src/clarification/generateQuestions.ts:28`.
- NPM registry (queried locally): `@langchain/langgraph` dist-tags and deps; `@langchain/langgraph@0.4.9` deps include `@langchain/langgraph-checkpoint`.
- Official docs: LangGraph.js concepts/low-level (Annotation and StateGraph), and durable execution (checkpointer + `MemorySaver` with `thread_id`).

## Evidence‑Backed Review of 08 + 09

- Vitest alias trap: ACCEPTED.
  - Evidence: `vitest.config.ts:62` aliases `@langchain/langgraph` to a stub; importing `app` in tests yields the stubbed runtime.
- 0.4.9 includes checkpoint package: ACCEPTED.
  - Evidence: `npm view @langchain/langgraph@0.4.9 dependencies` shows `"@langchain/langgraph-checkpoint": "^0.1.1"`.
- Annotation‑based state schema is the preferred API: ACCEPTED.
  - Evidence: Official JS docs emphasize `Annotation.Root({...})` + `StateGraph(Annotation)`; checkpointer supplied in `compile({ checkpointer })`.
- Upgrade to `@langchain/langgraph@1.0.0` is a “5‑minute” change: REJECTED.
  - Evidence: `npm view @langchain/langgraph dist-tags` shows latest 1.0.0; peer deps require `@langchain/core ^1.0.1` and `zod`/`zod-to-json-schema`. Repo has `@langchain/core: 0.3.78` in `package.json`, so upgrade is non‑trivial and would cascade changes. Keeping 0.4.9 for now is safer.
- Function signatures used in earlier drafts: PARTIALLY ACCEPTED.
  - Evidence: Real signatures differ and are repository‑specific:
    - Clarify: `src/clarification/generateQuestions.ts:28` expects `(missing: MissingInfoType[], prompt?: string)`.
    - Plan: `src/planning/decomposeTask.ts:195` is `(prompt: string, clarifications?: ClarificationResponse)`.
    - Runner: `src/runner/runInSandbox.ts:87` signature confirms existing test runner.
    - Repair: `src/repair/multiTurnRepair.ts:273` signature confirms repair entrypoint.
  - Action: We will adapt node calls to match these exact signatures.
- Current runtime flag wiring and invoke are real: ACCEPTED.
  - Evidence: `src/server.ts:1555` sets `useLangGraph`; `src/server.ts:1751` fire‑and‑forgets `runWithLangGraph(...)` and returns `202` + `Location` earlier in the handler.

## Final Decisions

- Do not upgrade to LangGraph 1.0.0 in this pass due to peer dependency drift. Stay on `@langchain/langgraph@0.4.9` (as in `package.json`) and implement a real multi‑node StateGraph.
- Add a gated, HTTP‑level e2e test that exercises live LLM calls to prove real orchestration without the Vitest alias stub.
- Preserve existing API behavior (202 + `Location` + polling via `GET /api/executions/:id`).
- Keep durability (checkpointer) as a follow‑up; first deliver multi‑node orchestration + live LLM proof. Plan a persistent checkpointer in the next iteration.

## Implementation Steps (exact, repo‑aligned)

1) Interface discovery and adapters (2–3 hours)
- Confirm and document the call signatures for node implementations:
  - Clarify questions: `src/clarification/generateQuestions.ts:28`
  - Decompose plan: `src/planning/decomposeTask.ts:195`
  - Execute tests: `src/runner/runInSandbox.ts:87`
  - Repair loop: `src/repair/multiTurnRepair.ts:273`
  - LLM entrypoint: `src/llm/index.ts:89` (`generateJSON`)
- Outcome: A small adapter layer inside the graph nodes that calls these functions with correct args.

2) Build a multi‑node StateGraph (0.75–1.25 days)
- File: `src/orchestrator/graph.ts:1`
- Graph shape:
  - `START → clarify → plan → generate → test → (deliver | repair→test loop) → END`
- Nodes call existing modules with correct signatures and return a shared state containing at minimum: `prompt`, `projectName`, `files`, `test`, `repair`, `logs`, and a final `status`.
- Edges: fixed edges for linear stages; conditional edge after `test` to either `deliver` or `repair` (with a bounded loop).
- For this pass, compile without a checkpointer (durability follows later). Ensure executions store is updated at transitions using existing helpers already employed in the server code path.

3) Server invariants (0.5 day)
- File: `src/server.ts:1555`, `src/server.ts:1751`
- Ensure the `AGENTS_RUNTIME=langgraph` branch passes the correct `prompt`/`projectName` (and optional clarifications) into the graph entry while continuing to return `202` + `Location` and preserving StepQueue behavior for the legacy path.

4) Real‑LLM E2E (HTTP; no imports) (0.5 day)
- File: `tests/e2e/langgraph-real-llm.e2e.test.ts`
- Use Node 20+ global `fetch` and talk to a separately started server to avoid the Vitest alias stub (`vitest.config.ts:62`).
- Gated by env: only runs when `RUN_REAL_LLM=1`.
- Flow: POST `/api/execute` (202 with `executionId`) → poll `GET /api/executions/:id` up to 120s until `completed` (fail on `failed` or timeout). Assert output present.
- Run:
  - Shell A: `set -a; source .env; set +a && AGENTS_RUNTIME=langgraph npm run dev`
  - Shell B: `RUN_REAL_LLM=1 vitest tests/e2e/langgraph-real-llm.e2e.test.ts --run`

5) Evidence requirements (0.25 day)
- Append JSONL entry at `.automation/evidence/langgraph/actions.jsonl` with fields: `timestamp`, `cmd`, `executionId`, `status`, `duration_ms`.
- Archive a screenshot of the 202 response and a screenshot of polling completion under `.automation/evidence/langgraph/ui/`.
- Ensure `/output/<project>/` contains ≥3 generated files; capture that listing.

6) UI runtime override (optional, 0.25 day)
- If the UI insists on StepQueue, add a lightweight toggle:
  - Client: `?runtime=langgraph` or header `X-Agents-Runtime: langgraph`.
  - Server: Prefer request param/header over env when determining runtime.

7) Validation gates (0.25 day)
- `npm run lint` and `npm run typecheck` pass.
- Unit tests remain green (`npm test`), keeping mocks for speed/coverage.
- Focused execute subset (if needed to bypass coverage threshold during focused runs):
  - `VITEST_MIN_LINES=0 VITEST_MIN_BRANCHES=0 VITEST_MIN_FUNCTIONS=0 VITEST_MIN_STATEMENTS=0 AGENTS_RUNTIME=langgraph npm test -- -t execute`

8) Durability (next iteration; 0.75–1 day)
- Adopt a checkpointer for dev, then plan a production‑ready persistent saver.
- For 0.4.9, use `@langchain/langgraph-checkpoint`’s `MemorySaver` in `compile({ checkpointer })`; resume via `configurable.thread_id`.
- Production: design and select a Postgres/Redis checkpointer suitable for multi‑instance deployments.

## Risks and Mitigations
- Live LLM variability: use a tiny prompt and a cheap model; set a generous timeout. Fail fast on `failed` status.
- Alias trap in tests: avoided by using a separately started server and HTTP `fetch`.
- Scope creep (API upgrade to 1.0.0): deferred; would also require upgrading `@langchain/core` (repo currently uses `0.3.78`), which is out of scope for this pass.

## Timeline (single engineer)
- Discovery + version lock: 0.5 day
- Multi‑node graph: 1–1.25 days
- Server invariants + e2e: 1 day
- Evidence + UI toggle (optional) + validation: 0.5 day
- Total: 2.5–3.5 days (durability add‑on: +0.75–1 day)

## Exit Criteria (evidence‑based)
- Real multi‑node StateGraph is executing under `AGENTS_RUNTIME=langgraph` without breaking API.
- E2E live LLM test passes against the running server (no imports, no aliases).
- Evidence bundle exists: JSONL record with `executionId`, screenshots, generated output listing.
- Lint + typecheck + unit tests pass; StepQueue fallback remains intact.

*** End of Plan ***
