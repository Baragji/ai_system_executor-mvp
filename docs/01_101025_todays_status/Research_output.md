### 1. Executive Summary

**Recommendation:** implement **“Durable, step-checkpointed jobs on BullMQ + an MCP-style filesystem tool for the LLM”**. Concretely: (a) split each long project-generation run into **small, idempotent steps** (CLARIFY → PLAN → GENERATE_N → TEST_N …), persisting a **checkpoint record** (JSON) after every step in Redis/Postgres and a **workspace manifest** (file tree + hashes + last diffs) in your project store; (b) run steps as **BullMQ jobs** so pause/resume survives process restarts and multi-worker scaling; (c) expose the output directory to the LLM through a **restricted “read_file / list_dir / read_diff” tool** (MCP-style) so a resumed LLM call can **reconstruct context** from the partial workspace. This mirrors how production agents preserve context—via **tooling that reads the repo/filesystem + step history**, not by relying on a single long chat thread. BullMQ gives you durable queues and back-pressure; context continuity comes from **explicit file inspection + summaries + diffs** (as used in Cursor’s Merkle/diff indexing and Replit’s file/context facilities). ([docs.bullmq.io][1])

---

### 2. Top 3 Patterns Comparison Table

| Pattern                                                      | Pros                                                                                                                                              | Cons                                                                                                                                        | Complexity      | Production Examples                                                                       | Recommended?                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Redis queue with step checkpoints (BullMQ)**               | Simple to adopt in Node/TS; queue/job pause, retry, concurrency; survives restarts; rich ecosystem (Bull Board/Arena)                             | Queue “pause” doesn’t interrupt an in-flight step—design steps to be short; you must build your own checkpoint schema & LLM context tooling | **Low-Medium**  | Used broadly; BullMQ docs + “used by” list; NestJS integration; guides & UIs              | **Yes (primary)** for your stack (Node 20, Express, TS) and need for fast adoption. ([docs.bullmq.io][2]) |
| **Durable Workflow Engine w/ Signals (Temporal TypeScript)** | Service-level **durable execution**; built-in timers/retries; **signals** let you pause a single workflow between activities; great observability | **Steeper learning curve**; adds separate service (Temporal cluster)                                                                        | **Medium-High** | Temporal customers include Snap/Netflix/Box; active in agentic AI; TypeScript SDK samples | **Alt #1** if you can run Temporal and want first-class workflow semantics. ([thesaasnews.com][3])        |
| **Durable Functions/Steps (Inngest)**                        | **Step-level memoization/checkpoints** out of the box; **pause functions**; easy TS SDK; good for agentic flows; cloud or OSS                     | SaaS lock-in tradeoffs unless you self-host; mental model of steps/events                                                                   | **Low-Medium**  | Inngest customers & case studies; active releases; clear docs on steps/durable execution  | **Alt #2** if you accept vendor or self-host Inngest for speed of delivery. ([inngest.com][4])            |

---

### 3. Recommended Library (if job queue pattern chosen)

**Library:** **BullMQ** (Redis-backed, TypeScript-first)

**Why BullMQ over alternatives:**

* **Maturity & adoption** (actively maintained, TS, production deployments; official docs on pausing; “used by” list). Bee-Queue lacks all-workers pause/resume and is tuned for very short jobs; Agenda is scheduler-oriented on MongoDB and has long-standing ambiguity about per-job pause. ([docs.bullmq.io][2])

**Install**

```bash
npm i bullmq ioredis
# Optional UIs:
npm i bull-board          # or: npm i arena
```

(“Going to production” guidance available in BullMQ docs.) ([docs.bullmq.io][5])

**Quick start (TypeScript)** — single queue, worker, events:

```ts
// queue.ts
import { Queue, Job, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL!);
export const generationQueue = new Queue("project-gen", { connection });
export const genEvents = new QueueEvents("project-gen", { connection });

// Worker with small, idempotent steps
export const worker = new Worker("project-gen", async (job: Job) => {
  const { step } = job.data as { step: string };
  switch (step) {
    case "PLANNING":   return await runPlanning(job);
    case "GENERATE":   return await runGenerateChunk(job);
    case "TEST":       return await runTestChunk(job);
    default:           throw new Error(`Unknown step ${step}`);
  }
}, { connection, concurrency: 4 });

genEvents.on("completed", ({ jobId }) => console.log("done", jobId));
genEvents.on("failed", ({ jobId, failedReason }) => console.error(jobId, failedReason));
```

