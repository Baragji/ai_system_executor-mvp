# Phase 5 BullMQ Queue — Discovery

Date: 2025-10-11
Scope: Phase 3 of the MCP tooling roadmap — migrate long-running executor flows onto a Redis-backed BullMQ queue while preserving inline fallback.

## Integration Points & Current State

- **Single-run executor helper** — `src/server.ts`
  ```ts
  async function runSingleExecution(options: SingleExecutionOptions): Promise<SingleExecutionResult> {
    …
    output = await withTraceContext({ projectSlug: traceSlug, sessionId, phase: tracePhase ?? "single" }, async () =>
      generateExecutorOutputFromPrompt(systemPrompt, executorPrompt, { enforceTests: true, sessionId })
    );
    …
  }
  ```
  *CPU-bound + network-bound work executes on the HTTP thread; there is no queueing or durability if the process exits midway.*

- **Primary `/api/execute` endpoint** — `src/server.ts`
  ```ts
    try {
      const result = await runSingleExecution({
        sessionId,
        systemPrompt,
        executorPrompt: effectivePrompt,
        …
        tracePhase: "single"
      });
      return res.json(result.response);
    } catch (error) {
      …
    }
  ```
  *Directly awaits `runSingleExecution`, so the request lifecycle controls execution and retries. No queue metadata is persisted.*

- **Resume orchestration** — `src/server.ts`
  ```ts
    if (!providerConfigured) {
      …
    } else {
      createAbortSignal(sessionId);

      runSingleExecution({
        sessionId,
        systemPrompt: prompts.systemPrompt,
        executorPrompt: prompts.userPrompt,
        …
        tracePhase: "resume",
        progressMetadata
      }).catch(error => {
        …
      });
    }
  ```
  *Resumed runs still call the helper inline, so a crashed node loses the queued resume request.*

- **Planning path** — `src/server.ts`
  ```ts
          const planResult = await executePlanFlow({
            plan,
            planQuality: quality.score,
            targetRoot,
            …
            sessionId
          });
          setProgress(sessionId, "finalizing", 95);
          return res.json(planResult.response);
  ```
  *Plan execution also happens inline; it cleans directories and writes fixtures without any job abstraction.*

## Planned Changes

1. **Queue adapter module**: add `src/orchestrator/jobQueue.ts` exposing `configureExecutionQueue` and `submitExecutionJob`, instantiating BullMQ `Queue`, `Worker`, and `QueueEvents` when a Redis URL is available while providing an inline adapter fallback for local/testing.
2. **Job payload contracts**: define serializable payloads for `single` and `plan` executions so the worker can call `runSingleExecution` or `executePlanFlow` with preserved context.
3. **Server integration**: initialize the queue adapter once in `src/server.ts` after helper definitions and replace direct helper invocations with `submitExecutionJob`, awaiting the job result (or running inline fallback). Update resume flow to enqueue the resume execution instead of invoking the helper directly.
4. **Progress hooks**: ensure enqueued jobs push a `stage: "queued"` snapshot immediately to keep UI responsive before workers start processing.
5. **Tests**: cover the queue adapter in `tests/orchestrator/jobQueue.test.ts` with BullMQ constructors mocked, verifying inline fallback and queue-backed submissions both call the handler.

## Dependencies & Compliance

- **New runtime dependency**: `bullmq` (job queue).
- **New runtime dependency**: `ioredis` (Redis client used by BullMQ).
- Optional dev dependency updates limited to SBOM regeneration.
- Code remains TypeScript-only, backend scope.

## Risks & Mitigations

- **Redis unavailable in local/test environments** → Provide inline fallback adapter and unit tests using `vi.mock` for BullMQ classes so Vitest runs without Redis.
- **Job result propagation** → Use `job.waitUntilFinished` with `QueueEvents` to propagate worker results back to HTTP handlers; ensure timeouts bubble up as 504-style errors if job stalls.
- **Resource cleanup** → Register process exit hooks to close BullMQ connections to avoid hanging tests when adapters switch modes mid-suite.

