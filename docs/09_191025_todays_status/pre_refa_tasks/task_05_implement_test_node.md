# Task 05: Implement Test Node (LangGraph)

**Task ID**: TASK-05  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-04  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
Add a `test` node that runs tests in the sandbox using the generated files and records results.

### Phase 21 Requirement
- 6-node graph with conditional routing based on test pass/fail.

### Current State
- File: `src/runner/runInSandbox.ts` — sandbox execution entry
- File: `src/orchestrator/graph.ts:49` — wrapper

### Desired State
- `test` node calls `runInSandbox`, returns `{ testResult }` in state for conditional routing.

---

## Acceptance Criteria

**Must Have**:
- [ ] Node `test` wired generate → test
- [ ] Returns structured test result for routing

**Must Not Have**:
- [ ] No dependency on UI validation flows

**Contract Compliance**:
- [ ] Contributes to 6-node requirement

---

## Implementation Guidance

### Files to Modify
1. `src/orchestrator/graph.ts` — add `test` node + edge from `generate`

### Implementation Steps
- Invoke sandbox; capture pass/fail, counts, duration

---

## Validation

### Integration
```bash
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/graph.test.ts
```

---

## Definition of Done
- [ ] Node added + edges
- [ ] Tests pass
- [ ] Evidence captured

