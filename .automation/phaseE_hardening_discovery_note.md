# Phase E Hardening — Discovery Note (Task D60)

## Scope & Compliance Check
- **Contract**: `contracts/Roadmap_execution/15_Phase_E_Hardening.json` — task D60 requires mapping pause/resume integration points before modifying code.
- **Stack**: Backend TypeScript/Express and vanilla JS frontend; matches `ai-stack.json` requirements. No prohibited tech observed during discovery.

## Integration Points & Current Behavior

### 1. `/api/execute` orchestration entrypoint
```ts
// src/server.ts L1145-L1337
app.post("/api/execute", async (req, res) => {
  const sessionId: string | undefined = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
  try {
    if (sessionId) {
      createAbortSignal(sessionId);
    }
    setProgress(sessionId, "analyzing", 10);
    ...
    if (isComplexPrompt(effectivePrompt, clarifications)) {
      try {
        throwIfAborted(sessionId, "decomposition");
        const planJob = createPlanJobPayload({ ... , sessionId });
        const planResultJob = await executionQueue.submit(planJob);
        ...
      } catch (planError) {
        if (planError instanceof PausedError) {
          throw planError;
        }
        // falls back to single execution
      }
    }
    const singleJob = createSingleJobPayload(singleOptions);
    const resultJob = await executionQueue.submit(singleJob);
    ...
  } catch (err: unknown) {
    if (err instanceof PausedError) {
      cleanupAbortSignal(sessionId);
      return res.status(202).json({ paused: true, sessionId: err.sessionId, phase: err.phase, message: err.message });
    }
    cleanupAbortSignal(sessionId);
    return res.status(500).json({ error: message });
  } finally {
    cleanupAbortSignal(sessionId);
  }
});
```
- Planning and generation still execute as monolithic jobs that only checkpoint at pause boundaries; a fallback to single execution resets the state machine instead of breaking work into resumable steps.
- `generateJSON` is invoked later in `generateExecutorOutputFromPrompt` without an abort signal, so LLM work keeps running after `PausedError` is thrown elsewhere.

### 2. Resume endpoint and queue re-entry
```ts
// src/server.ts L1586-L1725
app.post("/api/sessions/:id/resume", async (req, res) => {
  const session = getOrchestrationSession(sessionId);
  const result = await resumeFromCheckpoint(sessionId, answers, { machine: session.machine, reason: reasonRaw || undefined });
  session.machine = result.machine;
  ...
  if (providerConfigured) {
    createAbortSignal(sessionId);
    const resumeOptions: SingleExecutionOptions = { sessionId, preserveWorkspace: true, slugOverride: projectSlug, ... };
    if (executionQueue.mode === "bullmq") {
      setProgress(sessionId, "planning", 20, queuedMeta);
    }
    executionQueue
      .submit(createSingleJobPayload(resumeOptions))
      .catch(error => {
        if (error instanceof PausedError) { return; }
        setProgress(sessionId, "finalizing", 100, { resume: true, error: message }, true);
        cleanupAbortSignal(sessionId);
      });
  }
  return res.json({ checkpoint: result.checkpoint, answeredQuestions: result.answeredQuestions, resumed: true });
});
```
- Resume loads the checkpoint and immediately submits a **single execution job**; there is no concept of replaying the specific unfinished step. In inline mode this promise runs synchronously but is intentionally not awaited, leaving no guarantee that orchestration advances after the response.
- The API never returns metadata about the next step to run, so the client cannot reflect which phase will resume.

