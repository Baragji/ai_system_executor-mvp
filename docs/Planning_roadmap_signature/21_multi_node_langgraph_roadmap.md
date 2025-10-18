# Phase 21 — Multi-Node LangGraph Orchestration

Why
- Replace the wrapper with a real graph so we gain routing, loops, and clear state transitions. This aligns with ADR‑019 and sets up durability/HITL in later phases.

What
- Six nodes: clarify → plan → generate → test → (deliver | repair→test loop) → deliver.
- API unchanged: POST `/api/execute` returns 202 + `Location`; poll `GET /api/executions/:id`.
- Feature flag: `AGENTS_RUNTIME=langgraph` controls runtime.

How
- Implement nodes in `src/orchestrator/graph.ts` using LangGraph 1.0 Annotation API.
- Reuse existing modules with adapters: `generateQuestions`, `decomposeTask`, `generateJSON` (+ file write), `runInSandbox`, `multiTurnRepair`.
- Conditional edge after `test` to loop into `repair` (bounded attempts) or proceed to `deliver`.
- Keep executions store updates for running → completed/failed.
- Add HTTP e2e (opt‑in) that hits the flag path with a real OpenAI key.

Success Criteria
- Graph executes six nodes under the flag without breaking API.
- Real LLM e2e passes (server + HTTP polling to `completed`).
- Planning step tuned to avoid unnecessary retries.
- Lint/typecheck/tests green; evidence recorded (executionId, JSONL).

Deliverables
- D21.1: Multi‑node graph
- D21.2: Real LLM e2e
- D21.3: Planning optimization

Timeline
- 2.5–3.5 days total; durability checkpointer planned next.

*** End ***
