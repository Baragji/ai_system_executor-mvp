# Phase A Timeout Rebalance - Stop-Gap Fix

**Date:** 2025-10-10  
**Issue:** Subtask timeout (240s) insufficient for repair cycles  
**Root Cause:** Architectural gap (no mid-execution pause/resume)  
**Fix Type:** Stop-gap to unblock Phase A validation  
**Strategic Pivot:** Phase 5 (Stateful Orchestration) next priority  

---

## Evidence-Based Problem Analysis

### What Failed (11testartifact)
- ✅ **Backend subtasks 1-4:** Completed successfully
- ❌ **Frontend subtask 5 (build-frontend-ui):** Aborted at 240073ms
- ❌ **Frontend subtask 6 (implement-frontend-logic):** Never started (dependency failed)

**Error message from _executor_meta.json:**
```json
{
  "status": "failed",
  "subtaskId": "build-frontend-ui",
  "durationMs": 240073,
  "notes": "subtask:build-frontend-ui aborted after 240000ms"
}
```

### Timeout Math Problem

**Current Configuration (Insufficient):**
```
LLM_CALL_TIMEOUT_MS = 180000    (3 min per LLM call)
SUBTASK_TIMEOUT_MS  = 240000    (4 min TOTAL for subtask)
```

**Worst-Case Subtask Duration:**
```
Initial generation:  180s (LLM call)
Test run:             ~2s
Repair attempt 1:    180s (LLM call)
Test run:             ~2s
Repair attempt 2:    180s (LLM call)
Test run:             ~2s
Repair attempt 3:    180s (LLM call)
Test run:             ~2s
Repair attempt 4:    180s (LLM call)
Test run:             ~2s

TOTAL: ~730 seconds (12+ minutes)
```

**Result:** Any subtask needing ≥2 repair cycles hits the 240s wall 💥

### Code Evidence

1. **Repair loop** (src/repair/multiTurnRepair.ts:308):
   ```typescript
   for (let index = 0; index < 4; index += 1) {
     // Up to 4 repair attempts
   ```

2. **Subtask timeout wrapper** (src/server.ts:282-285):
   ```typescript
   const SUBTASK_TIMEOUT_MS = Number(process.env.SUBTASK_TIMEOUT_MS ?? 120000);
   const signal = AbortSignal.timeout(SUBTASK_TIMEOUT_MS);
   // Wraps ENTIRE subtask: generation + ALL repairs + tests
   ```

3. **Each repair calls LLM** (src/repair/multiTurnRepair.ts:320+):
   - Uses `generateJSON()` which respects `LLM_CALL_TIMEOUT_MS`
   - Each call can take up to 180s

---

## Stop-Gap Fix Applied

### New Configuration (Evidence-Based)

```bash
# .env changes
LLM_CALL_TIMEOUT_MS=180000      # ✅ Keep (3 min per call)
SUBTASK_TIMEOUT_MS=900000       # 🔧 Changed: 240s → 900s (15 min)
PLAN_BUDGET_MS=3600000          # 🔧 Changed: 900s → 3600s (60 min)
```

### Timeout Hierarchy (Hierarchical Budgeting)

```
Level 1: LLM Call       = 180s  (3 min)
         ↓ (child < parent rule)
Level 2: Subtask        = 900s  (15 min)
         Covers: 4 repairs × 180s + 180s buffer for tests/overhead
         ↓ (child < parent rule)
Level 3: Plan Budget    = 3600s (60 min)
         Covers: 8 subtasks × 7.5 min average
```

**Design Principle:** Parent timeout > Child timeout × max iterations + margin  
**Reference:** AWS Builders' Library - Timeouts, Retries and Backoff with Jitter

### Math Validation

**Subtask (15 min):**
- Max repairs: 4 × 180s = 720s
- Test overhead: ~60s
- Safety margin: 120s
- **Total capacity: 900s** ✅

**Plan (60 min):**
- 8 subtasks × 450s average = 3600s
- Assumes ~2 repairs per subtask on average
- **Total capacity: 3600s** ✅

---

## Validation Results

### All Gates Passed ✅

```bash
npm run lint       # Exit 0 (0 warnings)
npm run typecheck  # Exit 0 (0 errors)
npm test           # 244/244 tests passing, 83.42% coverage
```

### Test Evidence
- **Test Files:** 58 passed (58)
- **Tests:** 244 passed (244)
- **Duration:** 5.95s
- **Coverage:** 83.42% lines, 78.42% branches

### Lint Fixes Applied
1. **src/repair/multiTurnRepair.ts** - Replaced `any` cast with typed interface
2. **tests/llm/timeout-retry.test.ts** - Removed unused import

---

## Why This Is A Stop-Gap (Not Root Cause Fix)

### The Real Problem (Architectural)

**Current system behavior:**
```
Frontend subtask hits ambiguity
  ↓
System can't pause to ask user
  ↓
Tries repair cycle 1 (burns 180s + tokens)
  ↓
Still ambiguous, tries repair 2 (burns 180s + tokens)
  ↓
Still ambiguous, tries repair 3 (burns 180s + tokens)
  ↓
Either: (A) Timeout kills it, OR (B) Guesses wrong
```

