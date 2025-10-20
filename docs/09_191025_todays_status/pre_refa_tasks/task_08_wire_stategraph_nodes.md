# Task 08: Wire 6 Nodes and Conditional Edges (LangGraph)

**Task ID**: TASK-08  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-02..TASK-07  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
Connect clarify → plan → generate → test → (deliver | repair loop) → deliver with proper edges and reducers.

### Phase 21 Requirement
- 6-node orchestration with conditional routing.

### Current State
- File: `src/orchestrator/graph.ts:49` — single node + fallback

### Desired State
- Edges START→clarify→plan→generate→test→(deliver|repair)
- On fail: test→repair→test (bounded)
- On pass: test→deliver→END

---

## Acceptance Criteria

**Must Have**:
- [ ] All nodes wired with addEdge calls
- [ ] Conditional routing implemented

**Must Not Have**:
- [ ] Infinite loops or missing terminal edges

**Contract Compliance**:
- [ ] Meets 6-node requirement

---

## Validation
```bash
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/graph.test.ts
```

---

## Definition of Done
- [ ] Edges added
- [ ] Tests pass
- [ ] Evidence captured
