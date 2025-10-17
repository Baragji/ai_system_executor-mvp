Got it. I read your Repomix pack (Phase-19 docs + today’s handoff/results/suggestions). Here’s the decisive path, no fluff.

# Executive verdict

* **Gate G3 = BLOCKED (product bugs).** Workflow automation is fine; evidence isn’t produced because:

  * **Parity test** fails with `AGENTS_RUNTIME=stepqueue` → **500 from POST /api/execute** (server StepQueue path).
  * **Perf test** times out → LangGraph path doesn’t reach a **“completed”** state.
* **Do NOT mark G3 passed** and do not “paper” the ledger. Fix the product, then let automation advance the gate.

# What to do now (in this order)

## 1) Make targeted test runs actually run a single file

Your logs show `AGENTS_RUNTIME=langgraph npm test tests/orchestrator/replay.test.ts` still exited **1** because the script likely runs the full suite. Fix the script so file args are honored:

**package.json**

```diff
- "test": "vitest"
+ "test": "vitest --run"
+ "test:file": "vitest --run"
```

Your workflow runner should call:

```
npm run test:file -- tests/orchestrator/replay.test.ts
npm run test:file -- tests/orchestrator/parity.test.ts
npm run test:file -- tests/benchmarks/perf-overhead.test.ts
```

(Keep using `AGENTS_RUNTIME=langgraph` or `stepqueue` as required per test.)

> Why: lets the detector record **per-criterion** success even if other suites are red—no cheating, just scoped evidence.

## 2) Fix the StepQueue 500 (parity blocker)

Harden `POST /api/execute` (StepQueue branch). Wrap the StepQueue call; normalize failures into JSON (200 with `status:"failed"` or 4xx for caller errors). Example patch sketch:

**src/server.ts** (inside POST `/api/execute`)

```ts
try {
  if (runtime === 'stepqueue') {
    const result = await stepQueue.execute({ input, deterministic, seed });
    return res.status(200).json({ status: 'completed', result });
  }
  // ...langgraph path...
} catch (err) {
  // Map unexpected exceptions to RFC 9457 if enabled; otherwise safe JSON
  const detail = err instanceof Error ? err.message : String(err);
  // Optional: problem+json when PROBLEM_DETAILS_ENABLED
  return res.status(500).json({
    type: 'about:blank',
    title: 'Execution failed',
    status: 500,
    detail
  });
}
```

Re-run:

```
AGENTS_RUNTIME=stepqueue npm run test:file -- tests/orchestrator/parity.test.ts
```

Expect **PASS** when StepQueue stops throwing.

## 3) Replace the LangGraph stub with a real, completing graph (perf + completion)

Implement a minimal but **real** StateGraph that:

* Accepts `{input, deterministic, seed}`
* Runs your existing modules (plan → generate → test → (repair?) → deliver)
* **Updates executionsStore** to `completed`
* Respects the deterministic seed

**Install deps**

```
npm i @langchain/langgraph@0.6.10 @langchain/core
```

**src/orchestrator/graph.ts** (outline you can drop in and wire)

```ts
import { StateGraph } from "@langchain/langgraph";
import { executionsStore } from "./executionsStore";
import { decomposeTask } from "../planning/decomposeTask";
import { generateCode } from "../executor/generateCode";
import { runInSandbox } from "../runner/runInSandbox";
import { multiTurnRepair } from "../repair/multiTurnRepair";

type ExecState = {
  input: string;
  seed?: number;
  deterministic?: boolean;
  plan?: any;
  code?: any;
  test?: { passed: boolean; report: any };
  status: "pending" | "running" | "failed" | "completed";
};

export async function runLangGraphExecution(opts: {
  id: string;
  input: string;
  deterministic?: boolean;
  seed?: number;
}) {
  const app = new StateGraph<ExecState>({ channels: {
    input: { value: () => "" },
    status: { value: () => "pending" as const },
  }});

  app.addNode("plan", async (s) => ({ ...s, plan: await decomposeTask(s.input), status: "running" }));
  app.addNode("generate", async (s) => ({ ...s, code: await generateCode(s.plan, { seed: s.seed, deterministic: s.deterministic }), status: "running" }));
  app.addNode("test", async (s) => {
    const report = await runInSandbox(s.code);
    return { ...s, test: { passed: report.passed, report }, status: "running" };
  });
  app.addNode("repair", async (s) => ({ ...s, code: await multiTurnRepair(s.code, s.test?.report), status: "running" }));
  app.addNode("deliver", async (s) => ({ ...s, status: "completed" }));

  app.addEdge("plan", "generate");
  app.addEdge("generate", "test");
  app.addConditionalEdges("test", (s) => (s.test?.passed ? "deliver" : "repair"), { deliver: "deliver", repair: "repair" });
  app.addEdge("repair", "test");
  app.setEntryPoint("plan");

  const compiled = app.compile();
  executionsStore.set(opts.id, { status: "running" });
  const final = await compiled.invoke({ input: opts.input, seed: opts.seed, deterministic: opts.deterministic, status: "pending" });
  executionsStore.set(opts.id, { status: final.status, output: final });
  return final;
}
```

**src/orchestrator/adapter.ts** (ensure LangGraph branch calls `runLangGraphExecution` and returns when `status:"completed"`).

Re-run:

```
AGENTS_RUNTIME=langgraph npm run test:file -- tests/benchmarks/perf-overhead.test.ts
```

If timing is tight, keep the threshold but ensure the graph actually completes so the test measures real overhead. (Don’t lower the bar; optimize if needed.)

## 4) Re-run all three, generate evidence, advance gate

```
AGENTS_RUNTIME=langgraph npm run test:file -- tests/orchestrator/replay.test.ts
AGENTS_RUNTIME=stepqueue npm run test:file -- tests/orchestrator/parity.test.ts
AGENTS_RUNTIME=langgraph npm run test:file -- tests/benchmarks/perf-overhead.test.ts

npm run state:next:auto
git diff .automation/GATES_LEDGER.md
npm run state:show | grep G3
```

**Expected:** three ✅ criteria flip in the ledger, **G3: passed**, next suggestion moves to G4.

# Small but important workflow hardening (keep)

* Ensure your autonomous runner uses the **file-scoped** command (above) for each criterion so a red suite elsewhere doesn’t suppress valid evidence.
* Keep RFC-9457 envelopes on unexpected errors (already in your plan) so failures are diagnosable and auditable.

# Final stance

* **Do not** manually edit the ledger.
* **Do not** ship another stub.
* After the three greens land and the ledger updates itself, proceed to **G4 (HITL + MCP)** under feature flags.

If you want, I’ll draft the exact `git apply` patches for the `package.json` script change, the StepQueue try/catch, and the LangGraph adapter + graph file.