**Result:**
- ❌ Token waste on wrong assumptions
- ❌ Time waste on blind repair attempts
- ❌ Forces complete restart if wrong
- ❌ No way to course-correct mid-execution

### What Production Systems Do

**Temporal, Step Functions, Durable Functions, LangGraph:**
- ✅ **Pause** execution when stuck
- ✅ **Checkpoint** state (resume exactly where paused)
- ✅ **Ask** targeted questions
- ✅ **Resume** after user answers (10s vs 10min repair cycles)
- ✅ **No token waste** on wrong paths

**Example flow with pause/resume:**
```
Frontend subtask hits ambiguity
  ↓
System detects uncertainty
  ↓
PAUSES with question: "Which color picker? (A) Native, (B) Custom"
  ↓
User answers in 10 seconds
  ↓
RESUMES with clarity, generates correctly in 60s
  ↓
✅ Done (saved 8+ minutes + massive tokens)
```

---

## Strategic Pivot: Phase 5 Next

### What We're Building Next

**Phase 5: Stateful Orchestration with Pause/Resume**

**Core primitives:**
1. **Finite-state machine** (CLARIFYING → PLANNING → GENERATING → PAUSED → DONE)
2. **Checkpoints** (`.automation/checkpoints/<session>/<seq>.json`)
3. **Interrupt events** (AMBIGUITY, APPROVAL, BUDGET_RISK, DANGEROUS_ACTION)
4. **Resume endpoint** (`POST /api/sessions/:id/resume`)
5. **SSE stream** (`GET /api/progress/:id` for real-time status)

**Benefits:**
- ✅ Stop token waste (pause vs blind retry)
- ✅ User answers in seconds (vs minutes of repair)
- ✅ Resume exactly where paused (no context loss)
- ✅ Graceful degradation (pause > fail)
- ✅ Production-grade orchestration (industry standard)

### Alignment with Existing Work

**What we already have:**
- ✅ Clarification system (preflight pause/resume)
- ✅ Execution trace (`.automation/execution_trace.jsonl`)
- ✅ Fixtures system (`.automation/fixtures/`)
- ✅ Session IDs (unique identifiers)

**What's missing:**
- ❌ Mid-execution pause capability
- ❌ Checkpoint/resume from arbitrary step
- ❌ Question bundles for interrupts
- ❌ SSE stream for real-time updates

**Phase 5 fills the gap** by making clarification a **special case** of pause/resume.

---

## Next Steps

### 1. Rerun Validation (Today)
```bash
# Rerun same prompt with new timeouts
# Expected: Frontend subtasks complete
# Expected: Final status = PASS
```

### 2. Draft Phase 5 Contract (Today/Tomorrow)
- Create `contracts/Roadmap_execution/14_phase5_orchestration_contract.json`
- Follow CDI format (wins, DoD, evidence requirements)
- Include: discovery phase, checkpoint design, interrupt taxonomy, API endpoints
- Timeline: 2-3 weeks per auditor assessment

### 3. Execute Phase 5 Before Phase B
- Build orchestration spine (stateful + pause/resume)
- Refactor clarification to use orchestration
- Run Trust Engine (Phase B) on orchestration foundation

---

## Success Criteria

**Stop-gap fix successful if:**
- ✅ 11testartifact rerun completes all 8 subtasks
- ✅ Tests pass (>0 executed tests)
- ✅ Final status = PASS or partial (not aborted)
- ✅ Frontend subtasks don't hit 900s timeout

**Phase A validated if:**
- ✅ Fresh generation from prompt completes
- ✅ UI shows correct outcome (success/partial)
- ✅ Evidence bundle generated (tests, logs, artifacts)
- ✅ All 244 tests passing, lint/typecheck clean

---

## References

- **AWS Builders' Library:** Timeouts, Retries and Backoff with Jitter
- **Google SRE Book:** Addressing Cascading Failures
- **Temporal Docs:** Workflow Execution Overview
- **Step Functions:** Service Integration Patterns
- **Azure Durable Functions:** External Events (HITL)
- **LangGraph:** Human-in-the-Loop with Interrupts

---

## Conclusion

**What we did:**
- ✅ Applied evidence-based timeout rebalance
- ✅ Validated all gates pass (lint, typecheck, tests)
- ✅ Documented stop-gap nature of fix

**What we learned:**
- 🔍 Root cause is architectural (no pause/resume)
- 🔍 Timeout increases buy time but don't fix waste
- 🔍 Production systems use stateful orchestration

**What's next:**
- 🎯 Validate stop-gap works (rerun 11testartifact)
- 🎯 Draft Phase 5 contract (stateful orchestration)
- 🎯 Build pause/resume foundation before Phase B

**Bottom line:** We're unblocked for Phase A validation. Phase 5 is the real fix.

---

**Status:** Stop-gap applied, awaiting rerun validation  
**Phase A:** Pending rerun completion  
**Phase 5:** Ready to draft contract  
**Maintainer:** @yousefbaragji
