# Task 06: Implement Repair Node with Conditional Loop (LangGraph)

**Task ID**: TASK-06  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-05  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
Add a `repair` node to attempt fixes when tests fail, then route back to `test` with a bounded loop.

### Phase 21 Requirement
- Conditional repair loop is required.

### Current State
- File: `src/repair/multiTurnRepair.ts` — repair loop entry
- File: `src/orchestrator/graph.ts:49` — wrapper

### Desired State
- `repair` node runs `multiTurnRepair`, updates files/state, and loops back to `test` up to N attempts.

---

## Acceptance Criteria

**Must Have**:
- [ ] Node `repair` wired test → repair → test
- [ ] Loop bounded (e.g., ≤ 3 attempts)

**Must Not Have**:
- [ ] Infinite loops

**Contract Compliance**:
- [ ] Contributes to 6-node requirement with conditional repair

---

## Implementation Guidance

### Files to Modify
1. `src/orchestrator/graph.ts` — add `repair` node + edges

### Implementation Steps
- Use existing repair module; propagate results to state

---

## Validation
```bash
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/graph.test.ts
```

---

## Definition of Done
- [ ] Node added + loop routing
- [ ] Tests pass
- [ ] Evidence captured

