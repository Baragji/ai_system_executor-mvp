Phase 22 — LangGraph Six-Node Batch (Discovery Summary)
Date: 2025-10-19

Scope
- Implement clarify, plan, generate, test, repair (bounded loop), deliver nodes in `src/orchestrator/graph.ts`.
- Wire edges: START → clarify → plan → generate → test → (deliver | repair loop) → deliver → END.
- Emit node-level telemetry events (langgraph.node_*) on enter/exit/fail.
- Maintain API parity (202 + Location header; polling). Feature flag: `AGENTS_RUNTIME=langgraph`.

Integration Points
- Graph builder: src/orchestrator/graph.ts: StateGraph construction around buildGraphState().
- Executions store updates: `completeExecution`, `updateExecution`, `failExecution`.
- StepQueue parity: use StepQueue adapters until domain extraction.
- Clarification: src/clarification/generateQuestions.ts (optional, non-blocking).
- Planning: src/planning/* (decomposeTask, etc.).
- Generation: src/llm/index.ts (generateJSON), provider path remains via gateway.
- Testing: src/runner/* (runInSandbox) or StepQueue test adapter.
- Repair: src/repair/multiTurnRepair.ts (bounded attempts, metrics).

Telemetry
- Emit events: langgraph.node_enter, langgraph.node_exit, langgraph.node_fail with executionId, node name, duration, and error summary.
- Append to `.automation/execution_trace.jsonl` via existing telemetry helper.

Testing
- Minimal unit tests per node stub under `tests/orchestrator/`.
- Run existing API/integration tests to verify parity.

Risks & Notes
- Keep StepQueue as ground truth during wiring; nodes call adapters that wrap existing functions to avoid regressions.
- Ensure bounded loop counter prevents infinite cycles.

