# Task 03: Implement Plan Node (LangGraph)

**Task ID**: TASK-03  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-02  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
Add a `plan` node to produce a task plan when prompts are not simple. Respect the simple-prompt bypass to avoid token waste.

### Phase 21 Requirement
- 6-node graph with a planning stage; optimized to avoid unnecessary retries.

### Current State
- File: `src/planning/decomposeTask.ts:59` — `SIMPLE_PROMPT_MAX_WORDS=50`
- File: `src/planning/decomposeTask.ts:265` — throws `SimplePromptBypassError`
- File: `src/orchestrator/graph.ts:49` — single-node graph scaffolding

### Desired State
- `plan` node calls `decomposeTask()`; on SimplePromptBypassError, emit an empty/compact plan and continue.

---

## Acceptance Criteria

**Must Have**:
- [ ] Node `plan` added and wired clarify → plan
- [ ] Handles `SimplePromptBypassError` without failing the graph
- [ ] Emits plan into graph state for downstream nodes

**Must Not Have**:
- [ ] No decomposition for trivial prompts

**Contract Compliance**:
- [ ] Contributes to 6-node requirement and planning optimization

---

## Implementation Guidance

### Files to Modify
1. `src/orchestrator/graph.ts` — add `plan` node + edge from `clarify`

### Code Locations
- `src/planning/decomposeTask.ts:255-335` — main entry

### Implementation Steps
- Add `plan` node invoking `decomposeTask(prompt, clarifications)` with try/catch
- On bypass: set minimal plan state

---

## Validation

### Unit Tests
```bash
npm test tests/planning/decomposeTask.test.ts
```

### Integration
```bash
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/graph.test.ts
```

---

## Definition of Done
- [ ] Node added + edges
- [ ] Tests pass
- [ ] Evidence captured

