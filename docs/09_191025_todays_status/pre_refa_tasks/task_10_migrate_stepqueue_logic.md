# Task 10: Migrate StepQueue Logic into Graph Nodes

**Task ID**: TASK-10  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-08  
**CDI Contract**: Phase 21 Multi-Node LangGraph Implementation  
**Contract Reference**: contracts/Roadmap_execution/21_phase21_multi_node_langgraph_contract.json

---

## Context

Mirror StepQueue handlers’ behavior within graph nodes to preserve semantics (logs, stop flags, status updates).

---

## Acceptance Criteria
- [ ] Node behavior matches StepQueue semantics
- [ ] Parity tests remain green

---

## Implementation
- Reference: `src/orchestrator/stepQueue.ts:246-324`

---

## Validation
```bash
npm test tests/orchestrator/parity.test.ts
```

---

## DoD
- [ ] Parity maintained
- [ ] Evidence captured