(BullMQ event and worker patterns per docs.) ([bullmq.io][6])

**Pause/resume API (queue-level)**

```ts
// POST /api/pause
await generationQueue.pause();

// POST /api/resume
await generationQueue.resume();
```

(Queue pause stops picking new jobs; in-flight step finishes—make steps small.) ([docs.bullmq.io][2])

**Checkpoint configuration (core of durability)**

* After **every step**, persist:

  * `jobId`, `state` (`CLARIFYING|PLANNING|GENERATING:chunk-k|TESTING:chunk-m`),
  * `cursor` (which files/chunks done),
  * `workspaceManifest` (file paths + sizes + **content hash**; latest **diff summary**),
  * **LLM prompt skeleton** (system+tools) and the **tool outputs** used so far.
* Store `workspaceManifest` in Postgres or S3 (and cache in Redis) and a compact per-job JSON in Redis for quick resume. (Design aligns with **“process step jobs”** and checkpointing guidance.) ([docs.bullmq.io][1])

---

### 4. Implementation Checklist

* [ ] **Introduce “step size” invariants** (≤30–60s each) so pause takes effect quickly and retries are cheap. ([docs.bullmq.io][2])
* [ ] **Refactor job into steps**: PLAN → GENERATE_CHUNK[i] → TEST_CHUNK[j] with deterministic inputs, writing a checkpoint after each. ([docs.bullmq.io][1])
* [ ] **Install BullMQ** and wire a **single queue + worker** per project type; add **QueueEvents** → broadcast to your SSE endpoint. ([bullmq.io][6])
* [ ] **Add pause/resume endpoints** that call `queue.pause()`/`queue.resume()` and set a **job control flag** in Redis (so workers can respect a per-job pause at step boundaries). ([docs.bullmq.io][2])
* [ ] **Add an MCP-style FS tool**: `read_file`, `list_dir`, `read_manifest`, `read_diff(jobId, sinceStep)`—wrapped behind a function/tool call the LLM can invoke. ([Anthropic][7])
* [ ] **On resume**, compose the LLM input from **(a)** latest checkpoint, **(b)** workspace manifest + last diffs, **(c)** explicit instruction delta from the user; **do not rely on prior chat only**. (This mirrors Cursor/Replit patterns of repo/file context.) ([Pragmatic Engineer][8])
* [ ] **Abort handling:** wire `AbortSignal` through your LLM SDKs for streaming requests; otherwise, abort at step boundaries. Document uninterruptible provider limits. ([ai-sdk.dev][9])
* [ ] **SSE status channel**: keep your current `202 Accepted + SSE` for progress and human-in-the-loop messages (pause accepted, awaiting next step, resumed at step k). ([developer.mozilla.org][10])

---

### 5. Code Examples (TypeScript, Express + BullMQ)

**A) Job definition with step checkpoints**

```ts
// steps.ts
import { generationQueue } from "./queue";
import { getCheckpoint, saveCheckpoint, recordDiff } from "./store";
import { callModelWithTools } from "./llm"; // wraps your LLM + tools

export async function enqueueProjectRun(runId: string, initial) {
  await generationQueue.add("project", { runId, step: "PLANNING", data: initial });
}

export async function runPlanning(job) {
  const { runId, data } = job.data;
  const cp = await getCheckpoint(runId);
  const result = await callModelWithTools(runId, {
    goal: cp?.goal ?? data.goal,
    ask: "Produce a plan with file map and milestones."
  });
  await saveCheckpoint(runId, { state: "PLANNING", plan: result.plan, cursor: { genIndex: 0 }});
  // fan out next step
  await generationQueue.add("project", { runId, step: "GENERATE", data: { index: 0 }});
}

export async function runGenerateChunk(job) {
  const { runId, data: { index } } = job.data;
  const cp = await getCheckpoint(runId);
  // LLM reads existing files via tools and continues:
  const result = await callModelWithTools(runId, {
    plan: cp.plan, cursor: cp.cursor,
    ask: `Generate chunk ${index} according to plan; respect existing files`
  });
  await recordDiff(runId, result.changedFiles); // store diff summary
  await saveCheckpoint(runId, { state: `GENERATING:${index}`, cursor: { genIndex: index+1 }});
  // enqueue next step or move to TEST
  if (index+1 < cp.plan.chunks) {
    await generationQueue.add("project", { runId, step: "GENERATE", data: { index: index+1 }});
  } else {
    await generationQueue.add("project", { runId, step: "TEST", data: { index: 0 }});
  }
}
```

