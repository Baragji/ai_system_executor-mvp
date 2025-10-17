# Tie-Break Resolution: LangGraph Routing Investigation

**Date:** 2025-10-17  
**Status:** ✅ Resolved  
**Method:** Diagnostic logging + runtime testing

---

## Executive Summary

**Short answer: *mostly, but not 100%*.**

After adding diagnostic logging and testing with `AGENTS_RUNTIME=langgraph`, we've resolved the disputed point. The system has **hybrid stub behavior**: flag routing works and returns LangGraph-style responses, but internally still uses StepQueue with a timer-based completion stub.

---

## Where All Opinions Agree ✅

* **`graph.ts` is still a stub** and does **not** implement a real LangGraph `StateGraph`. A real graph (nodes → edges → terminal state) is still required. ([StateGraph API Reference][1])
* **ADR/G3 still unmet:** you need the actual LangGraph runtime wired behind `AGENTS_RUNTIME=langgraph`, not a timer stub. ([LangGraph.js Documentation][2])
* **No perf/parity tests are present** yet, so there's no credible evidence for performance or parity.
* **No reproducible StepQueue 500 evidence** in the current tests.
* **`@langchain/langgraph` is not installed** in `package.json`.

---

## The Disputed Point 🔍

**Question:** Does `/api/execute` actually route to a LangGraph path when the flag is set?

* **Third opinion:** Server already chooses between LangGraph adapter and StepQueue
* **Fourth opinion:** Even with flag, it runs StepQueue, back-fills store, returns 202

---

## Tie-Break Results 🎯

### Test Procedure

1. Added diagnostic logging to `src/server.ts`:
   ```typescript
   console.log(`[/api/execute] AGENTS_RUNTIME=${process.env.AGENTS_RUNTIME}, useLangGraph=${useLangGraph}`);
   console.log(`[/api/execute] Executing via StepQueue workflow (${steps.length} steps)`);
   console.log(`[/api/execute] LangGraph path: Completing execution ${executionId} with StepQueue result`);
   ```

2. Started server with flag: `AGENTS_RUNTIME=langgraph npm run dev`

3. Tested endpoint: `curl -X POST http://localhost:3000/api/execute -H 'Content-Type: application/json' -d '{"prompt":"ping"}'`

### Observed Behavior

**Console Output:**
```
[/api/execute] AGENTS_RUNTIME=langgraph, useLangGraph=true
[/api/execute] Executing via StepQueue workflow (1 steps)
[/api/execute] LangGraph path: Completing execution graph-957b7a0c-... with StepQueue result
```

**API Response:**
```json
{
  "executionId": "graph-957b7a0c-10c4-4bbd-98a2-99d7e59e193f",
  "status": "started"
}
```
HTTP Status: `202 Accepted` with `Location` header

### Verdict: **Both Opinions Partially Correct**

The current implementation is a **hybrid stub**:

| Component | Status | Evidence |
|-----------|--------|----------|
| **Flag detection** | ✅ Works | `useLangGraph=true` correctly set |
| **Response format** | ✅ LangGraph-style | Returns 202 + execution ID (not 200 + payload) |
| **Execution store** | ✅ Populated | Creates record in `executionsStore` |
| **Internal execution** | ⚠️ **StepQueue** | Still uses `stepQueue.runWorkflow()` |
| **Real StateGraph** | ❌ **Missing** | No actual LangGraph nodes/edges |
| **`@langchain/langgraph`** | ❌ **Not installed** | Package not in dependencies |

### What Actually Happens (src/server.ts lines 1556-1752)

```typescript
// 1. Flag is checked
const runtime = (process.env.AGENTS_RUNTIME || "").toLowerCase();
const useLangGraph = runtime === "langgraph";

// 2. Execution ID created for LangGraph path
if (useLangGraph) {
  executionId = buildExecutionId(sessionId || undefined);
  createExecution(executionId, { status: "started" });
}

// 3. BUT: Still runs StepQueue internally
const workflow = await stepQueue.runWorkflow(sessionId, steps, {...});

// 4. Back-fills execution store and returns LangGraph-style response
if (useLangGraph && executionId) {
  res.status(202)
     .setHeader("Location", `/api/executions/${executionId}`)
     .json({ executionId, status: "started" });
  setImmediate(() => {
    completeExecution(executionId!, responsePayload);
  });
  return;
}
```

### The `executeAdapter` Mystery Solved

