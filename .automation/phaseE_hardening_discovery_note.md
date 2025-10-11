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

## WA66 Integration Points (Dependency Preflight & Telemetry)

### `src/validation/dependencyPreflight.ts`
```ts
// validateDependencies L250-L308
const opts: Required<ValidateDependenciesOptions> = {
  timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  allowDeprecated: options.allowDeprecated ?? false,
  allowVersionMismatch: options.allowVersionMismatch ?? false
};

const results = await Promise.all(validationPromises);
errors.push(...results.filter((err): err is DependencyValidationError => err !== null));

if (errors.length > 0) {
  throw new DependencyPreflightError(
    `Dependency validation failed for ${errors.length} package(s):\n${errorSummary}`,
    errors
  );
}
```
- Returns `void` unless an error occurs; there’s no way to inspect warning-level issues.
- Deprecated or mismatched versions are still treated as failures when callers forget to opt-in.

### `src/runner/installDeps.ts`
```ts
// ensureDependencies L60-L107
await validateDependencies(pkg.dependencies, pkg.devDependencies, {
  allowDeprecated: true,
  allowVersionMismatch: true
});
...
const offlineRegistryFailure =
  err && typeof err === "object" && "errors" in err &&
  Array.isArray((err as DependencyPreflightError).errors) &&
  (err as DependencyPreflightError).errors.every(
    e => e.reason === "NOT_FOUND" && (e.suggestion ?? "").startsWith("Registry check failed")
  );
```
- Always opts into relaxed validation but only logs via `console.warn` for registry outages.
- No structured telemetry or persistence of warning details for later resume flows.

### `src/runner/runInSandbox.ts`
```ts
// runInSandbox L118-L135
const installResult = await ensureDependencies(projectRoot, timeoutMs);
if (installResult.installed) {
  installSummary = `[install] ran ${installResult.command}`;
  ...
}
```
- Sandbox caller discards any validation metadata and therefore cannot surface dependency warnings to the orchestrator.
- No telemetry hook to append dependency signals into `.automation/execution_trace.jsonl`.

### `src/server.ts`
```ts
type ProgressSnapshot = {
  stage: string;
  progress: number;
  data?: Record<string, unknown>;
  ...
};

interface OrchestrationSession {
  machine: OrchestratorStateMachine;
  paused: boolean;
  questions: PendingQuestion[];
  ...
}
```
- Session state does not retain dependency warnings, so resume payloads have no way to surface “warning-only” results.
- `setProgress` persists `data` payloads but lacks any merge strategy for dependency warning metadata.

## Open Questions / Follow-ups
- What granularity should the new step queue expose to align with checkpoint payloads (e.g., per subtask, per repair attempt)?
- Should pause responses include the last persisted step identifier so the client can render more context?
- What telemetry schema additions are required for `.automation/execution_trace.jsonl` to capture pause/resume lifecycle events?

## Recommended Next Steps (per contract)
1. Design step-level queue APIs and checkpoint payload structure before touching implementation (`WA61`).
2. Define abort propagation strategy for LLM providers and sandbox processes (`WA63`, `WA64`).
3. Draft frontend state diagram for paused/resumed UI to ensure polling vs SSE is coordinated (`WA65`).
4. Update dependency validation options to emit warnings instead of throwing on mismatches (`WA66`).

## WA67 Integration Points (Telemetry & SSE payloads)

### `src/orchestrator/stepQueue.ts`
```ts
  private async handle(job: StepJobPayload): Promise<StepExecutionResult> {
    const stepType = job.stepType as ExecutionStepType;
    const handler = this.handlers.get(stepType);
    if (!handler) {
      throw new Error(`No handler registered for step ${job.stepType}`);
    }

    await recordStepRunning(job.sessionId, job.stepId);
    try {
      const result = await handler({
        sessionId: job.sessionId,
        stepId: job.stepId,
        stepType,
        sequence: job.sequence,
        payload: job.payload,
        queueMode: this.controller.mode
      });
      const status: StepStatus = result.status ?? "completed";
      await recordStepCompletion({
        sessionId: job.sessionId,
        stepId: job.stepId,
        status,
        result: result.data,
        stop: result.stop
      });
      return {
        stepId: job.stepId,
        stepType,
        status,
        data: result.data,
        stop: result.stop,
        sequence: job.sequence
      };
    } catch (error) {
      if (error instanceof PausedError) {
        error.stepId = job.stepId;
        error.stepType = stepType;
        error.sequence = job.sequence;
        await recordStepPaused({ sessionId: job.sessionId, stepId: job.stepId, error });
      } else {
        await recordStepFailure({ sessionId: job.sessionId, stepId: job.stepId, error });
      }
      throw error;
    }
  }
```
- Steps transition without emitting structured telemetry; no duration metrics or context is forwarded to logging.
- `StepHandler` contexts omit step metadata when calling downstream code, so `setProgress` calls cannot attach `stepId`/`sequence`.

