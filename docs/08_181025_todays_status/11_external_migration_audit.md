Got it — you’re asking **exactly** how to upgrade your repo to **LangGraph v1.0.0 (JS)**, what to change, and how to prove it works. Here’s the tight, repo-specific plan with evidence from the official 1.0 docs.

---

# TL;DR (no fluff)

* **Install v1.0.0** of `@langchain/langgraph` (and keep your `@langchain/core` current).
* **Change your graph state definition** to the **new `Annotation` schema** and construct the graph with `new StateGraph(GraphState)` (the old `{ channels: {} }` constructor is deprecated in 1.0). ([LangChain Documentation][1])
* (Optional but smart) **Compile with a checkpointer** (e.g., `MemorySaver`) so you can resume/replay properly. ([LangChain Docs][2])
* **Verify** with a real-LLM E2E run via your existing UI/server.

Why this is the required change: the 1.0 docs show `Annotation.Root(...)` + `new StateGraph(GraphState)` as the canonical way to define typed state, and the migration pages point out where 1.0 tightened/cleaned the surface. ([LangChain Documentation][1])

---

# 1) Install/lock versions

```bash
npm i -E @langchain/langgraph@1.0.0 @langchain/core@latest @langchain/langgraph-checkpoint@latest
```

* 1.0 uses the `Annotation` API for state definitions and keeps the START/END + `addNode`/`addEdge` model. ([LangChain Docs][3])
* `@langchain/langgraph-checkpoint` gives you `MemorySaver` for dev persistence; production can move to a durable checkpointer later. ([LangChain Docs][2])

---

# 2) Exact edit in **`src/orchestrator/graph.ts`**

> Your current file constructs `StateGraph` with `{ channels: {} }`. Change it to Annotation-based state (the 1.0 way).

**Add/modify imports at the top:**

```ts
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph-checkpoint"; // optional (dev)
```

([LangChain Documentation][1])

**Define your typed state once (replace your old “channels” shape):**

```ts
const GraphState = Annotation.Root({
  executionId: Annotation<string>(),
  prompt: Annotation<string>(),
  projectName: Annotation<string | undefined>(),
  plan: Annotation<unknown | undefined>(),
  files: Annotation<Array<unknown>>({ reducer: (a, b) => a.concat(b) }),
  testResults: Annotation<unknown | undefined>(),
  repair: Annotation<unknown | undefined>(),
  logs: Annotation<string[]>({ reducer: (a, b) => a.concat(b) }),
  status: Annotation<"started" | "running" | "completed" | "failed">(),
  error: Annotation<unknown | undefined>(),
});
```

This follows the official 1.0 pattern: define state with `Annotation.Root` and (optionally) add reducers for list-like channels. ([LangChain Documentation][1])

**Build the graph with the new constructor (replace your old `new StateGraph({ channels: ... })`):**

```ts
const builder = new StateGraph(GraphState);
```

([LangChain Docs][3])

**(Optional, recommended) Compile with a checkpointer for dev:**

```ts
const checkpointer = new MemorySaver();            // in-memory (dev only)
const app = builder.compile({ checkpointer });     // was: builder.compile()
```

The 1.0 persistence docs show compiling with a checkpointer. `MemorySaver` works for local/dev; swap to a durable checkpointer later. ([LangChain Docs][2])

> Your existing `addNode`, `addEdge`, `compile`, and `invoke` calls remain valid; 1.0 still uses the same execution model. Conditional routing (if you add it) uses `addConditionalEdges(...)`. ([LangChain Docs][3])

---

# 3) (If you add branching) use **conditional edges** in 1.0

Example (aligns with your “test → deliver or repair” loop):

```ts
builder.addConditionalEdges("test", (state) => {
  // decide next step by state
  return state.testResults && (state as any).testResults.passed ? "deliver" : "repair";
});
```

This is the 1.0 pattern for dynamic routing. ([LangChain Docs][3])

---

# 4) Tests: avoid the Vitest alias trap for real-LLM E2E

* Your unit tests may alias `@langchain/langgraph` to a stub. Keep that for unit speed, **but** add a **separate E2E** that **hits the running server over HTTP** so no aliasing applies. (The docs don’t care about your test rig; this is just how to prove real integration.)
* That E2E is how you’ll exercise **real OpenAI calls** through the LangGraph path.

---

# 5) Verify with **real LLMs** (your .env has a real key)

1. Terminal A:

   ```bash
   set -a; source .env; set +a
   AGENTS_RUNTIME=langgraph npm run dev
   ```
2. Open the UI (your screenshot) and run a small prompt. You should see:

   * `POST /api/execute` returns **202** + execution id.
   * Polling shows **running → completed**.
3. (Optional) Add a one-off E2E test that **POSTs** to `/api/execute` and **polls** `/api/executions/:id` until `status === "completed"` (≤120s). This proves the **real** 1.0 graph path works with a live model.

---

# 6) What’s changed in 1.0, in plain English (so you know this isn’t busywork)

* **State is now first-class & typed**: you declare it via `Annotation.Root` and pass that to `new StateGraph(GraphState)`. That’s the big constructor change you must make. ([LangChain Documentation][1])
* **Persistence is built-in via checkpointers**: compile with `{ checkpointer }` (e.g., `MemorySaver`) and you get resumability/threaded runs out of the box. Use an in-memory saver for dev; swap later to durable storage. ([LangChain Docs][2])
* **Nodes/edges/START/END stay the same**; conditional edges are the standard branching mechanism. ([LangChain Docs][3])
* The **v1 migration docs** and **release notes** confirm the tightened APIs and point to this pattern.

---

# 7) Quick checklist you (or your IDE assistant) can execute now

1. **Upgrade packages**

```bash
npm i -E @langchain/langgraph@1.0.0 @langchain/core@latest @langchain/langgraph-checkpoint@latest
```

2. **Refactor `src/orchestrator/graph.ts`**

* Import `Annotation` and (optionally) `MemorySaver`.
* Replace old `{ channels: {} }` constructor with `Annotation.Root(...)` + `new StateGraph(GraphState)`.
* (Optional) `builder.compile({ checkpointer: new MemorySaver() })`.

3. **Build & typecheck**

```bash
npm run build && npm run typecheck && npm run lint
```

4. **Run real E2E** (server + UI or a tiny HTTP test) with your real OpenAI key:

```bash
set -a; source .env; set +a
AGENTS_RUNTIME=langgraph npm run dev
# → use the UI (or POST/GET via curl) until status = completed
```

If those pass, you’re on **LangGraph 1.0** properly — no stubs, no legacy constructor, ready for real multi-node orchestration and (if you keep the checkpointer) proper resume/replay.

---

If you want, I can draft the exact `graph.ts` diff (drop-in, using your existing node functions) and a minimal E2E test file that hits `/api/execute` over HTTP — that keeps your unit tests fast while proving **real** LLM integration end-to-end.

[1]: https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.StateGraph.html "StateGraph | langchain.js"
[2]: https://docs.langchain.com/oss/javascript/langgraph/persistence "Persistence - Docs by LangChain"
[3]: https://docs.langchain.com/oss/javascript/langgraph/workflows-agents "Workflows and agents - Docs by LangChain"
