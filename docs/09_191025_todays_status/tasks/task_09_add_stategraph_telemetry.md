# Task 09: Add StateGraph Telemetry & Logging

**Task ID**: TASK-09  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-08  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

Add fine-grained telemetry (e.g., `langgraph.node_started`, `langgraph.node_completed`) to improve observability.

---

## Acceptance Criteria
- [ ] Events emitted per node transition
- [ ] Execution trace shows node lifecycle

---

## Implementation
- Modify `src/orchestrator/graph.ts` nodes to log via `logEvent(...)`

---

## Validation
```bash
tail -n 200 .automation/execution_trace.jsonl | rg "langgraph.node_"
```

---

## DoD
- [ ] Events present
- [ ] Evidence captured