**B) Pause endpoint & worker respect**

```ts
// control.ts
import { generationQueue } from "./queue";
import { setJobControl } from "./store";

app.post("/api/pause/:runId", async (req, res) => {
  await setJobControl(req.params.runId, { paused: true, ts: Date.now() });
  res.status(202).json({ status: "pausing" });
});

app.post("/api/resume/:runId", async (req, res) => {
  await setJobControl(req.params.runId, { paused: false, note: req.body.delta });
  // Re-enqueue from last checkpoint:
  const cp = await getCheckpoint(req.params.runId);
  await generationQueue.add("project", { runId: req.params.runId, step: cp.nextStep, data: cp.nextData });
  res.status(202).json({ status: "resumed" });
});

// In worker step functions, before moving to next step:
const ctrl = await getJobControl(runId);
if (ctrl.paused) { 
  // idempotently stop here; do NOT enqueue next step.
  return; 
}
```

(BullMQ pause is queue-wide; per-job pause is handled in your logic by not enqueueing the next step once paused.) ([docs.bullmq.io][2])

**C) Checkpoint save/load (durable)**

```ts
// store.ts
import { createClient } from "redis";
import { Pool } from "pg";
export const r = createClient({ url: process.env.REDIS_URL! });
export const pg = new Pool({ connectionString: process.env.POSTGRES_URL! });

export async function saveCheckpoint(runId: string, patch: any) {
  const key = `cp:${runId}`;
  const cur = JSON.parse((await r.get(key)) ?? "{}");
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  await r.set(key, JSON.stringify(next));
  await pg.query(
    `insert into checkpoints(run_id, payload) values($1,$2)
     on conflict (run_id) do update set payload=$2, updated_at=now()`,
     [runId, next]);
  return next;
}
```

**D) Minimal MCP-style file tools exposed to the LLM**

```ts
// tools/fsTools.ts
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.env.WORKSPACE_ROOT!;
const allow = (p:string) => {
  const full = path.resolve(ROOT, p);
  if (!full.startsWith(path.resolve(ROOT))) throw new Error("path not allowed");
  return full;
};

export const list_dir = async ({ dir }: {dir:string}) => {
  const full = allow(dir);
  const entries = await fs.readdir(full, { withFileTypes: true });
  return entries.map(e => ({ name: e.name, type: e.isDirectory() ? "dir":"file" }));
};

export const read_file = async ({ file, maxBytes=200_000 }: {file:string; maxBytes?:number}) => {
  const full = allow(file);
  const buf = await fs.readFile(full);
  const body = buf.slice(0, maxBytes).toString("utf8");
  return { path: file, bytes: buf.length, body, truncated: buf.length > maxBytes };
};
```

(This mirrors the **Model Context Protocol**’s filesystem approach—tools like `read_file`, `list_directory`—used by Claude/Replit ecosystem for agent file context.) ([Anthropic][7])

---

### 6. Migration Path from Current Code