The `src/orchestrator/adapter.ts` file exists with a proper LangGraph adapter, BUT:
- It's **never imported** in `src/server.ts`
- It's **never registered** as a route handler
- The comment says: "Not wired into server by default; safe to keep until LangGraph graph lands"

---

## Unified Next Steps (Consensus) 📋

Everyone agrees on these action items:

### 1. Install Real LangGraph ✅ Required
```bash
npm install @langchain/langgraph@0.6.10 @langchain/core
```
([StateGraph API Reference][1])

### 2. Replace Stub with Real StateGraph ✅ Required

Build minimal `StateGraph` in `src/orchestrator/graph.ts`:
- **Nodes:** Clarify → Plan → Generate → Test → Repair → Deliver
- **Terminal state:** `status: "completed"` or `status: "failed"`
- **Wire to existing modules:** `detectMissing`, `decomposeTask`, `generateJSON`, `runInSandbox`, `multiTurnRepair`

([LangGraph.js Documentation][2])

### 3. Add Parity + Performance Tests ✅ Required

Create test suites that can run individually:
```bash
npm test -- tests/langgraph-parity.test.ts
npm test -- tests/langgraph-performance.test.ts
```
([Vitest CLI Guide][3])

**Test Requirements:**
- **Parity:** LangGraph path produces same output as StepQueue for identical prompts
- **Performance:** LangGraph overhead < 500ms per ADR-019
- **Determinism:** Same seed → same execution path → same output

### 4. Keep RFC 9457 Error Handling ✅ Already Implemented

Use `respondWithProblem()` for errors (supersedes RFC 7807):
```typescript
respondWithProblem(res, 500, "GraphExecutionFailed", message, instance);
```
([RFC 9457 Specification][4])

---

## Current State Assessment

### What Works ✅
- Feature flag detection (`AGENTS_RUNTIME=langgraph`)
- Execution ID generation (`buildExecutionId`)
- Execution store (create/complete/fail operations)
- LangGraph-style API responses (202 + Location header)
- Polling endpoint (`GET /api/executions/:id`)

### What's Missing ❌
- Real `StateGraph` implementation with nodes/edges
- `@langchain/langgraph` package dependency
- Actual routing through graph runtime (currently bypassed)
- Parity tests comparing LangGraph vs StepQueue outputs
- Performance tests measuring overhead
- Deterministic replay tests

### What's Confusing ⚠️
- `executeAdapter` exists but isn't wired
- Server has "LangGraph path" but uses StepQueue internally
- Contract claims G3 "partial" but no real graph exists yet

---

## Conclusion

**The disputed point is resolved:** The server has **LangGraph-style API wiring** (flag routing, execution store, 202 responses) but **no actual LangGraph `StateGraph` execution**. It's a hybrid stub that provides the right API surface while internally delegating to StepQueue.

**This confirms the core requirement:** Phase 19 M1 needs the real `StateGraph` implementation to meet ADR-019 and pass Gate G3.

**Recommended approach:** Proceed with Option A (implement real LangGraph integration) as all reviewers agree this is necessary, and the current stub architecture provides a clean integration point.

---

## References

[1]: https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html?utm_source=chatgpt.com "StateGraph | API Reference - GitHub Pages"
[2]: https://langchain-ai.github.io/langgraphjs/?utm_source=chatgpt.com "LangGraph.js"
[3]: https://vitest.dev/guide/cli?utm_source=chatgpt.com "Command Line Interface | Guide"
[4]: https://www.rfc-editor.org/rfc/rfc9457.html?utm_source=chatgpt.com "RFC 9457: Problem Details for HTTP APIs"

---

## Evidence Trail

**Diagnostic Logs Added:**
- `src/server.ts:1561` - Flag detection log
- `src/server.ts:1725` - StepQueue execution log  
- `src/server.ts:1748` - LangGraph completion log

**Test Command:**
```bash
AGENTS_RUNTIME=langgraph npm run dev
curl -X POST http://localhost:3000/api/execute \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"ping"}'
```

**Test Result:**
- ✅ Returns 202 with execution ID
- ✅ Flag detected correctly
- ⚠️ Internally uses StepQueue
- ❌ No real StateGraph invoked

**Files Examined:**
- `src/server.ts` (lines 1556-1800)
- `src/orchestrator/graph.ts` (timer stub confirmed)
- `src/orchestrator/adapter.ts` (exists but not registered)
- `package.json` (no `@langchain/langgraph` dependency)
