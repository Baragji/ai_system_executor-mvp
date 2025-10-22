Got it. Here’s a repo-specific, **non-generic** plan with exact file + line edits, diffs, and why each change is needed. You run the edits; your code will then actually execute via a real LangGraph app when `AGENTS_RUNTIME=langgraph`.

---

# Plan (tailored to your repo)

## 0) Install the real runtime (one-time)

Add LangGraph libs (they’re not in `package.json`):

```bash
npm i @langchain/langgraph @langchain/core
```

**Why:** You currently never import/use LangGraph. Without these, a “real graph” can’t exist.

---

## 1) Replace the stub graph with a real LangGraph app

### File: `src/orchestrator/graph.ts`

**What you have (evidence):** This file is a timer stub, not a graph. It “completes” via `setTimeout` (lines ~33–58 in your compiled file):

```
## src/orchestrator/graph.ts
...
0028: export async function runGraph(args: GraphRunArgs): Promise<GraphRunResult> {
0033:   // Simulate an async graph run; this is a stub
0034:   await new Promise((resolve) => setTimeout(resolve, 200));
0035:   await completeExecution(executionId, {
0036:     status: "completed",
0037:     output: {
0038:       message: `Graph execution completed for prompt: ${args.prompt.substring(0, 40)}...`,
0039:     },
0040:   });
...
```

**Why change it:** ADR/G3 requires a **real** LangGraph `StateGraph` (nodes → edges → terminal). A timer stub fails that.

**Edit (replace entire file contents)**

Paste this full implementation (keeps your existing `buildExecutionId`, adds a real graph that **invokes your existing StepQueue workflow from inside a LangGraph node** so parity stays intact):

```ts
import { randomUUID } from "node:crypto";
import { StateGraph, START, END } from "@langchain/langgraph";

import { logEvent } from "../telemetry/events.js";
import {
  createExecution,
  completeExecution,
  failExecution,
  updateExecution,
} from "./executionsStore.js";
import type { StepDescriptor } from "./stepQueue.js";
import { StepQueue } from "./stepQueue.js";

export type GraphRunArgs = {
  executionId: string;
  sessionId: string;
  steps: StepDescriptor[];
  stepQueue: StepQueue;
  deterministic: boolean;
  seed: number;
};

export type GraphOutput = {
  output?: unknown;
  logs?: unknown[];
};

export function buildExecutionId(sessionId?: string): string {
  if (sessionId && sessionId.trim()) {
    return `graph-${sessionId.trim()}`;
  }
  return `graph-${randomUUID()}`;
}

/**
 * Real LangGraph runner that executes your existing StepQueue workflow
 * inside a LangGraph node. This satisfies ADR/G3 (real graph runtime),
 * while preserving behavior/perf (your steps do the work).
 */
export async function runWithLangGraph(args: GraphRunArgs): Promise<GraphOutput> {
  const {
    executionId,
    sessionId,
    steps,
    stepQueue,
    deterministic,
    seed,
  } = args;

  // Graph "state" is small — we just carry the executionId for logging
  type GraphState = { executionId: string; result?: unknown; logs?: unknown[] };

  // Build a minimal but real graph: START -> runWorkflow -> END
  const builder = new StateGraph<GraphState>({ channels: {} as any });

  builder.addNode("runWorkflow", async (state) => {
    // visibility: running
    await updateExecution(executionId, {
      status: "running",
      updatedAt: new Date(),
    });

    const run = await stepQueue.runWorkflow(sessionId, steps, {
      deterministic,
      seed,
    });

    // The StepQueue return shape in your repo carries output/logs;
    // normalize for exec store
    return {
      ...state,
      result: run?.result ?? run,
      logs: run?.logs ?? [],
    };
  });

  builder.addEdge(START, "runWorkflow");
  builder.addEdge("runWorkflow", END);

  const app = builder.compile();

  try {
    const final = await app.invoke({ executionId });

    // terminal: completed
    await completeExecution(executionId, {
      status: "completed",
      output: final.result,
      logs: final.logs,
      updatedAt: new Date(),
    });

    logEvent("langgraph.completed", { executionId });
    return { output: final.result, logs: final.logs };
  } catch (err: any) {
    // terminal: failed
    await failExecution(executionId, {
      title: "LangGraph execution failed",
      detail: err?.message ?? String(err),
      status: 500,
      type: "about:blank",
      updatedAt: new Date(),
    });
    logEvent("langgraph.failed", { executionId, error: String(err) });
    throw err;
  }
}
```

---

## 2) Actually route `/api/execute` to LangGraph when the flag is set

### File: `src/server.ts`

**What you have (evidence):** The route **always** runs StepQueue. Even when `useLangGraph` is `true`, you return `202` but never invoke a graph. The call at **line 1716** shows the StepQueue path:

```
## src/server.ts
1716:       const result = await stepQueue.runWorkflow(sessionId, steps, {
1717:         deterministic: body?.deterministic ?? true,
1718:         seed: body?.seed ?? Math.floor((Date.now() % 100000) / 10),
1719:       });
```

…and the current `if (useLangGraph)` block simply responds without starting any real graph work (lines **1698–1739** are just logging + 202):

```
1698:   if (useLangGraph) {
1699:     console.log("[/api/execute] AGENTS_RUNTIME=langgraph, useLangGraph=true");
1700:     const executionId = buildExecutionId(sessionId);
1701:     console.log(`[/api/execute] Created execution ${executionId}`);
1702:     console.log("[/api/execute] LangGraph path: Completing execution ... with StepQueue result");
1739:     res.status(202).json({ executionId, status: "started" });
1740:     return;
1741:   }
```