1. **Keep your existing state machine**; make each state produce **one or more BullMQ step jobs** (≤60s each).
2. Replace your ad-hoc JSON persistence with **checkpoint records** (Redis for speed + Postgres/S3 for durability).
3. Add a **workspace manifest** builder (file list + sizes + **hash** per file). Update it after every write to disk; store last **diff**. (Cursor’s Merkle/diff technique shows why hashes/diffs scale.) ([Pragmatic Engineer][8])
4. Wrap your LLM client with **tooling** so it can call `read_file`/`list_dir` and request “manifest since step N”. ([Anthropic][7])
5. Push **resume semantics** into the next step’s prompt: provide plan/cursor + manifest/diffs + the user’s adjustments.
6. Swap your current “pause” flag to **stop enqueuing** the next step on the worker when paused; keep **queue pause** for maintenance windows only. ([docs.bullmq.io][2])

---

### 7. Testing Strategy

* **Deterministic pause points:** inject a `PAUSE_AT=GENERATE:5` env var the worker checks before enqueueing next step.
* **Race tests:** fire `/pause` while an LLM call is running; verify pause takes effect at the *next* step; assert no extra steps get enqueued.
* **Durability test:** kill the worker process mid-run; restart; assert worker resumes from last checkpoint (compare workspace manifest hashes).
* **Context tests:** simulate resume with user delta; log the **exact tool reads** (files + byte counts) the LLM invoked to reconstruct context.
* **Throughput tests:** run N concurrent runs; verify Redis memory and worker concurrency (BullMQ production guide). ([docs.bullmq.io][5])

---

### 8. Edge Cases & Handling

* **Pause during LLM call:** cannot reliably interrupt provider mid-request; forward an **AbortSignal** where supported (streaming) and otherwise pause at boundary; document that billing may still occur for in-flight requests. ([ai-sdk.dev][9])
* **Rapid pause→resume:** resume endpoint should be **idempotent**; if a step already enqueued, don’t double-enqueue—compare `checkpoint.nextStep`.
* **Server crash after pause:** upon boot, a **reconciler** scans checkpoints where `paused=true` and **does not** enqueue next step.
* **Cancel after pause:** mark run `CANCELLED`; do not enqueue more steps; optionally run a **compensating cleanup** (delete temp artifacts). (Pattern aligns with saga/compensation ideas.) ([microservices.io][11])
* **Multiple pause requests:** treat as idempotent updates; return current status.
* **Resume without pause:** 400 with helpful message and current status.

---

### 9. Resources (evidence & further reading)