### 3. Abort propagation gaps
```ts
// src/server.ts L432-L470
async function generateExecutorOutputFromPrompt(...) {
  throwIfAborted(sessionId, "code_generation");
  const messages = [...];
  const raw = await withTraceContext({ phase: 'single' }, async () => generateJSON(messages));
  ...
}
```
```ts
// src/llm/index.ts L53-L110
export async function generateJSON(messages: LLMMessage[], options: GenerateJSONOptions = {}): Promise<string> {
  const provider = chooseProvider();
  const runProviderCall = async (...) =>
    Promise.race([
      provider.generate(inputMessages, { tools: providerTools, signal: options.signal }),
      new Promise<ProviderGenerateResult>((_, rej) => setTimeout(...))
    ]);
  ...
}
```
```ts
// src/runner/runInSandbox.ts L43-L126
export async function runInSandbox(options: RunInSandboxOptions): Promise<RunResult> {
  const { projectRoot, projectSlug, command: providedCommand, timeoutMs = DEFAULT_TIMEOUT_MS, sessionId } = options;
  throwIfAborted(sessionId, "testing");
  ...
  const child = spawn(command, { cwd: projectRoot, ... });
  ...
  const { code, signal } = await exitPromise.finally(() => {
    clearTimeout(timeoutHandle);
    logStream.end();
  });
}
```
- Abort checks happen **before** LLM or sandbox work starts, but there is no `AbortSignal` passed into `generateJSON`, and spawned child processes have no pause-aware signal handling. Once a pause request arrives, ongoing work continues until natural completion.

### 4. Frontend pause handling & UX contract
```js
// public/script.js L220-L241, L1300-L1386
async function handlePausedResponse(sessionId) {
  const snapshotResp = await fetch(`/api/progress/snapshot/${sessionId}`);
  if (snapshotResp.ok) {
    const snapshot = await snapshotResp.json();
    updateOrchestrationState(snapshot);
    return true;
  }
  return false;
}
...
async function executeRequest({ prompt, projectName, clarifications }) {
  const sessionId = ...;
  ...
  const resp = await fetch("/api/execute", { method: "POST", body: JSON.stringify(payload) });
  if (resp.status === 202) {
    await resp.json().catch(() => ({}));
    await handlePausedResponse(sessionId);
    return;
  }
  const data = await resp.json();
  if (!resp.ok) {
    renderErrorCard({ error: data?.error || resp.statusText });
    return;
  }
  ...
}
```
- The UI now treats `202 Accepted` as a paused state and fetches a snapshot immediately, but progress polling continues indefinitely because `stopPolling` never toggles for paused states. Resume actions depend on background polling recognizing the session’s completion.
- `updateOrchestrationState` disables the pause button when paused but there is no persistent state for step IDs or manifests that a resumed job would need.

### 5. Dependency preflight strictness
```ts
// src/runner/installDeps.ts L39-L109
await validateDependencies(pkg.dependencies, pkg.devDependencies, {
  allowDeprecated: true,
  allowVersionMismatch: true
});
...
if (!offlineRegistryFailure) {
  throw err;
}
```
- Dependency validation is invoked on every resume/test run. It permits deprecated packages and version mismatches, but **still throws** when registry lookups fail for reasons other than connectivity, halting resume flows even when npm would succeed.

## Observations & Risks
1. **Monolithic jobs**: Pause interruptions force a fallback to single execution, making resumptions restart the entire generation rather than continuing at the last completed step.
2. **Abort propagation**: LLM and sandbox workers ignore pause signals mid-flight, so users observe long delays between triggering pause and seeing work stop.
3. **Resume re-entry**: Resume submits a single job without awaiting completion or tracking step metadata, so multiple resume requests can stack, and inline mode provides no guarantee the orchestration loop restarts.
4. **Frontend timing**: Polling loops stay active during pause, which can conflict with future plans to rely on SSE step events.
5. **Validation gating**: Dependency preflight can still abort runs when npm could resolve issues, contradicting the contract’s request to downgrade to warnings.

## Open Questions / Follow-ups
- What granularity should the new step queue expose to align with checkpoint payloads (e.g., per subtask, per repair attempt)?
- Should pause responses include the last persisted step identifier so the client can render more context?
- What telemetry schema additions are required for `.automation/execution_trace.jsonl` to capture pause/resume lifecycle events?

## Recommended Next Steps (per contract)
1. Design step-level queue APIs and checkpoint payload structure before touching implementation (`WA61`).
2. Define abort propagation strategy for LLM providers and sandbox processes (`WA63`, `WA64`).
3. Draft frontend state diagram for paused/resumed UI to ensure polling vs SSE is coordinated (`WA65`).
4. Update dependency validation options to emit warnings instead of throwing on mismatches (`WA66`).

