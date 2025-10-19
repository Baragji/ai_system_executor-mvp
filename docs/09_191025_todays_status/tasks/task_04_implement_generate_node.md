# Task 04: Implement Generate Node (LangGraph)

**Task ID**: TASK-04  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-03  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
Add a `generate` node that uses the LLM to produce code/output according to the plan (or single-step for simple prompts).

### Phase 21 Requirement
- 6-node graph. Generation must integrate with tool calls when provided.

### Current State
- File: `src/llm/index.ts:97-220` — LLM driver (timeout/retry/tool-calls)
- File: `src/orchestrator/graph.ts:49` — single-node wrapper

### Desired State
- `generate` node invokes `generateJSON(messages, options)`; stores result in state.

---

## Acceptance Criteria

**Must Have**:
- [ ] Node `generate` added and wired plan → generate
- [ ] Generated JSON captured in state for testing

**Must Not Have**:
- [ ] No blocking on tool-less invocation

**Contract Compliance**:
- [ ] Contributes to 6-node requirement

---

## Implementation Guidance

### Files to Modify
1. `src/orchestrator/graph.ts` — add `generate` node + edge from `plan`

### Code Locations
- `src/llm/index.ts:200-520` — driver semantics

### Implementation Steps
- Add node, call provider via `generateJSON`, return `{ generation }` in state

---

## Validation

### Unit/Integration
```bash
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/graph.test.ts
```

---

## Definition of Done
- [ ] Node added + edges
- [ ] Tests pass
- [ ] Evidence captured