* **BullMQ (queueing & pausing)**: Docs on pausing queues; production notes; patterns for step jobs; UI tools (Bull Board/Arena). ([docs.bullmq.io][2])
* **Temporal (signals/pause semantics & TS SDK)**: Community answers on pausing via signals; TS samples; blog & customer list. ([Temporal][12])
* **Inngest (steps, durable execution & pausing)**: Steps & Workflows; durable execution deep dive; function pause docs; quick-start. ([inngest.com][13])
* **AI agents & context continuity**: Cursor’s **Merkle-tree/diff indexing**; Replit **fs API** and **replit.md**/**checkpoints** docs; MCP announcement (filesystem tools). ([Pragmatic Engineer][8])
* **HTTP coordination**: `202 Accepted` pattern; SSE best practices. ([developer.mozilla.org][10])
* **Abort/cancellation**: AI SDK abortSignal; OpenAI/streaming cancel caveats. ([ai-sdk.dev][9])

---

## CRITICAL Deep-Dives (Answers to your priorities)

**Q3 — How do coding assistants (Replit v3, Cursor, etc.) do pause/continue with context?**
They **don’t rely on a single chat history**; they **recompute context at resume** using file/repo state + step history:

* **Cursor** maintains **file-tree hashes and diffs** (Merkle-tree). On resume, it knows what changed and sends **only the relevant files/sections** to the model or indexer—this preserves continuity even after editor restarts. Your analog: maintain a **workspace manifest (paths, sizes, hashes) + last diff** per step and feed that to the LLM or let the LLM **invoke tools** to read files on demand. ([Pragmatic Engineer][8])
* **Replit Agent** exposes **filesystem operations** (docs show `fs` API for extensions), **context files** (`replit.md`) and **checkpoints/rollbacks** tied to version control. The agent therefore can **open/read files, edit them, and continue** after interruptions because the state lives in the repo, not ephemeral chat. Your analog: MCP-style tools and checkpoints. ([Replit Docs][14])
* **Industry trend (MCP):** standardize **read_file/list_dir/git**-style tools so agents can **load context from disk/repo on demand** and continue seamlessly after pauses or restarts. Replit and others are named adopters. ([Anthropic][7])

**Q4 — LLM context continuity across interruptions**
Use **structured context + tools** instead of giant prompts:

* Provide a **system message** with run metadata (goal, plan, cursor) and a **manifest/diff summary**;
* Let the model **pull concrete files** via `read_file` as needed;
* For large trees, **page** the manifest (top-N by relevance), or provide per-directory manifests on demand;
* Persist **tool call results** (e.g., “read X lines of src/router.ts at step 7”) in the checkpoint so the next call can reference them. (This mirrors Assistants’ file-search and MCP’s filesystem tools.) ([OpenAI Platform][15])

**Q11 — Working code references**

* **Temporal TS examples** (signals/activities): official samples. ([GitHub][16])
* **Inngest “steps” & pause guides**: official docs. ([inngest.com][13])
* **BullMQ step-job pattern** (official “process step jobs”). ([docs.bullmq.io][1])
* **BullMQ + UIs**: Bull Board, Arena. ([GitHub][17])

---

## 2. Job Queue Libraries (snapshot, Oct 2025)

| Library             |                  Stars (approx.) | NPM ecosystem                 | Pause/Resume                                         | Checkpointing                                  | Backend          | TS quality     | Durability                                                                             |
| ------------------- | -------------------------------: | ----------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ---------------- | -------------- | -------------------------------------------------------------------------------------- |
| **BullMQ**          |                  ~8–10k (active) | ioredis; Bull Board/Arena     | Queue pause/resume; worker pause                     | **Your responsibility** (add step checkpoints) | **Redis**        | First-class TS | Survives crashes via Redis persistence; at-least-once semantics. ([docs.bullmq.io][2]) |
| **Temporal TS SDK** | ~4–6k SDK; platform >21k overall | Own service/cluster           | Per-workflow **signals** to pause between activities | Built-in workflow state                        | Temporal service | First-class TS | Strong durability & replay (event sourcing). ([GitHub][18])                            |
| **Inngest**         |                ~5k+ across repos | Hosted and OSS; CLI/devserver | **Function pause** supported; **Steps**              | Steps memoization built-in                     | Inngest engine   | Strong TS      | Durable execution; step re-runs & memoization. ([inngest.com][4])                      |
| **Bee-Queue**       |                              ~4k | Redis                         | Global pause exists, fewer features                  | DIY                                            | Redis            | OK TS          | Geared for short jobs; less feature-rich than BullMQ. ([GitHub][19])                   |
| **Agenda**          |                              ~9k | MongoDB                       | No clear per-job pause; issues noted                 | DIY                                            | MongoDB          | TS defs exist  | Scheduler-centric; survivability depends on Mongo. ([GitHub][20])                      |

*(Exact star/download figures change; rely on the docs/features differences for your decision.)*

---

## 6. HTTP Request Coordination (validation)

Your **“202 Accepted + SSE progress”** is the right pattern: respond 202 immediately, then stream progress and human-in-the-loop prompts over SSE; accept **pause/resume** on a control endpoint (or small WebSocket if you need client-to-server control over the same socket). ([developer.mozilla.org][10])

---

## 7. Aborting Long-Running Operations (practical guidance)

* Prefer **streaming** calls and forward **AbortSignal** through your LLM SDK to stop streams; if the provider can’t cancel compute, treat it as **best-effort** and **pause at step boundary**. Some SDKs support abort on streams but not guaranteed on the provider side. ([ai-sdk.dev][9])
* Don’t block the event loop; always wrap API calls in a step with a timeout and **retry with backoff**.
* If a request is uninterruptible (e.g., long batch tool), surface **“pause pending…”** in SSE and apply pause before the next step.

---

## 11. (Extra) Minimal Prompt Skeleton for Resume

At resume, send a compact **system prompt**:

> **System:** You are resuming run `${runId}`. Goal: `${goal}`. Plan step: `${cursor}`. You can call tools: `read_file`, `list_dir`, `read_diff`. Use the **manifest** to decide what to read. Only modify files listed in “targets”.
> **Context:** Manifest summary (dirs, counts, top N large files), last 2 **diff summaries**, and any test failures.
> **User delta:** `${resumeInstructions}`.

This aligns with **Assistants File Search**/tooling and **MCP filesystem** best practices. ([OpenAI Platform][15])