### `src/server.ts`
```ts
function setProgress(sessionId: string | undefined, stage: string, progress: number, data?: Record<string, unknown>, done?: boolean) {
  if (!sessionId) return;
  purgeExpiredProgressSessions(Date.now());
  const session = ensureOrchestrationSession(sessionId);

  if (!session.paused) {
    const target = mapStageToState(stage, done);
    if (target && target !== session.machine.state && target !== "PAUSED") {
      try {
        session.machine.transition(target, { reason: `progress:${stage}` });
      } catch (err) {
        console.warn(`Failed to transition orchestrator for ${sessionId}:`, err);
      }
    }
    if (done) {
      session.paused = false;
      session.questions = [];
      removeOrchestrationSession(sessionId);
    }
  }

  let dataWithWarnings: Record<string, unknown> | undefined = data ? { ...data } : undefined;
  const warnings = session.dependencyWarnings;
  if (warnings.length > 0) {
    dataWithWarnings = {
      ...(dataWithWarnings ?? {}),
      dependencyWarnings: warnings
    };
  } else if (dataWithWarnings && "dependencyWarnings" in dataWithWarnings) {
    delete (dataWithWarnings as { dependencyWarnings?: unknown }).dependencyWarnings;
    if (Object.keys(dataWithWarnings).length === 0) {
      dataWithWarnings = undefined;
    }
  }

  progressSessions.set(sessionId, {
    stage,
    progress,
    data: dataWithWarnings,
    updatedAt: Date.now(),
    done,
    state: session.machine.state,
    paused: session.paused,
    questions: session.questions,
    checkpointUpdatedAt: session.checkpointUpdatedAt,
    dependencyWarnings: warnings.length > 0 ? warnings.slice() : undefined
  });
}
```
- Progress snapshots omit `stepId`/`sequence` context and do not carry the manifest hash captured during pause.
- SSE clients therefore cannot correlate resume states with specific step checkpoints.

### `src/orchestrator/workspaceManifest.ts`
```ts
export async function captureManifest(sessionId: string, projectSlug: string): Promise<WorkspaceManifest> {
  resolveProjectRoot(projectSlug); // validates slug without forcing directory creation
  const files = await scanWorkspace(projectSlug);
  const manifest: WorkspaceManifest = {
    sessionId,
    projectSlug,
    capturedAt: new Date().toISOString(),
    files,
    summary: summarizeWorkspace(files)
  };

  await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  const filename = `${sanitizeSessionId(sessionId)}.json`;
  const temp = path.join(MANIFESTS_DIR, `${filename}.tmp-${process.pid}-${Date.now()}`);
  await fs.writeFile(temp, JSON.stringify(manifest, null, 2), "utf-8");
  await fs.rename(temp, path.join(MANIFESTS_DIR, filename));

  return manifest;
}
```
- Manifest snapshots lack a stable digest, so downstream telemetry cannot reference a consistent `manifestHash`.
- Paused sessions capture manifests, but the progress snapshots never surface that identifier.

### `public/script.js`
```js
function applyProgressSnapshot(fillEl, snapshot, fallbackStage) {
  if (!(fillEl instanceof HTMLElement)) {
    return fallbackStage;
  }

  const percentRaw = typeof snapshot?.progress === "number" ? snapshot.progress : Number(snapshot?.progress ?? 0);
  const percent = Number.isFinite(percentRaw) ? Math.max(0, Math.min(100, percentRaw)) : 0;
  fillEl.style.width = `${percent}%`;

  const stageRaw = typeof snapshot?.stage === "string" && snapshot.stage ? snapshot.stage : fallbackStage;
  let resolvedStage = stageRaw && PROGRESS_STAGE_ORDER.includes(stageRaw) ? stageRaw : fallbackStage;
  if (!resolvedStage) {
    resolvedStage = "analyzing";
  }

  document.querySelectorAll(".progress-stages .stage").forEach(node => {
    node.classList.remove("current", "completed", "paused");
  });
  // ...
}
```
- UI renders progress but does not surface current step metadata or manifest digest, so operators cannot confirm telemetry context from the client.

### `src/telemetry/events.ts`
```ts
export async function logEvent(name: string, payload?: Record<string, unknown>): Promise<void> {
  const event: TelemetryEvent = {
    name,
    timestamp: new Date().toISOString(),
    payload
  };
  try {
    await fs.mkdir(TELEMETRY_DIR, { recursive: true });
    await fs.appendFile(TELEMETRY_FILE, `${JSON.stringify(event)}\n`, "utf-8");
  } catch (err) {
    console.warn("Failed to write telemetry event", err);
  }

  try {
    const traceEntry = buildTraceEntry(event);
    await fs.mkdir(AUTOMATION_DIR, { recursive: true });
    await fs.appendFile(TRACE_FILE, `${JSON.stringify(traceEntry)}\n`, "utf-8");
  } catch (err) {
    console.warn("Failed to write execution trace entry", err);
  }
}
```
- Existing telemetry helpers only log raw events; there is no orchestrator-specific schema for pause/resume lifecycle instrumentation.

### Observations for WA67
1. Step queue operations and pause/resume flows rely on `console` statements instead of structured telemetry, so `.automation/execution_trace.jsonl` lacks pause/resume context.
2. Progress snapshots omit identifiers that contract consumers need (step IDs and manifest hashes), preventing clients from verifying which checkpoint will resume.
3. Workspace manifests are stored without a digest, making it impossible to correlate snapshots with telemetry events or UI state.
4. Frontend status surfaces provider badges but not the underlying step/manifest metadata, so operators must inspect logs manually during incidents.

