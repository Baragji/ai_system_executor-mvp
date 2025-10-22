## FUCKING EXACTLY.

**THIS IS WHY YOU BUILT THE WORKFLOW SYSTEM.**

You just proved its entire value proposition:
- ✅ Catches lies ("yes we did it" → tests say NO YOU DIDN'T)
- ✅ Enforces standards (can't pass gate without real evidence)
- ✅ Prevents compounding bullshit (stub would have poisoned G4, G5, G6...)
- ✅ Makes quality non-negotiable (automation doesn't accept excuses)

**You were RIGHT to demand this. It just saved you from building an entire system on top of a setTimeout() lie.**

---

## Clear Directive: Do Phase 19 M1 Properly

**LangGraph is non-negotiable. It's the foundation. Build it right or don't build at all.**

---

## Developer Task: Complete Phase 19 M1 - Real LangGraph Integration

### Context
G3 gate validation exposed that Phase 19 M1 was shipped incomplete. The `src/orchestrator/graph.ts` file contains a setTimeout() stub instead of the ADR-019-mandated LangGraph StateGraph implementation. This is blocking legitimate G3 advancement and would poison all downstream work (G4, G5, G6).

**Decision: Build the real LangGraph integration. This is THE critical path.**

---

### Task: Implement Real LangGraph StateGraph

**Time Budget:** 3 days MAX (if not done by end of day 3, escalate)

**Success Criteria:**
```bash
# All three tests pass with exit code 0:
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/replay.test.ts
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/parity.test.ts
AGENTS_RUNTIME=langgraph npm test tests/benchmarks/perf-overhead.test.ts

# Workflow automatically detects evidence:
npm run state:next:auto

# Ledger updates automatically:
git diff .automation/GATES_LEDGER.md  # Shows ⏳ → ✅ for all 3 criteria

# Gate advances:
npm run state:show  # Shows "G3": "passed"
```

---

### Implementation Steps

#### Step 1: Install LangGraph (5 minutes)
```bash
npm install @langchain/langgraph@0.6.10
npm install @langchain/core  # peer dependency
```

Verify installation:
```bash
npm list @langchain/langgraph
# Should show: @langchain/langgraph@0.6.10
```

---

#### Step 2: Replace graph.ts Stub with Real StateGraph (4-6 hours)

**File:** `src/orchestrator/graph.ts`

**Requirements per ADR-019:**
1. Import and use `StateGraph` from `@langchain/langgraph`
2. Define execution state interface (matches existing ExecutionState type)
3. Create nodes that call existing modules:
   - **clarifyNode** → calls `workflow/lib/clarification/detectMissing.js` and `generateQuestions.js`
   - **planNode** → calls `workflow/lib/planning/decomposeTask.js`
   - **generateNode** → calls `src/executor/generateCode.ts`
   - **testNode** → calls `src/runner/runInSandbox.ts`
   - **repairNode** → calls `src/repair/multiTurnRepair.ts`
   - **deliverNode** → marks execution complete
4. Wire conditional edges:
   - clarify → plan (if no missing info)
   - clarify → wait (if needs user input)
   - plan → generate
   - generate → test
   - test → repair (if failed)
   - test → deliver (if passed)
   - repair → generate (loop back)
5. Add deterministic seed injection for replay
6. Ensure async execution completes and updates `executionsStore` properly

**Key Design Constraints:**
- Must integrate with existing `src/orchestrator/adapter.ts` (already wired)
- Must respect `deterministic` flag for replay tests
- Must complete execution within reasonable timeout (< 30s for tests)
- Must update execution status to "completed" when done (perf test polls for this)

---

#### Step 3: Fix StepQueue 500 Error (1-2 hours)

**File:** `src/server.ts` (POST /api/execute handler)

**Problem:** When `AGENTS_RUNTIME=stepqueue`, the StepQueue execution path throws 500 error.

**Debug Path:**
1. Add logging to POST /api/execute handler:
   ```typescript
   console.log('[server] Runtime:', runtime, 'Input:', input);
   ```
2. Trace StepQueue execution path (likely in `src/orchestrator/stepqueue.ts` or similar)
3. Find unhandled error/rejection causing 500
4. Add proper error handling or fix state transition bug

**Test:**
```bash
# Should return 200, not 500:
AGENTS_RUNTIME=stepqueue npm test tests/orchestrator/parity.test.ts
```

---

#### Step 4: Update Tests for Real Graph Behavior (1-2 hours)

**Changes Needed:**

1. **Increase Perf Test Timeout** (`tests/benchmarks/perf-overhead.test.ts`):
   ```typescript
   // Old: 10s timeout (fine for 10ms stub)
   // New: 30s timeout (real graph needs time)
   const timeout = 30000; // 30 seconds
   ```

2. **Make Tests More Resilient to Async Timing:**
   - Add retry logic for polling (already exists, verify it works)
   - Ensure tests wait for "completed" status, not just "running"
   - Add debug logging to see what status is being returned

3. **Verify Deterministic Seed Injection:**
   ```typescript
   // In replay test, ensure seed is passed to graph:
   const response = await fetch('/api/execute', {
     body: JSON.stringify({
       input: prompt,
       deterministic: true,
       seed: 12345
     })
   });
   ```

---

#### Step 5: Validate End-to-End (30 minutes)

```bash
# Clean start:
npm run build
npm run typecheck
npm run lint

# Run G3 validation tests:
echo "=== REPLAY TEST ==="
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/replay.test.ts

echo "=== PARITY TEST ==="
AGENTS_RUNTIME=langgraph npm test tests/orchestrator/parity.test.ts

echo "=== PERFORMANCE TEST ==="
AGENTS_RUNTIME=langgraph npm test tests/benchmarks/perf-overhead.test.ts

# If all pass (exit code 0 for each):
echo "=== WORKFLOW DETECTION ==="
npm run state:next:auto

echo "=== LEDGER DIFF ==="
git diff .automation/GATES_LEDGER.md

echo "=== GATE STATUS ==="
npm run state:show | grep G3
```

**Expected Output:**
```
✓ tests/orchestrator/replay.test.ts (4 tests) 4 passed
✓ tests/orchestrator/parity.test.ts (3 tests) 3 passed  
✓ tests/benchmarks/perf-overhead.test.ts (2 tests) 2 passed

🎉 New evidence detected:
  • G3 — Deterministic replay validation
  • G3 — Parity tests (StepQueue fallback validation)
  • G3 — Performance benchmarks (overhead < 500ms/transition)

✅ Gate ledger updated:
  • G3: partial → passed

Next Action: ADVANCE_HITL_MCP (Gate G4)
```

---

#### Step 6: Document Implementation (30 minutes)

**Create:** `.automation/phase19_m1_langgraph_completion.md`

```markdown
# Phase 19 M1 - LangGraph Integration Completion

## Summary
Replaced `src/orchestrator/graph.ts` stub with real LangGraph StateGraph implementation per ADR-019.

## Changes
- Installed @langchain/langgraph@0.6.10
- Built StateGraph with 6 nodes (clarify, plan, generate, test, repair, deliver)
- Wired nodes to existing modules (planning, executor, runner, repair)
- Added deterministic seed injection for replay validation
- Fixed StepQueue 500 error in server.ts
- Updated test timeouts for real graph execution

## Evidence
- Replay test: ✅ PASS (deterministic sessionId generation)
- Parity test: ✅ PASS (StepQueue fallback validated)
- Performance test: ✅ PASS (overhead measured at [X]ms/transition)

## Gate Status
G3: partial → passed (all criteria satisfied with evidence)

## Next Gate
G4: HITL + MCP integration
```

---

### Escalation Triggers

**If after 3 days:**
- Graph implementation not complete → Escalate with detailed status
- Tests still failing → Escalate with error logs and debug notes
- Any blocker preventing completion → Escalate immediately

**Do NOT:**
- Ship another stub
- Claim completion without passing tests
- Manually edit ledger to bypass validation

**The workflow system will catch lies. Don't waste time trying to cheat it.**

---

### Resources

**ADR-019 Reference:** `docs/adr/019-langgraph-integration.md`

**Existing Modules to Wire:**
- `workflow/lib/clarification/detectMissing.js`
- `workflow/lib/planning/decomposeTask.js`  
- `src/executor/generateCode.ts`
- `src/runner/runInSandbox.ts`
- `src/repair/multiTurnRepair.ts`

**LangGraph Docs:** https://langchain-ai.github.io/langgraphjs/

**Example StateGraph Pattern:**
```typescript
import { StateGraph } from "@langchain/langgraph";

const graph = new StateGraph({
  channels: {
    input: { value: () => "" },
    status: { value: () => "pending" }
  }
});

graph.addNode("nodeA", async (state) => {
  // Do work
  return { status: "complete" };
});

graph.addEdge("nodeA", "nodeB");
graph.setEntryPoint("nodeA");

const app = graph.compile();
const result = await app.invoke({ input: "test" });
```

---

## What Happens After This Works

Once all tests pass and G3 advances:

1. **G4 Starts:** HITL (Human-in-the-Loop) + MCP (Model Context Protocol)
2. **LangGraph is Foundation:** G4-G6 all build on top of this graph
3. **Workflow Continues:** Every gate validated by automation
4. **No More Stubs:** System enforces quality from here forward

---

## Final Note to Developer

**This is the most important 3 days of the project.**

If LangGraph doesn't work, nothing after it works. If you ship another stub, you're building a house on sand.

The workflow system proved its value by catching the first stub. Don't make it catch a second one.

**Build it right. The automation will validate it fairly.**

---

## @User: What You Should Do

1. **Send this task to developer immediately**
2. **Set calendar reminder for day 3** (escalation check-in)
3. **Prepare to review** the ledger diff when tests pass
4. **Celebrate when G3 advances** - the system works as designed

**The workflow automation just saved your project. Now let it validate the real work.**