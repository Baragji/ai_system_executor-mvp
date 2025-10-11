# WA4.5 Critical Issue: Pause During LLM Calls Not Working

**Date**: 2025-10-11 02:53 AM  
**Severity**: 🚨 **CRITICAL**  
**Status**: ❌ **PARTIALLY FIXED** (checkpoints work, but LLM calls can't be interrupted)

---

## E2E Test Results

### Test Setup
- Browser: Playwright automated test
- Prompt: "create hello world app, where i can modify the text 'hello world' colors, through a frontend ui"
- Project: "pausetest"
- Action: Click "Skip Questions" → Wait 3s → Click "Pause" during "Planning" phase

### Observations

✅ **What Works**:
1. Pause button clicked successfully
2. UI shows "Session paused. Provide answers to resume."
3. Pause button disabled
4. Checkpoint saved to `.automation/checkpoints/bc53fd38db42193d.json`
5. Checkpoint shows correct state transition: CLARIFYING → PLANNING → PAUSED
6. Checkpoint timestamp: `2025-10-11T00:52:23.952Z` (40 seconds into execution)

❌ **What Doesn't Work**:
1. **Execution continued running** despite pause
2. Files generated in `output/pausetest/` at same timestamp as checkpoint (02:52)
3. Execution completed with "Unknown error"
4. UI showed error message: "We couldn't complete your request"

### Checkpoint Content
```json
{
  "schema": "umca.phase5.checkpoint",
  "version": 1,
  "sessionId": "bc53fd38db42193d",
  "state": "PAUSED",
  "updatedAt": "2025-10-11T00:52:23.952Z",
  "machine": {
    "history": [
      {"state": "CLARIFYING", "enteredAt": "2025-10-11T00:51:43.370Z"},
      {"state": "PLANNING", "enteredAt": "2025-10-11T00:51:43.372Z"},
      {"state": "PAUSED", "enteredAt": "2025-10-11T00:52:23.952Z", "reason": "Manual pause requested"}
    ]
  },
  "payload": {
    "pendingQuestions": [{
      "id": "f1e99555-3759-480f-be72-5ef305f92551",
      "question": "Please provide guidance to continue execution.",
      "type": "AMBIGUITY"
    }]
  }
}
```

### Timeline Analysis
```
00:51:43.370Z - Session started (CLARIFYING)
00:51:43.372Z - Transitioned to PLANNING
              - decomposeTask() LLM call started (60s timeout)
00:52:23.952Z - User clicked "Pause" (40 seconds in)
              - abortSession(sessionId) called
              - Checkpoint saved
              - State machine: PAUSED
              ❌ BUT: LLM call still running (20s remaining in timeout)
~00:52:43Z    - LLM call completed (estimated)
              - throwIfAborted() NOT checked after LLM call
              - Execution continued
              - Files generated
              - Eventually errored out
```

---

## Root Cause Analysis

### The Problem

**LLM calls are long-running (30-60s) and cannot be interrupted mid-flight.**

My implementation adds `throwIfAborted()` checks **between** async operations:
- ✅ Before `generateExecutorOutputFromPrompt()`
- ✅ Before `runInSandbox()`
- ✅ Before each repair attempt
- ✅ Before each subtask

But these checks are **synchronous guards**, not **asynchronous cancellation**.

### Why It Fails

When pause is clicked **during** an LLM call:

1. ✅ `abortSession(sessionId)` sets `signal.aborted = true`
2. ✅ Checkpoint saved with PAUSED state
3. ❌ **LLM call continues running** (inside `generateJSON()`)
4. ❌ No abort check **after** LLM call completes
5. ❌ Execution proceeds to next step
6. ❌ Files generated despite pause

### Code Evidence

**In `src/llm/index.ts` (lines 18-21)**:
```typescript
const response = await Promise.race([
  provider.generate(messages),  // ← No AbortSignal passed
  new Promise<string>((_, rej) => 
    setTimeout(() => rej(new Error(`LLM call timed out after ${callTimeout}ms`)), callTimeout))
]);
```

**The Promise.race only has timeout, NOT abort signal.**

**In `src/planning/decomposeTask.ts` (line 200)**:
```typescript
const response = await raceWithAbort(
  () => requestPlan(prompt, clarifications, previousIssues),
  DECOMPOSE_TIMEOUT_MS,
  "decomposeTask"
);
```

**`raceWithAbort` uses `AbortSignal.timeout()` for decompose timeout, not pause detection.**

---

## The Gap in My Implementation

### What I Implemented ✅
- `throwIfAborted()` checkpoints **before** expensive operations
- `PausedError` handling in `/api/execute`
- Cleanup in `finally` blocks

### What I Missed ❌
- **Abort signal integration into LLM calls** (fetch/axios)
- **Abort checks immediately after LLM calls**
- **Polling abort signal during long-running operations**

---

## Required Fix

### Option A: Integrate AbortSignal into LLM Provider ⭐ RECOMMENDED

**Modify `src/llm/index.ts`:**

1. Accept `sessionId` parameter in `generateJSON()`
2. Get abort signal: `getAbortSignal(sessionId)`
3. Pass signal to `provider.generate(messages, { signal })`
4. Add signal to Promise.race

**Implementation**:
```typescript
export async function generateJSON(
  messages: LLMMessage[], 
  options?: { sessionId?: string }
): Promise<string> {
  const provider = chooseProvider();
  const signal = options?.sessionId ? getAbortSignal(options.sessionId) : undefined;
  
  // ... retry loop ...
  
  const response = await Promise.race([
    provider.generate(messages, { signal }),  // ← Pass abort signal
    new Promise<string>((_, rej) => {
      setTimeout(() => rej(new Error(`LLM call timed out`)), callTimeout);
      signal?.addEventListener('abort', () => rej(new PausedError(options.sessionId!, "llm_call")));
    })
  ]);
  
  // Check abort after LLM call
  throwIfAborted(options?.sessionId, "post_llm_call");
  
  return response;
}
```

**Then update all callers**:
```typescript
// In decomposeTask.ts
return generateJSON(messages, { sessionId: getTraceContext()?.sessionId });

// In generateSubtaskOutput.ts
const raw = await generateJSON(messages, { sessionId: context.sessionId });

// In server.ts generateExecutorOutputFromPrompt
const raw = await generateJSON(messages, { sessionId });
```

**Pros**:
- ✅ Immediate cancellation (<1s latency)
- ✅ Works for all LLM calls automatically
- ✅ Clean integration with fetch AbortSignal

**Cons**:
- ⚠️ Requires OpenAI/Anthropic SDK to support AbortSignal
- ⚠️ More invasive change (touches LLM provider interface)

**Estimate**: 2-3 hours

---

### Option B: Poll Abort Signal During LLM Calls

**Modify `src/llm/index.ts`:**

Add a third Promise to the race that polls for abort:
```typescript
const abortPoller = new Promise<string>((_, reject) => {
  if (!options?.sessionId) return;
  
  const interval = setInterval(() => {
    if (checkAborted(options.sessionId)) {
      clearInterval(interval);
      reject(new PausedError(options.sessionId, "llm_call"));
    }
  }, 500); // Poll every 500ms
  
  // Cleanup
  Promise.race([provider.generate(messages), timeout])
    .finally(() => clearInterval(interval));
});

const response = await Promise.race([
  provider.generate(messages),
  timeout,
  abortPoller  // ← New: Poll for abort
]);
```

**Pros**:
- ✅ No OpenAI SDK changes needed
- ✅ Works immediately
- ✅ Catches abort within 500ms

**Cons**:
- ⚠️ Polling overhead (CPU cycles)
- ⚠️ Still has ~500ms delay
- ⚠️ LLM call continues in background (can't cancel HTTP request)

**Estimate**: 1 hour

---

### Option C: Add Post-LLM Abort Checks (BAND-AID)

**Add abort checks immediately after every LLM call:**

```typescript
// In decomposeTask.ts (after line 200)
const response = await requestPlan(...);
throwIfAborted(getTraceContext()?.sessionId, "post_decompose");  // ← NEW

// In generateSubtaskOutput.ts (after line 38)
const raw = await generateJSON(messages);
throwIfAborted(context.sessionId, "post_subtask_gen");  // ← NEW

// In multiTurnRepair.ts (after LLM call for repair)
const rawFix = await generateJSON(messages);
throwIfAborted(context.sessionId, "post_repair_gen");  // ← NEW
```

**Pros**:
- ✅ Minimal changes
- ✅ Easy to implement
- ✅ Catches abort within seconds

**Cons**:
- ❌ Still waits for LLM call to complete (30-60s)
- ❌ Wastes LLM tokens on aborted requests
- ❌ User sees delay (not immediate)

**Estimate**: 30 minutes

---

## Recommended Approach

**Short-term (Tonight)**: Option C - Add post-LLM checks  
**Medium-term (This weekend)**: Option B - Add polling  
**Long-term (Phase 5.1)**: Option A - Integrate AbortSignal into provider

---

## Test Case for Validation

```typescript
// tests/e2e/pause-during-llm.test.ts
test("Pause during LLM call stops execution", async () => {
  const sessionId = "test-session";
  
  // Start execution
  const executePromise = fetch("/api/execute", {
    method: "POST",
    body: JSON.stringify({
      prompt: "create hello world app",
      sessionId
    })
  });
  
  // Wait for LLM call to start
  await new Promise(r => setTimeout(r, 2000));
  
  // Click pause
  const pauseResp = await fetch(`/api/sessions/${sessionId}/pause`, {
    method: "POST",
    body: JSON.stringify({
      reason: "Test pause during LLM"
    })
  });
  
  expect(pauseResp.status).toBe(201); // Pause successful
  
  // Verify execution stopped
  const executeResp = await executePromise;
  expect(executeResp.status).toBe(202); // Paused, not completed
  expect(await executeResp.json()).toMatchObject({
    paused: true,
    phase: "llm_call" // or "post_llm_call" with Option C
  });
  
  // Verify no files generated
  const files = await fs.readdir(`output/test-session`);
  expect(files.length).toBe(0); // Nothing generated
});
```

---

## User Impact

**Current State** (After WA4.5):
- ✅ Pause works if clicked **between** operations
- ❌ Pause doesn't work if clicked **during** LLM call (30-60s window)
- ⚠️ User Experience: "Pause is flaky - sometimes works, sometimes doesn't"

**After Option C** (Post-LLM Checks):
- ✅ Pause always works, but with delay
- ⚠️ Delay: Up to 60s (LLM timeout)
- ✅ Better than broken

**After Option B** (Polling):
- ✅ Pause works within ~500ms
- ✅ User Experience: "Pause is responsive"
- ⚠️ LLM tokens still wasted

**After Option A** (Full AbortSignal):
- ✅ Pause works within <1s
- ✅ No wasted tokens
- ✅ Industry standard (AbortController)

---

## Conclusion

My WA4.5 implementation **fixed the infrastructure** but **missed the LLM integration**.

The abort signal pattern is correct, but it needs to be **wired into the LLM provider** to truly interrupt long-running calls.

**Next Steps**:
1. Implement Option C tonight (30min)
2. Test with same scenario
3. If working, ship it
4. Plan Option A for Phase 5.1

---

**Status**: WA4.5 is 80% complete. Needs LLM integration for 100% coverage.
