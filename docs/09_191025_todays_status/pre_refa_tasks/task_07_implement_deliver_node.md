# Task 07: Implement Deliver Node (LangGraph)

**Task ID**: TASK-07  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-06  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
Add a `deliver` node to finalize results and write them to the executions store for API retrieval.

### Phase 21 Requirement
- 6-node graph with terminal delivery.

### Current State
- File: `src/orchestrator/executionsStore.ts` — store API
- File: `src/orchestrator/graph.ts:49` — wrapper

### Desired State
- `deliver` node writes `{ output, logs }` into executions store and transitions END.

---

## Acceptance Criteria

**Must Have**:
- [ ] Node `deliver` wired from test (pass) and from repair/test (pass)
- [ ] Executions store updated

**Must Not Have**:
- [ ] No change to HTTP contract (202 + Location + polling)

**Contract Compliance**:
- [ ] 6-node requirement satisfied

---

## Implementation Guidance

### Files to Modify
1. `src/orchestrator/graph.ts` — add `deliver` node + edges

### Implementation Steps
- Store final artifacts and mark completed

---

## Validation
```bash
npm test tests/api/executions.test.ts
```

---

## Definition of Done
- [ ] Node added + edges
- [ ] Tests pass
- [ ] Evidence captured
