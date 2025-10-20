# Task 02: Implement Clarify Node (LangGraph)

**Task ID**: TASK-02  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-01  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

### Problem Statement
The current LangGraph wrapper lacks multi-node orchestration. We need a `clarify` node to optionally ask questions using existing clarification modules.

### Phase 21 Requirement
- “6 nodes implemented with conditional repair loop” — Clarify is the entry node.

### Current State
- File: `src/orchestrator/graph.ts:49` — `buildGraphState()` exists; single `runWorkflow` node
- File: `src/clarification/generateQuestions.ts` — Clarification entry point
- File: `src/server.ts:1555,1751-1790` — LangGraph routing + 202 Location semantics

### Desired State
- A `clarify` node that produces either `no-op` (no questions) or attaches Q&A to state for downstream planning.

---

## Acceptance Criteria

**Must Have**:
- [ ] Node named `clarify` added with `builder.addNode('clarify', ...)`
- [ ] Node returns structured state update (e.g., `{ clarifications }`)
- [ ] Edge from START → clarify established

**Must Not Have**:
- [ ] No blocking of flow when no questions are needed

**Contract Compliance**:
- [ ] Contributes to 6-node implementation requirement
- [ ] Preserves feature flag behavior and API parity

---

## Implementation Guidance

### Files to Modify
1. `src/orchestrator/graph.ts` — add `clarify` node and initial edge

### Code Locations
- `src/orchestrator/graph.ts:49` — Graph state builder
- `src/clarification/generateQuestions.ts` — call site

### Implementation Steps

**Step 1: Add node**
```ts
(builder as any).addNode('clarify', async (state: any) => {
  // invoke generateQuestions if needed
  return { clarifications: [] };
});
```

**Step 2: Wire edge**
```ts
(builder as any).addEdge(START as any, 'clarify');
```

---

## Validation

### Unit Tests
```bash
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/graph.test.ts
```

**Expected Output**:
```
✓ runWithLangGraph > completes executions with logs and output from StepQueue
```

### Manual Validation
```bash
npm start &
# trigger execution and confirm no errors
```

**Expected Log Output**:
- `langgraph.started` then `langgraph.completed`

### Evidence Capture
```bash
tail -n 200 .automation/execution_trace.jsonl | rg "langgraph.started|langgraph.completed"
```

---

## Contract Compliance
- Satisfies node count progress for Phase 21.

---

## Definition of Done
- [ ] Node added + edges
- [ ] Tests pass
- [ ] Evidence captured

