# Task 11: Execute Deterministic Replay Tests

**Task ID**: TASK-11  
**Estimated Time**: 30-45 minutes  
**Prerequisites**: TASK-08  
**CDI Contract**: Gate G3 validation  
**Contract Reference**: .automation/GATES_LEDGER.md

---

## Context

Run replay tests and capture evidence to advance Gate G3.

---

## Acceptance Criteria
- [ ] Replay suite passes
- [ ] Evidence appended

---

## Validation
```bash
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/replay.test.ts
rg -n "Deterministic replay" .automation/GATES_LEDGER.md
```

---

## DoD
- [ ] Tests green
- [ ] Evidence recorded