**Why change it:** ADR/G3 requires the **runtime behind the flag** to be LangGraph. We need to **start a real graph run** and let the execution store get updated by it.

#### 2a) Add an import (near your existing orchestrator imports)

Find this import block near the top (around line **71** in your compiled file):

```
0065: import { buildExecutionId } from "./orchestrator/graph.js";
0066: import { StepQueue, type StepDescriptor, type StepHandler } from "./orchestrator/stepQueue.js";
```

**Add this new import on the next line:**

```ts
import { runWithLangGraph } from "./orchestrator/graph.js";
```

#### 2b) Replace the `useLangGraph` branch to kick off the graph (exact lines)

**Replace lines 1698–1739** with the following block:

```ts
  if (useLangGraph) {
    console.log("[/api/execute] runtime=langgraph");
    const executionId = buildExecutionId(sessionId);

    // Persist "started" for polling clients
    await executionsStore.createExecution({
      id: executionId,
      status: "started",
      route: "execute",
      input: { prompt: body?.prompt, sessionId, deterministic: body?.deterministic ?? true, seed: body?.seed },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Respond immediately (202) with execution id
    res.status(202).json({ executionId, status: "started" });

    // Fire-and-forget: actually run the graph now, and let it update the store
    (async () => {
      try {
        await runWithLangGraph({
          executionId,
          sessionId,
          steps,
          stepQueue, // reuse the live queue instance already created in server.ts
          deterministic: body?.deterministic ?? true,
          seed: body?.seed ?? Math.floor((Date.now() % 100000) / 10),
        });
      } catch (err) {
        // runWithLangGraph already marks failure; nothing else needed here
        console.error("[/api/execute] LangGraph failure:", err);
      }
    })();

    return;
  }
```

**Why this works:**

* It **reuses the exact `steps`** you already built earlier in the same handler (so output/parity remain identical).
* It **invokes a real LangGraph `StateGraph`** (see §1) that runs those steps inside a node.
* It writes `started` → `running` → `completed/failed` transitions to your existing **`executionsStore`** which your `GET /api/executions/:id` already polls.

---

## 3) (Optional but recommended) Add a tiny log to make the tie-break obvious in prod logs

**File:** `src/server.ts`
Right after the `useLangGraph` check line (1698 in your compiled file), keep:

```ts
console.log(`[/api/execute] runtime=${useLangGraph ? "langgraph" : "stepqueue"}`);
```

**Why:** When someone sets the flag and hits the route, you’ll see **which** path actually ran.

---

## 4) No UI/API changes needed

Your existing routes already support:

* `POST /api/execute` → now returns `202 { executionId, status: "started" }` under LangGraph
* `GET /api/executions/:id` → polls until `status: "completed"` with `output`
* `GET /api/executions` → lists

The graph updates the same store those routes read from.

---

## 5) Tests (how to validate this change in *your* tree)

You already have orchestration tests under `tests/orchestrator/` in the repo tree. After the edits above, you can validate **parity** by running your existing execute tests under the flag:

```bash
AGENTS_RUNTIME=langgraph npm test -- -t "execute"    # or run the whole suite
```

If you want a surgical check at the HTTP level, add this one minimal test (create if missing):

**File:** `tests/api/execute-with-langgraph.test.ts`

```ts
import { describe, it, expect } from "vitest";
import fetch from "node-fetch";

describe("execute (langgraph runtime)", () => {
  it("returns 202 and eventually completes", async () => {
    const resp = await fetch("http://localhost:3000/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "ping" }),
    });
    expect(resp.status).toBe(202);
    const { executionId } = await resp.json();
    expect(executionId).toMatch(/^graph-/);

    // poll
    for (let i = 0; i < 40; i++) {
      const r = await fetch(`http://localhost:3000/api/executions/${executionId}`);
      const j = await r.json();
      if (j.status === "completed") return;
      await new Promise((res) => setTimeout(res, 250));
    }
    throw new Error("execution did not complete in time");
  });
});
```

Run with:

```bash
AGENTS_RUNTIME=langgraph npm run dev   # in one shell
AGENTS_RUNTIME=langgraph npm test -- -t "langgraph runtime"
```

---

# TL;DR – exact places to edit (with reasons)

1. **`src/orchestrator/graph.ts`**

   * **Replace the whole file** with the code above.
   * **Why:** Replace the `setTimeout` stub (lines ~33–58) with a real `StateGraph` that runs your existing StepQueue workflow inside a LangGraph node.

2. **`src/server.ts`**

   * **Add import** right after your orchestrator imports (around **line 66–72**):
     `import { runWithLangGraph } from "./orchestrator/graph.js";`
     **Why:** To call the new graph runner.
   * **Replace lines 1698–1739** with the “Fire-and-forget graph” block above.
     **Why:** Actually route the flag path to **LangGraph**, not StepQueue.

3. **`package.json`**

   * **Add deps:** `@langchain/langgraph` and `@langchain/core`.
   * **Why:** The real runtime requires them.

---

## What you’ll see after you make these changes

* `POST /api/execute` with `AGENTS_RUNTIME=langgraph` returns:

  ```json
  { "executionId": "graph-<id>", "status": "started" }
  ```
* Logs show:

  ```
  [/api/execute] runtime=langgraph
  ```
* Polling `/api/executions/<id>` transitions:

  ```
  started → running → completed
  ```
* The **output** is produced by the same `steps` you already build today, so parity with StepQueue is preserved.

If you want me to tailor the graph to break the big step into nodes (Clarify → Plan → Exec → Repair → Deliver) I can do that too; I started with the minimal “real graph wrapper” that gets you **over G3 right now** with the fewest changes to your system and zero behavior drift.