---

## Why this solves your “REAL Problem”

* Your `/api/resume` currently wakes nothing and the LLM lacks context.
* With **BullMQ steps**, `/api/resume` **enqueues the next step** from checkpoint.
* With the **filesystem tools + manifest/diff**, the LLM **reads the exact partial output** it needs and **continues seamlessly**, like Cursor/Replit. ([Pragmatic Engineer][8])

---

#### Notes & Assumptions

* You have Redis and Postgres/S3 available; if not, use Redis + S3 only.
* For strict exactly-once, design steps **idempotent** and check `cursor` before writes (BullMQ is at-least-once). ([docs.bullmq.io][21])

If you want Temporal/Inngest instead, I can adapt the same **manifest + tools** pattern to their workflow primitives (signals or steps) with equivalent pause/resume semantics.

[1]: https://docs.bullmq.io/patterns/process-step-jobs?utm_source=chatgpt.com "Process Step Jobs"
[2]: https://docs.bullmq.io/guide/workers/pausing-queues?utm_source=chatgpt.com "Pausing queues"
[3]: https://www.thesaasnews.com/news/temporal-technologies-secures-146m-at-1-72b-valuation?utm_source=chatgpt.com "Temporal Technologies Secures $146M at $1.72B Valuation"
[4]: https://www.inngest.com/docs/guides/pause-functions?ref=homepage-observability&utm_source=chatgpt.com "Function Pausing - Inngest Documentation"
[5]: https://docs.bullmq.io/guide/going-to-production?utm_source=chatgpt.com "Going to production"
[6]: https://bullmq.io/?utm_source=chatgpt.com "BullMQ - Background Jobs processing and message queue ..."
[7]: https://www.anthropic.com/news/model-context-protocol?utm_source=chatgpt.com "Introducing the Model Context Protocol"
[8]: https://newsletter.pragmaticengineer.com/p/cursor?utm_source=chatgpt.com "Real-world engineering challenges: building Cursor"
[9]: https://ai-sdk.dev/docs/advanced/stopping-streams?utm_source=chatgpt.com "Advanced: Stopping Streams"
[10]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202?utm_source=chatgpt.com "202 Accepted - HTTP | MDN - Mozilla"
[11]: https://microservices.io/patterns/data/saga.html?utm_source=chatgpt.com "Pattern: Saga"
[12]: https://community.temporal.io/t/pausing-workflow-execution/10445?utm_source=chatgpt.com "Pausing workflow execution"
[13]: https://www.inngest.com/docs/features/inngest-functions/steps-workflows?utm_source=chatgpt.com "Steps & Workflows - Inngest Documentation"
[14]: https://docs.replit.com/extensions/api/fs?utm_source=chatgpt.com "fs API"
[15]: https://platform.openai.com/docs/assistants/tools/file-search?utm_source=chatgpt.com "Assistants File Search - OpenAI API"
[16]: https://github.com/temporalio/samples-typescript?utm_source=chatgpt.com "temporalio/samples-typescript"
[17]: https://github.com/felixmosh/bull-board?utm_source=chatgpt.com "felixmosh/bull-board: 🎯 Queue background jobs inspector"
[18]: https://github.com/temporalio/sdk-typescript?utm_source=chatgpt.com "temporalio/sdk-typescript: Temporal ..."
[19]: https://github.com/bee-queue/bee-queue?utm_source=chatgpt.com "bee-queue/bee-queue: A simple, fast, robust job/task ..."
[20]: https://github.com/agenda/agenda?utm_source=chatgpt.com "agenda/agenda: Lightweight job scheduling for Node.js"
[21]: https://docs.bullmq.io/?utm_source=chatgpt.com "What is BullMQ | BullMQ"
