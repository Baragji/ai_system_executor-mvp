# delivery summary
Summary
Introduced dedicated runner, fixtures, replay, and plan domain routers that preserve existing validation and error responses while depending on injected helpers.
Mounted the new routers from server.ts, replacing the prior inline route definitions with dependency-injected registrations.
Expanded the Phase 21 discovery note with the extracted route contexts, proposed changes, and validation expectations.
Added focused unit tests that cover all new router behaviors, including success, validation, and error paths.
Testing
✅ npm run lint
✅ npm run typecheck
✅ RUN_REAL_LLM=0 npm test
✅ npm run contract:check
✅ npm run sbom
✅ npm run sbom:cyclonedx
✅ npm run provenance


# patch 
 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/.automation/phase21_discovery_note.md b/.automation/phase21_discovery_note.md
index 5bd690f1d96d9ac81aa745fc0ca58b60af768a76..ae9d7eefd335f5f12d4e7bc802fd64e6115b55a8 100644
--- a/.automation/phase21_discovery_note.md
+++ b/.automation/phase21_discovery_note.md
@@ -261,25 +261,212 @@ mountSessionsRoutes(app, {
   resolveSessionPrompts
 });
 ```
 
 ## Tests & Coverage
 - New unit suite: `tests/domains/sessions/routes.test.ts` exercises pause/resume happy paths, DI error handling, queue metadata branches, manifest capture, workflow failure scenarios, and validation guards.
 - The suite stubs every injected dependency, verifying call contracts and ensuring 100% coverage on `src/domains/sessions/routes.ts`.
 
 ## Compliance Check
 - Language / platform unchanged (TypeScript on Express) — OK
 - No new dependencies introduced — OK
 - API surface preserved (`/api/sessions/:id/pause`, `/api/sessions/:id/resume`) — OK
 - Feature flag usage untouched (AGENTS_RUNTIME, PROBLEM_DETAILS) — OK
 - Error shapes match legacy JSON responses — OK
 
 ## Validation Gates
 - `npm run -s lint`
 - `npm run -s typecheck`
 - `npm -s test`
 - `npm run -s contract:check`
 - `npm run -s sbom`
 - `npm run -s sbom:cyclonedx`
 - `npm run -s provenance`
 
 All gates must return green prior to PR.
+
+---
+
+# Session 3 — S3-01 (Fixtures/Replay/Plan/Runner extraction)
+
+Last updated: 2025-10-22
+
+## Integration Points (with code snippets)
+
+### 1) Manual runner endpoint `/api/run-tests`
+- File: `src/server.ts`
+- Lines: ~1748–1771
+
+```ts
+app.post("/api/run-tests", async (req, res) => {
+  try {
+    const project: string = (req.body?.project || "").toString();
+    if (!project) {
+      return res.status(400).json({ error: "project required" });
+    }
+    const slug = slugify(project, { lower: true, strict: true });
+    const projectRoot = path.join(OUTPUT_DIR, slug);
+    try {
+      await fs.access(projectRoot);
+    } catch {
+      return res.status(404).json({ error: "project not found" });
+    }
+
+    const run = await runInSandbox({ projectRoot, projectSlug: slug });
+    await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
+    return res.json(run);
+  } catch (err: unknown) {
+    console.error(err);
+    const message = err instanceof Error ? err.message : "internal error";
+    return res.status(500).json({ error: message });
+  }
+});
+```
+
+Dependencies: `slugify`, `OUTPUT_DIR`, `fs.access`, `runInSandbox`, `logEvent`.
+
+### 2) Fixtures + replay endpoints
+- File: `src/server.ts`
+- Lines: ~1773–1850
+
+```ts
+app.get("/api/fixtures/:project", async (req, res) => {
+  try {
+    const { project } = req.params as { project: string };
+    const slug = slugify(project, { lower: true, strict: true });
+    const sessions = await listFixtures(slug);
+    return res.json({ project: slug, sessions });
+  } catch (err) {
+    const message = (err as Error).message || 'internal error';
+    return res.status(500).json({ error: message });
+  }
+});
+
+app.post("/api/replay/repair", async (req, res) => {
+  try {
+    const projectRaw: string = (req.body?.project || "").toString();
+    const sessionId: string = (req.body?.sessionId || "").toString();
+    if (!projectRaw || !sessionId) {
+      return res.status(400).json({ error: "project and sessionId required" });
+    }
+    const slug = slugify(projectRaw, { lower: true, strict: true });
+    const ctx = await readFixture<MultiTurnContext>(slug, sessionId, path.join("repair", "context.json")).catch(() => null);
+    if (!ctx) {
+      return res.status(404).json({ error: "repair context fixture not found" });
+    }
+    const history = await multiTurnRepair(ctx);
+    return res.json({ project: slug, sessionId, history });
+  } catch (err) {
+    const message = (err as Error).message || 'internal error';
+    return res.status(500).json({ error: message });
+  }
+});
+
+app.post("/api/replay/subtask", async (req, res) => {
+  try {
+    const projectRaw: string = (req.body?.project || "").toString();
+    const sessionId: string = (req.body?.sessionId || "").toString();
+    const subtaskId: string = (req.body?.subtaskId || "").toString();
+    if (!projectRaw || !sessionId || !subtaskId) {
+      return res.status(400).json({ error: "project, sessionId, and subtaskId required" });
+    }
+    const slug = slugify(projectRaw, { lower: true, strict: true });
+    const projectRoot = path.join(OUTPUT_DIR, slug);
+    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }
+
+    type FixtureOutput = { files?: { path: string; contents: string }[] };
+    const output = await readFixture<FixtureOutput>(slug, sessionId, path.join("subtasks", subtaskId, "output.json")).catch(() => null);
+    if (!output || !Array.isArray(output.files)) {
+      return res.status(404).json({ error: "subtask output fixture not found or invalid" });
+    }
+    await writeFiles(projectRoot, output.files);
+    await ensureDefaultExportForApp(projectRoot);
+
+    const run = await runInSandbox({ projectRoot, projectSlug: slug });
+    await logEvent("test_run", { project: slug, stage: `replay-subtask:${subtaskId}` , status: run.status });
+    return res.json({ ok: true, project: slug, subtaskId, result: run });
+  } catch (err) {
+    const message = (err as Error).message || 'internal error';
+    return res.status(500).json({ error: message });
+  }
+});
+```
+
+Dependencies: `slugify`, `listFixtures`, `readFixture`, `multiTurnRepair`, `writeFiles`, `ensureDefaultExportForApp`, `OUTPUT_DIR`, `fs.access`, `runInSandbox`, `logEvent`.
+
+### 3) Planning helpers `/api/plan/...`
+- File: `src/server.ts`
+- Lines: ~1852–1897
+
+```ts
+app.get("/api/plan/:project/failed-subtasks", async (req, res) => {
+  try {
+    const { project } = req.params as { project: string };
+    const slug = slugify(project, { lower: true, strict: true });
+    const projectRoot = path.join(OUTPUT_DIR, slug);
+    const metaPath = path.join(projectRoot, "_executor_meta.json");
+    const buf = await fs.readFile(metaPath, "utf-8");
+    const meta = JSON.parse(buf) as { subtaskResults?: Array<{ subtaskId: string; status: string; notes?: string; testResult?: { status: string; errorMessage?: string } | null }> };
+    const failed = (meta.subtaskResults ?? []).filter(r => r.status !== "completed").map(r => ({
+      subtaskId: r.subtaskId,
+      status: r.status,
+      reason: r.testResult?.errorMessage || r.notes || "unknown"
+    }));
+    return res.json({ project: slug, failed });
+  } catch (err) {
+    const message = (err as Error).message || 'internal error';
+    return res.status(500).json({ error: message });
+  }
+});
+
+app.post("/api/plan/:project/retest-subtask", async (req, res) => {
+  try {
+    const { project } = req.params as { project: string };
+    const slug = slugify(project, { lower: true, strict: true });
+    const projectRoot = path.join(OUTPUT_DIR, slug);
+    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }
+    const run = await runInSandbox({ projectRoot, projectSlug: slug });
+    await logEvent("test_run", { project: slug, stage: "retest-subtask", status: run.status });
+    return res.json({ project: slug, result: run });
+  } catch (err) {
+    const message = (err as Error).message || 'internal error';
+    return res.status(500).json({ error: message });
+  }
+});
+```
+
+Dependencies: `slugify`, `OUTPUT_DIR`, `fs.readFile`, `fs.access`, `runInSandbox`, `logEvent`.
+
+## Proposed Changes
+
+- Create dedicated routers under `src/domains/{runner,fixtures,replay,plan}/routes.ts` mirroring the DI pattern from `sessions`/`execute`.
+- Inject existing helpers (`slugify`, `listFixtures`, `readFixture`, filesystem access via Node built-ins, runner helpers, event logger`).
+- Mount the new routers in `src/server.ts` alongside `execute`/`sessions` mounts and remove inline route blocks.
+- Ensure response payloads and error envelopes remain identical (plain `{ error: string }`).
+
+## Compliance Check
+
+- Stack: TypeScript + Express only — OK
+- No new dependencies — OK
+- APIs unchanged (`/api/run-tests`, `/api/fixtures/*`, `/api/replay/*`, `/api/plan/*`) — OK
+- Feature flags untouched — OK
+- Error handling remains plain JSON for these routes — OK
+
+## Justification
+
+- Matches ongoing modularization strategy (Phase 19) moving routes into domain modules with DI.
+- Grouping by domain (`runner`, `fixtures`, `replay`, `plan`) reduces `server.ts` footprint and enables targeted tests.
+- Filesystem + sandbox interactions remain in-process but encapsulated for future extraction.
+
+## Expected Validation Gates
+
+- `npm run lint`
+- `npm run typecheck`
+- `npm test`
+- `npm run contract:check`
+- `npm run sbom`
+- `npm run sbom:cyclonedx`
+- `npm run provenance`
+
+All must succeed with zero warnings/errors.
+
+---
diff --git a/src/domains/fixtures/routes.ts b/src/domains/fixtures/routes.ts
new file mode 100644
index 0000000000000000000000000000000000000000..f3c60c63e6a7bd53998e1399d3c453fe98d2db96
--- /dev/null
+++ b/src/domains/fixtures/routes.ts
@@ -0,0 +1,22 @@
+import type { Application, Request, Response } from "express";
+
+export type FixturesDeps = {
+  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
+  listFixtures: (slug: string) => Promise<Record<string, string[]>>;
+};
+
+export function mountFixturesRoutes(app: Application, deps: FixturesDeps): void {
+  const { slugify, listFixtures } = deps;
+
+  app.get("/api/fixtures/:project", async (req: Request, res: Response) => {
+    try {
+      const { project } = req.params as { project: string };
+      const slug = slugify(project, { lower: true, strict: true });
+      const sessions = await listFixtures(slug);
+      return res.json({ project: slug, sessions });
+    } catch (err) {
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+}
diff --git a/src/domains/plan/routes.ts b/src/domains/plan/routes.ts
new file mode 100644
index 0000000000000000000000000000000000000000..0fc1be4efe4a85b70e553b2fbb9f2f33154f9616
--- /dev/null
+++ b/src/domains/plan/routes.ts
@@ -0,0 +1,66 @@
+import type { Application, Request, Response } from "express";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
+import type { RunResult } from "../../contracts/validators.js";
+
+export type PlanDeps = {
+  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
+  outputDir: string;
+  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
+  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
+};
+
+export function mountPlanRoutes(app: Application, deps: PlanDeps): void {
+  const { slugify, outputDir, runTests, logEvent } = deps;
+
+  app.get("/api/plan/:project/failed-subtasks", async (req: Request, res: Response) => {
+    try {
+      const { project } = req.params as { project: string };
+      const slug = slugify(project, { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+      const metaPath = path.join(projectRoot, "_executor_meta.json");
+      const buf = await fs.readFile(metaPath, "utf-8");
+      const meta = JSON.parse(buf) as {
+        subtaskResults?: Array<{
+          subtaskId: string;
+          status: string;
+          notes?: string;
+          testResult?: { status: string; errorMessage?: string } | null;
+        }>;
+      };
+      const failed = (meta.subtaskResults ?? [])
+        .filter((result) => result.status !== "completed")
+        .map((result) => ({
+          subtaskId: result.subtaskId,
+          status: result.status,
+          reason: result.testResult?.errorMessage || result.notes || "unknown"
+        }));
+      return res.json({ project: slug, failed });
+    } catch (err) {
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+
+  app.post("/api/plan/:project/retest-subtask", async (req: Request, res: Response) => {
+    try {
+      const { project } = req.params as { project: string };
+      const slug = slugify(project, { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+      try {
+        await fs.access(projectRoot);
+      } catch {
+        return res.status(404).json({ error: "project not found" });
+      }
+
+      const result = await runTests({ projectRoot, projectSlug: slug });
+      await logEvent("test_run", { project: slug, stage: "retest-subtask", status: result.status });
+      return res.json({ project: slug, result });
+    } catch (err) {
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+}
diff --git a/src/domains/replay/routes.ts b/src/domains/replay/routes.ts
new file mode 100644
index 0000000000000000000000000000000000000000..3e0089d25b23950fb9ccd2308aec9eecf9c729c1
--- /dev/null
+++ b/src/domains/replay/routes.ts
@@ -0,0 +1,107 @@
+import type { Application, Request, Response } from "express";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import type { ExecutorFile } from "../../executor/types.js";
+import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
+import type { RunResult } from "../../contracts/validators.js";
+import type { MultiTurnContext } from "../../repair/multiTurnRepair.js";
+import type { RepairHistory } from "../../contracts/repairHistoryValidator.js";
+
+export type ReplayDeps = {
+  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
+  outputDir: string;
+  readFixture: <T = unknown>(slug: string, sessionId: string, relPath: string) => Promise<T>;
+  multiTurnRepair: (context: MultiTurnContext) => Promise<RepairHistory>;
+  writeFiles: (rootDir: string, files: ExecutorFile[]) => Promise<void>;
+  ensureDefaultExportForApp: (rootDir: string) => Promise<void>;
+  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
+  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
+};
+
+interface ReplayRepairRequestBody {
+  project?: unknown;
+  sessionId?: unknown;
+}
+
+interface ReplaySubtaskRequestBody extends ReplayRepairRequestBody {
+  subtaskId?: unknown;
+}
+
+export function mountReplayRoutes(app: Application, deps: ReplayDeps): void {
+  const {
+    slugify,
+    outputDir,
+    readFixture,
+    multiTurnRepair,
+    writeFiles,
+    ensureDefaultExportForApp,
+    runTests,
+    logEvent
+  } = deps;
+
+  app.post("/api/replay/repair", async (req: Request, res: Response) => {
+    try {
+      const body = (req.body as ReplayRepairRequestBody | undefined) ?? {};
+      const project = (body.project ?? "").toString();
+      const sessionId = (body.sessionId ?? "").toString();
+      if (!project || !sessionId) {
+        return res.status(400).json({ error: "project and sessionId required" });
+      }
+
+      const slug = slugify(project, { lower: true, strict: true });
+      const context = await readFixture<MultiTurnContext>(slug, sessionId, path.join("repair", "context.json")).catch(
+        () => null
+      );
+      if (!context) {
+        return res.status(404).json({ error: "repair context fixture not found" });
+      }
+
+      const history = await multiTurnRepair(context);
+      return res.json({ project: slug, sessionId, history });
+    } catch (err) {
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+
+  app.post("/api/replay/subtask", async (req: Request, res: Response) => {
+    try {
+      const body = (req.body as ReplaySubtaskRequestBody | undefined) ?? {};
+      const project = (body.project ?? "").toString();
+      const sessionId = (body.sessionId ?? "").toString();
+      const subtaskId = (body.subtaskId ?? "").toString();
+      if (!project || !sessionId || !subtaskId) {
+        return res.status(400).json({ error: "project, sessionId, and subtaskId required" });
+      }
+
+      const slug = slugify(project, { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+      try {
+        await fs.access(projectRoot);
+      } catch {
+        return res.status(404).json({ error: "project not found" });
+      }
+
+      type FixtureOutput = { files?: ExecutorFile[] };
+      const output = await readFixture<FixtureOutput>(
+        slug,
+        sessionId,
+        path.join("subtasks", subtaskId, "output.json")
+      ).catch(() => null);
+      if (!output || !Array.isArray(output.files)) {
+        return res.status(404).json({ error: "subtask output fixture not found or invalid" });
+      }
+
+      await writeFiles(projectRoot, output.files);
+      await ensureDefaultExportForApp(projectRoot);
+
+      const result = await runTests({ projectRoot, projectSlug: slug });
+      await logEvent("test_run", { project: slug, stage: `replay-subtask:${subtaskId}`, status: result.status });
+      return res.json({ ok: true, project: slug, subtaskId, result });
+    } catch (err) {
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+}
diff --git a/src/domains/runner/routes.ts b/src/domains/runner/routes.ts
new file mode 100644
index 0000000000000000000000000000000000000000..635c416b7b1023c7342f1dd1b9750c2cb80737a5
--- /dev/null
+++ b/src/domains/runner/routes.ts
@@ -0,0 +1,48 @@
+import type { Application, Request, Response } from "express";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
+import type { RunResult } from "../../contracts/validators.js";
+
+export type RunnerDeps = {
+  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
+  outputDir: string;
+  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
+  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
+};
+
+interface RunTestsRequestBody {
+  project?: unknown;
+}
+
+export function mountRunnerRoutes(app: Application, deps: RunnerDeps): void {
+  const { slugify, outputDir, runTests, logEvent } = deps;
+
+  app.post("/api/run-tests", async (req: Request, res: Response) => {
+    try {
+      const projectRaw = (req.body as RunTestsRequestBody | undefined)?.project;
+      const project = (projectRaw ?? "").toString();
+      if (!project) {
+        return res.status(400).json({ error: "project required" });
+      }
+
+      const slug = slugify(project, { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+
+      try {
+        await fs.access(projectRoot);
+      } catch {
+        return res.status(404).json({ error: "project not found" });
+      }
+
+      const run = await runTests({ projectRoot, projectSlug: slug });
+      await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
+      return res.json(run);
+    } catch (err) {
+      console.error(err);
+      const message = err instanceof Error ? err.message : "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+}
diff --git a/src/server.ts b/src/server.ts
index 693940ca0526b81a57471845cd426826e9548cbe..0fd0d371bb2065911f53288f3ca349b46d39dc80 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -27,72 +27,75 @@ import type { ExecutorOutput, ExecutorFile } from "./executor/types.js";
 import type { RunResult } from "./contracts/validators.js";
 import type { RepairHistory, TestResultSummary } from "./contracts/repairHistoryValidator.js";
 import { consumeClarificationQuestions } from "./domains/clarify/session.js";
 import type {
   ClarificationAnswer,
   ClarificationQuestion,
   ClarificationResponse
 } from "./clarification/types.js";
 import {
   decomposeTask,
   SimplePromptBypassError
 } from "./planning/decomposeTask.js";
 import { validateDecomposition } from "./planning/validateDecomposition.js";
 import { executeTaskPlan } from "./planning/executeTaskPlan.js";
 import { generateSubtaskOutputWithRetry } from "./planning/generateSubtaskOutput.js";
 import { estimateCompletion } from "./planning/estimateCompletion.js";
 import type { PlanExecutionContext } from "./planning/types.js";
 import {
   createAbortSignal,
   cleanupAbortSignal,
   throwIfAborted,
   abortSession,
   PausedError
 } from "./orchestrator/abortSignal.js";
 import { listFixtures, readFixture } from "./fixtures/index.js";
-import type { MultiTurnContext } from "./repair/multiTurnRepair.js";
 import { type PendingQuestion } from "./orchestrator/checkpoints.js";
 import { raiseInterrupt, type InterruptQuestionInput } from "./orchestrator/interrupts.js";
 import { OrchestratorStateMachine, type OrchestratorState } from "./orchestrator/stateMachine.js";
 import { resumeFromCheckpoint, type ResumeAnswer } from "./orchestrator/resume.js";
 import { captureManifest, getManifest } from "./orchestrator/workspaceManifest.js";
 import { buildResumePrompts } from "./orchestrator/resumePrompt.js";
 import { StepQueue, type StepHandler } from "./orchestrator/stepQueue.js";
 import type {
   ExecutorSuccessResponse,
   PlanExecutionJobResult,
   PlanExecutionOptions,
   SingleExecutionOptions,
   SingleExecutionResult
 } from "./orchestrator/executionTypes.js";
 import { installProblemDetails, respondWithProblem } from "./middleware/problemDetails.js";
 import { getExecution } from "./orchestrator/executionsStore.js";
 import { maybeInitTelemetry, shutdownTelemetry } from "./telemetry/otel.js";
 import { mountClarifyRoutes } from "./domains/clarify/routes.js";
 import { mountProgressRoutes } from "./domains/progress/routes.js";
 import { mountExecuteRoutes } from "./domains/execute/routes.js";
 import { mountSessionsRoutes } from "./domains/sessions/routes.js";
+import { mountRunnerRoutes } from "./domains/runner/routes.js";
+import { mountFixturesRoutes } from "./domains/fixtures/routes.js";
+import { mountReplayRoutes } from "./domains/replay/routes.js";
+import { mountPlanRoutes } from "./domains/plan/routes.js";
 import { collectPlanGeneratedFiles, captureFixture, buildRepairSummary, buildRepairMetrics } from "./domains/execute/helpers.js";
 
 const IS_TEST_ENV = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
 
 // Test-only: Mitigate ENOTEMPTY when test files recursively delete
 // `.automation/checkpoints` concurrently with other test writes.
 if (IS_TEST_ENV) {
   const originalRm = fs.rm.bind(fs);
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   (fs as unknown as { rm: typeof fs.rm }).rm = (async (target: any, options?: any) => {
     try {
       // Prefer the fastest path
       return await originalRm(target, options);
     } catch (error) {
       const code = (error as { code?: string } | null)?.code;
       const asString = typeof target === "string" ? target : "";
       if (code === "ENOTEMPTY" && asString.includes(`${path.sep}.automation${path.sep}checkpoints`)) {
         // Treat as success in tests to deflake teardown races
         return;
       }
       throw error;
     }
   }) as typeof fs.rm;
 }
 
@@ -1425,50 +1428,73 @@ export { sanitizeExecutorOutput } from "./executor/outputProcessing.js";
 mountClarifyRoutes(app);
 mountExecuteRoutes(app, { setProgress, ensureOrchestrationSession, consumeClarificationQuestions, captureFixture, stepQueue });
 mountSessionsRoutes(app, {
   getProgress,
   ensureOrchestrationSession,
   getOrchestrationSession,
   snapshotFromSession,
   stateToStage,
   setProgress,
   abortSession,
   raiseInterrupt,
   resumeFromCheckpoint,
   captureManifest,
   getManifest,
   buildResumePrompts,
   normalizeInterruptQuestions,
   normalizeResumeAnswers,
   captureFixture,
   slugify,
   stepQueue,
   createAbortSignal,
   cleanupAbortSignal,
   readSystemPrompt: () => fs.readFile("src/executor/systemPrompt.md", "utf-8"),
   resolveSessionPrompts
 });
+mountRunnerRoutes(app, {
+  slugify,
+  outputDir: OUTPUT_DIR,
+  runTests: (options) => runInSandbox(options),
+  logEvent
+});
+mountFixturesRoutes(app, { slugify, listFixtures });
+mountReplayRoutes(app, {
+  slugify,
+  outputDir: OUTPUT_DIR,
+  readFixture,
+  multiTurnRepair,
+  writeFiles,
+  ensureDefaultExportForApp,
+  runTests: (options) => runInSandbox(options),
+  logEvent
+});
+mountPlanRoutes(app, {
+  slugify,
+  outputDir: OUTPUT_DIR,
+  runTests: (options) => runInSandbox(options),
+  logEvent
+});
 
 // moved to src/domains/execute/routes.ts
 /* app.post("/api/execute", async (req, res) => {
   const instance = req.originalUrl || req.url || "/api/execute";
   const runtime = (process.env.AGENTS_RUNTIME || "").toLowerCase();
   const useLangGraph = runtime === "langgraph";
   
   // DIAGNOSTIC: Log which runtime path is chosen
   console.log(`[/api/execute] runtime=${useLangGraph ? "langgraph" : "stepqueue"}`);
   
   const providedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
   const deterministic = req.body?.deterministic === true;
   const seedRaw = typeof req.body?.seed === "string" ? req.body.seed.trim() : "";
   const seed = seedRaw || (deterministic ? "default" : "");
   const sessionId = providedSessionId || (deterministic ? deriveDeterministicSessionId(String(req.body?.prompt ?? ""), seed) : randomUUID());
   const numericSeed = deterministic
     ? hashToSeedInt(String(req.body?.prompt ?? ""), seed)
     : Math.floor((Date.now() % 100000) / 10);
   const wantsSse = !useLangGraph && typeof req.headers.accept === "string" && req.headers.accept.includes("text/event-stream");
   let sseStarted = false;
   let executionId: string | null = null;
   let delegatedToLangGraph = false;
 
   res.setHeader("x-executor-session", sessionId);
 
@@ -1723,176 +1749,50 @@ mountSessionsRoutes(app, {
         closeSse();
         return;
       }
 
       return res.status(202).json(payload);
     }
 
     console.error(err);
     const message = err instanceof Error ? err.message : "internal error";
 
     if (wantsSse) {
       sendSse("error", { sessionId, message });
       closeSse();
       return;
     }
 
     respondWithProblem(res, 500, "InternalServerError", message, instance);
     return;
   } finally {
     if (sessionId && !delegatedToLangGraph) {
       cleanupAbortSignal(sessionId);
     }
   }
 }); */
 
-app.post("/api/run-tests", async (req, res) => {
-  try {
-    const project: string = (req.body?.project || "").toString();
-    if (!project) {
-      return res.status(400).json({ error: "project required" });
-    }
-    const slug = slugify(project, { lower: true, strict: true });
-    const projectRoot = path.join(OUTPUT_DIR, slug);
-    try {
-      await fs.access(projectRoot);
-    } catch {
-      return res.status(404).json({ error: "project not found" });
-    }
-
-    const run = await runInSandbox({ projectRoot, projectSlug: slug });
-    await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
-    return res.json(run);
-  } catch (err: unknown) {
-    console.error(err);
-    const message = err instanceof Error ? err.message : "internal error";
-    return res.status(500).json({ error: message });
-  }
-});
-
-// List available fixtures for a project
-app.get("/api/fixtures/:project", async (req, res) => {
-  try {
-    const { project } = req.params as { project: string };
-    const slug = slugify(project, { lower: true, strict: true });
-    const sessions = await listFixtures(slug);
-    return res.json({ project: slug, sessions });
-  } catch (err) {
-    const message = (err as Error).message || 'internal error';
-    return res.status(500).json({ error: message });
-  }
-});
-
-// Replay repair from captured context without regeneration
-app.post("/api/replay/repair", async (req, res) => {
-  try {
-    const projectRaw: string = (req.body?.project || "").toString();
-    const sessionId: string = (req.body?.sessionId || "").toString();
-    if (!projectRaw || !sessionId) {
-      return res.status(400).json({ error: "project and sessionId required" });
-    }
-    const slug = slugify(projectRaw, { lower: true, strict: true });
-    const ctx = await readFixture<MultiTurnContext>(slug, sessionId, path.join("repair", "context.json")).catch(() => null);
-    if (!ctx) {
-      return res.status(404).json({ error: "repair context fixture not found" });
-    }
-    // Re-run repair with current logic
-    const history = await multiTurnRepair(ctx);
-    return res.json({ project: slug, sessionId, history });
-  } catch (err) {
-    const message = (err as Error).message || 'internal error';
-    return res.status(500).json({ error: message });
-  }
-});
-
-// Replay a single subtask by applying saved files and running tests
-app.post("/api/replay/subtask", async (req, res) => {
-  try {
-    const projectRaw: string = (req.body?.project || "").toString();
-    const sessionId: string = (req.body?.sessionId || "").toString();
-    const subtaskId: string = (req.body?.subtaskId || "").toString();
-    if (!projectRaw || !sessionId || !subtaskId) {
-      return res.status(400).json({ error: "project, sessionId, and subtaskId required" });
-    }
-    const slug = slugify(projectRaw, { lower: true, strict: true });
-    const projectRoot = path.join(OUTPUT_DIR, slug);
-    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }
-
-    type FixtureOutput = { files?: { path: string; contents: string }[] };
-    const output = await readFixture<FixtureOutput>(slug, sessionId, path.join("subtasks", subtaskId, "output.json")).catch(() => null);
-    if (!output || !Array.isArray(output.files)) {
-      return res.status(404).json({ error: "subtask output fixture not found or invalid" });
-    }
-    await writeFiles(projectRoot, output.files);
-    await ensureDefaultExportForApp(projectRoot);
-
-    const run = await runInSandbox({ projectRoot, projectSlug: slug });
-    await logEvent("test_run", { project: slug, stage: `replay-subtask:${subtaskId}` , status: run.status });
-    return res.json({ ok: true, project: slug, subtaskId, result: run });
-  } catch (err) {
-    const message = (err as Error).message || 'internal error';
-    return res.status(500).json({ error: message });
-  }
-});
-
-// List failed subtasks for a generated project (no regeneration)
-app.get("/api/plan/:project/failed-subtasks", async (req, res) => {
-  try {
-    const { project } = req.params as { project: string };
-    const slug = slugify(project, { lower: true, strict: true });
-    const projectRoot = path.join(OUTPUT_DIR, slug);
-    const metaPath = path.join(projectRoot, "_executor_meta.json");
-    const buf = await fs.readFile(metaPath, "utf-8");
-    const meta = JSON.parse(buf) as { subtaskResults?: Array<{ subtaskId: string; status: string; notes?: string; testResult?: { status: string; errorMessage?: string } | null }> };
-    const failed = (meta.subtaskResults ?? []).filter(r => r.status !== "completed").map(r => ({
-      subtaskId: r.subtaskId,
-      status: r.status,
-      reason: r.testResult?.errorMessage || r.notes || "unknown"
-    }));
-    return res.json({ project: slug, failed });
-  } catch (err) {
-    const message = (err as Error).message || 'internal error';
-    return res.status(500).json({ error: message });
-  }
-});
-
-// Retest a specific subtask by re-running the project's tests (no regeneration)
-app.post("/api/plan/:project/retest-subtask", async (req, res) => {
-  try {
-    const { project } = req.params as { project: string };
-    const slug = slugify(project, { lower: true, strict: true });
-    const projectRoot = path.join(OUTPUT_DIR, slug);
-    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }
-    const run = await runInSandbox({ projectRoot, projectSlug: slug });
-    await logEvent("test_run", { project: slug, stage: "retest-subtask", status: run.status });
-    return res.json({ project: slug, result: run });
-  } catch (err) {
-    const message = (err as Error).message || 'internal error';
-    return res.status(500).json({ error: message });
-  }
-});
-
 mountProgressRoutes(app, { openProgressStream, getProgress });
 
 // File content endpoint with path sanitization
 app.get("/api/files/:project/:path(*)", async (req, res) => {
   try {
     const { project } = req.params as { project: string };
     const rawPath = (req.params as { path: string }).path || "";
     const slug = slugify(project, { lower: true, strict: true });
     const projectRoot = path.join(OUTPUT_DIR, slug);
     const decodedRel = decodeURIComponent(rawPath);
     const absolute = path.resolve(projectRoot, decodedRel);
     if (!absolute.startsWith(projectRoot)) {
       return res.status(403).json({ error: "forbidden" });
     }
     try {
       const stat = await fs.stat(absolute);
       if (!stat.isFile()) {
         return res.status(404).json({ error: "not found" });
       }
       const buf = await fs.readFile(absolute);
       const binary = buf.includes(0);
       const content = binary ? null : buf.toString("utf-8");
       return res.json({ content, size: stat.size, modified: stat.mtime, binary });
     } catch {
       return res.status(404).json({ error: "not found" });
diff --git a/tests/domains/fixtures.routes.test.ts b/tests/domains/fixtures.routes.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..7edd8fadc31ff8126a99aa645ef7ddb4bab45cc5
--- /dev/null
+++ b/tests/domains/fixtures.routes.test.ts
@@ -0,0 +1,37 @@
+import express from "express";
+import type { Application } from "express";
+import request from "supertest";
+
+import { beforeEach, describe, expect, it, vi } from "vitest";
+
+import { mountFixturesRoutes, type FixturesDeps } from "../../src/domains/fixtures/routes.js";
+
+describe("fixtures routes", () => {
+  let app: Application;
+  let deps: FixturesDeps;
+
+  beforeEach(() => {
+    app = express();
+    app.use(express.json());
+    deps = {
+      slugify: vi.fn<FixturesDeps["slugify"]>().mockImplementation(value => value.toLowerCase()),
+      listFixtures: vi.fn<FixturesDeps["listFixtures"]>().mockResolvedValue({ session: ["a"] })
+    } satisfies FixturesDeps;
+    mountFixturesRoutes(app, deps);
+  });
+
+  it("returns sessions for a slugified project", async () => {
+    const response = await request(app).get("/api/fixtures/My Project");
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ project: "my project", sessions: { session: ["a"] } });
+    expect(deps.slugify).toHaveBeenCalledWith("My Project", { lower: true, strict: true });
+    expect(deps.listFixtures).toHaveBeenCalledWith("my project");
+  });
+
+  it("propagates errors as 500 responses", async () => {
+    (deps.listFixtures as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("nope"));
+    const response = await request(app).get("/api/fixtures/test");
+    expect(response.status).toBe(500);
+    expect(response.body).toEqual({ error: "nope" });
+  });
+});
diff --git a/tests/domains/plan.routes.test.ts b/tests/domains/plan.routes.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..1038b2fc360abb281108614a04c9dbf36a96f17c
--- /dev/null
+++ b/tests/domains/plan.routes.test.ts
@@ -0,0 +1,116 @@
+import express from "express";
+import type { Application } from "express";
+import request from "supertest";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+
+import { mountPlanRoutes, type PlanDeps } from "../../src/domains/plan/routes.js";
+
+const OUTPUT_DIR = path.resolve("output");
+const PROJECT_NAME = "Planner Demo";
+const PROJECT_SLUG = "planner-demo";
+const PROJECT_ROOT = path.join(OUTPUT_DIR, PROJECT_SLUG);
+const META_PATH = path.join(PROJECT_ROOT, "_executor_meta.json");
+
+async function removeProject(): Promise<void> {
+  await fs.rm(PROJECT_ROOT, { recursive: true, force: true });
+}
+
+describe("plan routes", () => {
+  let app: Application;
+  let deps: PlanDeps;
+
+  beforeEach(async () => {
+    app = express();
+    app.use(express.json());
+    await fs.mkdir(OUTPUT_DIR, { recursive: true });
+    await removeProject();
+
+    deps = {
+      slugify: vi.fn<PlanDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
+      outputDir: OUTPUT_DIR,
+      runTests: vi.fn<PlanDeps["runTests"]>().mockResolvedValue({ status: "pass" } as never),
+      logEvent: vi.fn<PlanDeps["logEvent"]>().mockResolvedValue()
+    } satisfies PlanDeps;
+
+    mountPlanRoutes(app, deps);
+  });
+
+  afterEach(async () => {
+    await removeProject();
+    vi.restoreAllMocks();
+  });
+
+  describe("GET /api/plan/:project/failed-subtasks", () => {
+    it("returns filtered subtask failures", async () => {
+      await fs.mkdir(PROJECT_ROOT, { recursive: true });
+      const meta = {
+        subtaskResults: [
+          { subtaskId: "1", status: "completed" },
+          { subtaskId: "2", status: "failed", notes: "needs work" },
+          { subtaskId: "3", status: "errored", testResult: { status: "fail", errorMessage: "boom" } },
+          { subtaskId: "4", status: "skipped" }
+        ]
+      };
+      await fs.writeFile(META_PATH, JSON.stringify(meta), "utf-8");
+
+      const response = await request(app).get(`/api/plan/${PROJECT_NAME}/failed-subtasks`);
+
+      expect(response.status).toBe(200);
+      expect(response.body).toEqual({
+        project: PROJECT_SLUG,
+        failed: [
+          { subtaskId: "2", status: "failed", reason: "needs work" },
+          { subtaskId: "3", status: "errored", reason: "boom" },
+          { subtaskId: "4", status: "skipped", reason: "unknown" }
+        ]
+      });
+      expect(deps.slugify).toHaveBeenCalledWith(PROJECT_NAME, { lower: true, strict: true });
+    });
+
+    it("returns 500 when meta file is missing", async () => {
+      const response = await request(app).get(`/api/plan/${PROJECT_NAME}/failed-subtasks`);
+      expect(response.status).toBe(500);
+      expect(response.body).toEqual({ error: expect.stringContaining("ENOENT") });
+    });
+  });
+
+  describe("POST /api/plan/:project/retest-subtask", () => {
+    it("returns 404 when project is missing", async () => {
+      const response = await request(app).post(`/api/plan/${PROJECT_NAME}/retest-subtask`).send({});
+      expect(response.status).toBe(404);
+      expect(response.body).toEqual({ error: "project not found" });
+      expect(deps.runTests).not.toHaveBeenCalled();
+    });
+
+    it("runs tests and logs event when project exists", async () => {
+      await fs.mkdir(PROJECT_ROOT, { recursive: true });
+      const result = { status: "fail" } as never;
+      (deps.runTests as ReturnType<typeof vi.fn>).mockResolvedValueOnce(result);
+
+      const response = await request(app).post(`/api/plan/${PROJECT_NAME}/retest-subtask`).send({});
+
+      expect(response.status).toBe(200);
+      expect(response.body).toEqual({ project: PROJECT_SLUG, result });
+      expect(deps.runTests).toHaveBeenCalledWith({ projectRoot: PROJECT_ROOT, projectSlug: PROJECT_SLUG });
+      expect(deps.logEvent).toHaveBeenCalledWith("test_run", {
+        project: PROJECT_SLUG,
+        stage: "retest-subtask",
+        status: result.status
+      });
+    });
+
+    it("returns 500 when sandbox fails", async () => {
+      await fs.mkdir(PROJECT_ROOT, { recursive: true });
+      const error = new Error("sandbox exploded");
+      (deps.runTests as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);
+
+      const response = await request(app).post(`/api/plan/${PROJECT_NAME}/retest-subtask`).send({});
+
+      expect(response.status).toBe(500);
+      expect(response.body).toEqual({ error: "sandbox exploded" });
+    });
+  });
+});
diff --git a/tests/domains/replay.routes.test.ts b/tests/domains/replay.routes.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..bdac1901a5701c35dda6fffd3e5744819ce59350
--- /dev/null
+++ b/tests/domains/replay.routes.test.ts
@@ -0,0 +1,170 @@
+import express from "express";
+import type { Application } from "express";
+import request from "supertest";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+
+import { mountReplayRoutes, type ReplayDeps } from "../../src/domains/replay/routes.js";
+
+const OUTPUT_DIR = path.resolve("output");
+const PROJECT_NAME = "Replay Demo";
+const PROJECT_SLUG = "replay-demo";
+const SESSION_ID = "session-1";
+const SUBTASK_ID = "subtask-7";
+
+async function removeProject(): Promise<void> {
+  await fs.rm(path.join(OUTPUT_DIR, PROJECT_SLUG), { recursive: true, force: true });
+}
+
+describe("replay routes", () => {
+  let app: Application;
+  let deps: ReplayDeps;
+
+  beforeEach(async () => {
+    app = express();
+    app.use(express.json());
+    await fs.mkdir(OUTPUT_DIR, { recursive: true });
+    await removeProject();
+
+    deps = {
+      slugify: vi.fn<ReplayDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
+      outputDir: OUTPUT_DIR,
+      readFixture: vi.fn<ReplayDeps["readFixture"]>().mockResolvedValue({} as never),
+      multiTurnRepair: vi.fn<ReplayDeps["multiTurnRepair"]>().mockResolvedValue({ steps: [] } as never),
+      writeFiles: vi.fn<ReplayDeps["writeFiles"]>().mockResolvedValue(),
+      ensureDefaultExportForApp: vi.fn<ReplayDeps["ensureDefaultExportForApp"]>().mockResolvedValue(),
+      runTests: vi.fn<ReplayDeps["runTests"]>().mockResolvedValue({ status: "pass" } as never),
+      logEvent: vi.fn<ReplayDeps["logEvent"]>().mockResolvedValue()
+    } satisfies ReplayDeps;
+
+    mountReplayRoutes(app, deps);
+  });
+
+  afterEach(async () => {
+    await removeProject();
+    vi.restoreAllMocks();
+  });
+
+  describe("POST /api/replay/repair", () => {
+    it("returns 400 when required fields are missing", async () => {
+      const response = await request(app).post("/api/replay/repair").send({});
+      expect(response.status).toBe(400);
+      expect(response.body).toEqual({ error: "project and sessionId required" });
+    });
+
+    it("returns 404 when fixture is missing", async () => {
+      (deps.readFixture as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("missing"));
+      const response = await request(app)
+        .post("/api/replay/repair")
+        .send({ project: PROJECT_NAME, sessionId: SESSION_ID });
+      expect(response.status).toBe(404);
+      expect(response.body).toEqual({ error: "repair context fixture not found" });
+    });
+
+    it("returns history when repair succeeds", async () => {
+      const context = { prompt: "hello" } as never;
+      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce(context);
+      const history = { steps: [{ id: 1 }] } as never;
+      (deps.multiTurnRepair as ReturnType<typeof vi.fn>).mockResolvedValueOnce(history);
+
+      const response = await request(app)
+        .post("/api/replay/repair")
+        .send({ project: PROJECT_NAME, sessionId: SESSION_ID });
+
+      expect(response.status).toBe(200);
+      expect(response.body).toEqual({ project: PROJECT_SLUG, sessionId: SESSION_ID, history });
+      expect(deps.readFixture).toHaveBeenCalledWith(
+        PROJECT_SLUG,
+        SESSION_ID,
+        path.join("repair", "context.json")
+      );
+      expect(deps.multiTurnRepair).toHaveBeenCalledWith(context);
+    });
+
+    it("returns 500 when repair throws", async () => {
+      const context = { prompt: "boom" } as never;
+      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce(context);
+      const error = new Error("repair failed");
+      (deps.multiTurnRepair as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);
+
+      const response = await request(app)
+        .post("/api/replay/repair")
+        .send({ project: PROJECT_NAME, sessionId: SESSION_ID });
+
+      expect(response.status).toBe(500);
+      expect(response.body).toEqual({ error: "repair failed" });
+    });
+  });
+
+  describe("POST /api/replay/subtask", () => {
+    it("returns 400 when fields are missing", async () => {
+      const response = await request(app).post("/api/replay/subtask").send({ project: PROJECT_NAME });
+      expect(response.status).toBe(400);
+      expect(response.body).toEqual({ error: "project, sessionId, and subtaskId required" });
+    });
+
+    it("returns 404 when project folder is missing", async () => {
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });
+      expect(response.status).toBe(404);
+      expect(response.body).toEqual({ error: "project not found" });
+    });
+
+    it("returns 404 when fixture output is invalid", async () => {
+      const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
+      await fs.mkdir(projectRoot, { recursive: true });
+      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
+
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });
+
+      expect(response.status).toBe(404);
+      expect(response.body).toEqual({ error: "subtask output fixture not found or invalid" });
+    });
+
+    it("replays subtask, writes files, and logs event", async () => {
+      const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
+      await fs.mkdir(projectRoot, { recursive: true });
+      const files = [{ path: "index.ts", contents: "export const x = 1;" }] as never;
+      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ files });
+      const runResult = { status: "fail", details: { reason: "tests" } } as never;
+      (deps.runTests as ReturnType<typeof vi.fn>).mockResolvedValueOnce(runResult);
+
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });
+
+      expect(response.status).toBe(200);
+      expect(response.body).toEqual({ ok: true, project: PROJECT_SLUG, subtaskId: SUBTASK_ID, result: runResult });
+      expect(deps.writeFiles).toHaveBeenCalledWith(projectRoot, files);
+      expect(deps.ensureDefaultExportForApp).toHaveBeenCalledWith(projectRoot);
+      expect(deps.runTests).toHaveBeenCalledWith({ projectRoot, projectSlug: PROJECT_SLUG });
+      expect(deps.logEvent).toHaveBeenCalledWith("test_run", {
+        project: PROJECT_SLUG,
+        stage: `replay-subtask:${SUBTASK_ID}`,
+        status: runResult.status
+      });
+    });
+
+    it("returns 500 when sandbox fails", async () => {
+      const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
+      await fs.mkdir(projectRoot, { recursive: true });
+      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
+        files: [{ path: "index.ts", contents: "" }]
+      });
+      const error = new Error("sandbox failed");
+      (deps.runTests as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);
+
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });
+
+      expect(response.status).toBe(500);
+      expect(response.body).toEqual({ error: "sandbox failed" });
+    });
+  });
+});
diff --git a/tests/domains/runner.routes.test.ts b/tests/domains/runner.routes.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d6b3b52723759bdda8a799d0cc3ae89b2d1bebf3
--- /dev/null
+++ b/tests/domains/runner.routes.test.ts
@@ -0,0 +1,95 @@
+import express from "express";
+import type { Application } from "express";
+import request from "supertest";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
+
+import { mountRunnerRoutes, type RunnerDeps } from "../../src/domains/runner/routes.js";
+
+const OUTPUT_DIR = path.resolve("output");
+const PROJECT_NAME = "Example Project";
+const PROJECT_SLUG = "example-project";
+
+async function removeProject(slug: string): Promise<void> {
+  await fs.rm(path.join(OUTPUT_DIR, slug), { recursive: true, force: true });
+}
+
+describe("runner routes", () => {
+  let app: Application;
+  let deps: RunnerDeps;
+  let logError: ReturnType<typeof vi.spyOn>;
+
+  beforeEach(async () => {
+    app = express();
+    app.use(express.json());
+    await fs.mkdir(OUTPUT_DIR, { recursive: true });
+    await removeProject(PROJECT_SLUG);
+
+    logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
+
+    const runTests = vi.fn<RunnerDeps["runTests"]>().mockResolvedValue({ status: "pass" } as never);
+    const logEvent = vi.fn<RunnerDeps["logEvent"]>().mockResolvedValue();
+
+    deps = {
+      slugify: vi.fn<RunnerDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
+      outputDir: OUTPUT_DIR,
+      runTests,
+      logEvent
+    } satisfies RunnerDeps;
+
+    mountRunnerRoutes(app, deps);
+  });
+
+  afterEach(async () => {
+    await removeProject(PROJECT_SLUG);
+    vi.restoreAllMocks();
+  });
+
+  it("returns 400 when project is missing", async () => {
+    const response = await request(app).post("/api/run-tests").send({});
+    expect(response.status).toBe(400);
+    expect(response.body).toEqual({ error: "project required" });
+    expect(deps.runTests).not.toHaveBeenCalled();
+  });
+
+  it("returns 404 when project folder does not exist", async () => {
+    const response = await request(app).post("/api/run-tests").send({ project: PROJECT_NAME });
+    expect(response.status).toBe(404);
+    expect(response.body).toEqual({ error: "project not found" });
+    expect(deps.runTests).not.toHaveBeenCalled();
+  });
+
+  it("runs tests for existing project and logs event", async () => {
+    const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
+    await fs.mkdir(projectRoot, { recursive: true });
+
+    const result = { status: "pass", details: { ok: true } } as never;
+    (deps.runTests as ReturnType<typeof vi.fn>).mockResolvedValueOnce(result);
+
+    const response = await request(app).post("/api/run-tests").send({ project: PROJECT_NAME });
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual(result);
+    expect(deps.runTests).toHaveBeenCalledWith({ projectRoot, projectSlug: PROJECT_SLUG });
+    expect(deps.logEvent).toHaveBeenCalledWith("test_run", {
+      project: PROJECT_SLUG,
+      stage: "manual",
+      status: result.status
+    });
+  });
+
+  it("returns 500 when runner throws", async () => {
+    const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
+    await fs.mkdir(projectRoot, { recursive: true });
+    const error = new Error("boom");
+    (deps.runTests as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);
+
+    const response = await request(app).post("/api/run-tests").send({ project: PROJECT_NAME });
+
+    expect(response.status).toBe(500);
+    expect(response.body).toEqual({ error: "boom" });
+    expect(logError).toHaveBeenCalledWith(error);
+  });
+});
 
EOF
)