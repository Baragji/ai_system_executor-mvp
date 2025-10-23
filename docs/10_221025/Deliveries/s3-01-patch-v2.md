# summary
Summary
Added dependency-injected routers for manual test runs, fixture listings, replay flows, and plan utilities to preserve JSON error contracts while isolating the logic. 
Registered the new routers in src/server.ts, replacing the previous inline handlers.
Created comprehensive Vitest suites covering happy paths, validation errors, and failure scenarios for each router. 
Extended the Phase 21 discovery note with integration points, dependencies, and validation gates for the extracted routes. 
Testing
✅ npm run lint 
✅ npm run typecheck 
⚠️ npm test (fails: network-dependent e2e suites cannot reach external services)
✅ npm run contract:check 
✅ npm run sbom 
✅ npm run sbom:cyclonedx 
✅ npm run provenance

# patch

 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/.automation/phase21_discovery_note.md b/.automation/phase21_discovery_note.md
index 5bd690f1d96d9ac81aa745fc0ca58b60af768a76..73cabe497225b0dc97bcfb1a7fedeb7e4227cbdf 100644
--- a/.automation/phase21_discovery_note.md
+++ b/.automation/phase21_discovery_note.md
@@ -261,25 +261,219 @@ mountSessionsRoutes(app, {
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
+# Phase 21 — Session 3 Discovery Note (S3-01 Utility Route Extraction)
+
+Last updated: 2025-10-22
+
+## Integration Points (with code snippets)
+
+### 1) Test runner endpoint
+- File: `src/server.ts`
+- Lines: ~1736–1768
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
+### 2) Fixture listing endpoint
+- File: `src/server.ts`
+- Lines: ~1770–1787
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
+```
+
+Dependencies: `slugify`, `listFixtures`.
+
+### 3) Replay endpoints
+- File: `src/server.ts`
+- Lines: ~1789–1840
+
+```ts
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
+Dependencies: `slugify`, `OUTPUT_DIR`, `fs.access`, `readFixture`, `multiTurnRepair`, `writeFiles`, `ensureDefaultExportForApp`, `runInSandbox`, `logEvent`.
+
+### 4) Plan endpoints
+- File: `src/server.ts`
+- Lines: ~1842–1885
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
+- Create dedicated routers under `src/domains/{runner,fixtures,replay,plan}/routes.ts` that accept typed dependency objects mirroring the inline usage.
+- Mount the new routers in `src/server.ts` alongside existing domain mounts, injecting shared helpers (`slugify`, `runInSandbox`, `listFixtures`, etc.).
+- Remove the six inline route definitions from `src/server.ts` while preserving helper usage elsewhere.
+- Add unit tests under `tests/domains/` to cover each router (runner, fixtures, replay, plan) using dependency injection to isolate behavior.
+
+## Compliance Check (ai-stack.json + repo rules)
+
+- Language: TypeScript only — OK
+- Backend: Express/Node 20 — OK
+- Frontend: untouched — OK
+- New dependencies: none — OK
+- Protected files: untouched — OK
+- Feature flags: untouched — OK
+- Error handling: JSON `{ error: string }` responses preserved — OK
+
+## Justification
+
+- Moving these utility endpoints into domain-specific routers aligns with prior modular extractions (`execute`, `sessions`) and supports Phase 19+ DI architecture.
+- Dependency injection keeps filesystem/test runner helpers mockable for the mandated 100% coverage router tests.
+- File-backed behaviors (fixtures, plan metadata) remain localized, reducing `src/server.ts` size without altering API contracts.
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
+These must all complete with exit code 0 before committing.
+
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
index 0000000000000000000000000000000000000000..107ff038139b10e515edb038d153bab4ac4adf00
--- /dev/null
+++ b/src/domains/plan/routes.ts
@@ -0,0 +1,67 @@
+import type { Application, Request, Response } from "express";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
+import type { RunResult } from "../../contracts/validators.js";
+
+interface SubtaskResult {
+  subtaskId: string;
+  status: string;
+  notes?: string;
+  testResult?: { status: string; errorMessage?: string } | null;
+}
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
+      const meta = JSON.parse(buf) as { subtaskResults?: SubtaskResult[] };
+      const failed = (meta.subtaskResults ?? [])
+        .filter(result => result.status !== "completed")
+        .map(result => ({
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
+      console.error(err);
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+}
diff --git a/src/domains/replay/routes.ts b/src/domains/replay/routes.ts
new file mode 100644
index 0000000000000000000000000000000000000000..2f83b8841ecb9badc69c93e8c8e7d1b3630b0b2e
--- /dev/null
+++ b/src/domains/replay/routes.ts
@@ -0,0 +1,97 @@
+import type { Application, Request, Response } from "express";
+import fs from "node:fs/promises";
+import path from "node:path";
+
+import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
+import type { RunResult } from "../../contracts/validators.js";
+import type { ExecutorFile } from "../../executor/types.js";
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
+type FixtureOutput = { files?: ExecutorFile[] };
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
+      const projectRaw = (req.body?.project ?? "").toString();
+      const sessionId = (req.body?.sessionId ?? "").toString();
+      if (!projectRaw || !sessionId) {
+        return res.status(400).json({ error: "project and sessionId required" });
+      }
+
+      const slug = slugify(projectRaw, { lower: true, strict: true });
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
+      console.error(err);
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+
+  app.post("/api/replay/subtask", async (req: Request, res: Response) => {
+    try {
+      const projectRaw = (req.body?.project ?? "").toString();
+      const sessionId = (req.body?.sessionId ?? "").toString();
+      const subtaskId = (req.body?.subtaskId ?? "").toString();
+      if (!projectRaw || !sessionId || !subtaskId) {
+        return res.status(400).json({ error: "project, sessionId, and subtaskId required" });
+      }
+
+      const slug = slugify(projectRaw, { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+      try {
+        await fs.access(projectRoot);
+      } catch {
+        return res.status(404).json({ error: "project not found" });
+      }
+
+      const output = await readFixture<FixtureOutput>(slug, sessionId, path.join("subtasks", subtaskId, "output.json")).catch(
+        () => null
+      );
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
+      console.error(err);
+      const message = (err as Error).message || "internal error";
+      return res.status(500).json({ error: message });
+    }
+  });
+}
diff --git a/src/domains/runner/routes.ts b/src/domains/runner/routes.ts
new file mode 100644
index 0000000000000000000000000000000000000000..09b01cfe42f6674fb0645d8d30eba4bb5d696985
--- /dev/null
+++ b/src/domains/runner/routes.ts
@@ -0,0 +1,43 @@
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
+export function mountRunnerRoutes(app: Application, deps: RunnerDeps): void {
+  const { slugify, outputDir, runTests, logEvent } = deps;
+
+  app.post("/api/run-tests", async (req: Request, res: Response) => {
+    try {
+      const projectRaw = (req.body?.project ?? "").toString();
+      if (!projectRaw) {
+        return res.status(400).json({ error: "project required" });
+      }
+
+      const slug = slugify(projectRaw, { lower: true, strict: true });
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
index 693940ca0526b81a57471845cd426826e9548cbe..cce277358f4b0d528312bf7e3d7a5d282ebe115d 100644
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
+  runTests: options => runInSandbox(options),
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
+  runTests: options => runInSandbox(options),
+  logEvent
+});
+mountPlanRoutes(app, {
+  slugify,
+  outputDir: OUTPUT_DIR,
+  runTests: options => runInSandbox(options),
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
index 0000000000000000000000000000000000000000..601bb7e65ccc10c0164c0b6bc9dd24abcacf9e92
--- /dev/null
+++ b/tests/domains/fixtures.routes.test.ts
@@ -0,0 +1,47 @@
+import express from "express";
+import request from "supertest";
+
+import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
+
+import type { FixturesDeps } from "../../src/domains/fixtures/routes.js";
+import { mountFixturesRoutes } from "../../src/domains/fixtures/routes.js";
+
+describe("fixtures routes", () => {
+  let app: express.Application;
+  let slugifyMock: ReturnType<typeof vi.fn>;
+  let listFixturesMock: ReturnType<typeof vi.fn>;
+
+  beforeEach(() => {
+    app = express();
+    slugifyMock = vi.fn().mockImplementation((value: string) => value.toLowerCase());
+    listFixturesMock = vi.fn().mockResolvedValue({ sessionA: ["step1"] });
+
+    const deps: FixturesDeps = {
+      slugify: slugifyMock,
+      listFixtures: listFixturesMock
+    };
+
+    mountFixturesRoutes(app, deps);
+  });
+
+  afterEach(() => {
+    vi.restoreAllMocks();
+  });
+
+  it("returns fixtures for a project", async () => {
+    const response = await request(app).get("/api/fixtures/My Project").expect(200);
+
+    expect(response.body).toEqual({ project: "my project", sessions: { sessionA: ["step1"] } });
+    expect(listFixturesMock).toHaveBeenCalledWith("my project");
+  });
+
+  it("returns 500 when listing fixtures fails", async () => {
+    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
+    listFixturesMock.mockRejectedValueOnce(new Error("boom"));
+
+    const response = await request(app).get("/api/fixtures/Other").expect(500);
+
+    expect(response.body).toEqual({ error: "boom" });
+    expect(consoleError).not.toHaveBeenCalled();
+  });
+});
diff --git a/tests/domains/plan.routes.test.ts b/tests/domains/plan.routes.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..6223a4f3db69bda3b6e0b910871f9ec34b54d6d8
--- /dev/null
+++ b/tests/domains/plan.routes.test.ts
@@ -0,0 +1,119 @@
+import express from "express";
+import request from "supertest";
+import fs from "node:fs/promises";
+import path from "node:path";
+import { tmpdir } from "node:os";
+
+import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
+
+import type { PlanDeps } from "../../src/domains/plan/routes.js";
+import { mountPlanRoutes } from "../../src/domains/plan/routes.js";
+
+const runResult = {
+  status: "fail",
+  passCount: 2,
+  failCount: 1,
+  durationMs: 900,
+  logsPath: "logs/fail.log",
+  timestamp: new Date().toISOString()
+};
+
+describe("plan routes", () => {
+  let app: express.Application;
+  let outputDir: string;
+  let slugifyMock: ReturnType<typeof vi.fn>;
+  let runTestsMock: ReturnType<typeof vi.fn>;
+  let logEventMock: ReturnType<typeof vi.fn>;
+
+  beforeEach(async () => {
+    outputDir = await fs.mkdtemp(path.join(tmpdir(), "plan-routes-"));
+    app = express();
+    app.use(express.json());
+
+    slugifyMock = vi.fn().mockImplementation((value: string) => value.replace(/\s+/g, "-").toLowerCase());
+    runTestsMock = vi.fn().mockResolvedValue({ ...runResult });
+    logEventMock = vi.fn().mockResolvedValue(undefined);
+
+    const deps: PlanDeps = {
+      slugify: slugifyMock,
+      outputDir,
+      runTests: runTestsMock,
+      logEvent: logEventMock
+    };
+
+    mountPlanRoutes(app, deps);
+  });
+
+  afterEach(async () => {
+    await fs.rm(outputDir, { recursive: true, force: true });
+    vi.restoreAllMocks();
+  });
+
+  describe("/api/plan/:project/failed-subtasks", () => {
+    it("returns failed subtasks from metadata", async () => {
+      const slug = slugifyMock("Proj", { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+      await fs.mkdir(projectRoot, { recursive: true });
+      const meta = {
+        subtaskResults: [
+          { subtaskId: "a", status: "completed", notes: "done" },
+          { subtaskId: "b", status: "failed", notes: "oops" },
+          { subtaskId: "c", status: "error", testResult: { status: "fail", errorMessage: "boom" } }
+        ]
+      };
+      await fs.writeFile(path.join(projectRoot, "_executor_meta.json"), JSON.stringify(meta), "utf-8");
+
+      const response = await request(app).get("/api/plan/Proj/failed-subtasks").expect(200);
+
+      expect(response.body).toEqual({
+        project: slug,
+        failed: [
+          { subtaskId: "b", status: "failed", reason: "oops" },
+          { subtaskId: "c", status: "error", reason: "boom" }
+        ]
+      });
+    });
+
+    it("returns 500 when metadata cannot be read", async () => {
+      const response = await request(app).get("/api/plan/Unknown/failed-subtasks").expect(500);
+      expect(response.body.error).toMatch(/ENOENT/);
+    });
+  });
+
+  describe("/api/plan/:project/retest-subtask", () => {
+    it("returns 404 when project directory is missing", async () => {
+      const response = await request(app).post("/api/plan/Proj/retest-subtask").send({}).expect(404);
+      expect(response.body).toEqual({ error: "project not found" });
+      expect(runTestsMock).not.toHaveBeenCalled();
+    });
+
+    it("re-runs tests for an existing project", async () => {
+      const slug = slugifyMock("Proj", { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+      await fs.mkdir(projectRoot, { recursive: true });
+
+      const response = await request(app).post("/api/plan/Proj/retest-subtask").send({}).expect(200);
+
+      expect(runTestsMock).toHaveBeenCalledWith({ projectRoot, projectSlug: slug });
+      expect(logEventMock).toHaveBeenCalledWith("test_run", {
+        project: slug,
+        stage: "retest-subtask",
+        status: runResult.status
+      });
+      expect(response.body).toEqual({ project: slug, result: runResult });
+    });
+
+    it("returns 500 when test run fails", async () => {
+      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
+      const slug = slugifyMock("Proj", { lower: true, strict: true });
+      const projectRoot = path.join(outputDir, slug);
+      await fs.mkdir(projectRoot, { recursive: true });
+      runTestsMock.mockRejectedValueOnce(new Error("sandbox fail"));
+
+      const response = await request(app).post("/api/plan/Proj/retest-subtask").send({}).expect(500);
+
+      expect(response.body).toEqual({ error: "sandbox fail" });
+      expect(consoleError).toHaveBeenCalled();
+    });
+  });
+});
diff --git a/tests/domains/replay.routes.test.ts b/tests/domains/replay.routes.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..287ae6c909ccb4cea195b11bbc2804d46ba895d2
--- /dev/null
+++ b/tests/domains/replay.routes.test.ts
@@ -0,0 +1,189 @@
+import express from "express";
+import request from "supertest";
+import fs from "node:fs/promises";
+import path from "node:path";
+import { tmpdir } from "node:os";
+
+import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
+
+import type { ReplayDeps } from "../../src/domains/replay/routes.js";
+import { mountReplayRoutes } from "../../src/domains/replay/routes.js";
+
+const runResult = {
+  status: "pass",
+  passCount: 1,
+  failCount: 0,
+  durationMs: 500,
+  logsPath: "logs/run.log",
+  timestamp: new Date().toISOString()
+};
+
+const repairHistory = {
+  attempts: [],
+  finalStatus: "pass",
+  totalAttempts: 0
+};
+
+describe("replay routes", () => {
+  let app: express.Application;
+  let outputDir: string;
+  let deps: ReplayDeps;
+  let slugifyMock: ReturnType<typeof vi.fn>;
+  let readFixtureMock: ReturnType<typeof vi.fn>;
+  let multiTurnRepairMock: ReturnType<typeof vi.fn>;
+  let writeFilesMock: ReturnType<typeof vi.fn>;
+  let ensureDefaultExportForAppMock: ReturnType<typeof vi.fn>;
+  let runTestsMock: ReturnType<typeof vi.fn>;
+  let logEventMock: ReturnType<typeof vi.fn>;
+
+  beforeEach(async () => {
+    outputDir = await fs.mkdtemp(path.join(tmpdir(), "replay-routes-"));
+    app = express();
+    app.use(express.json());
+
+    slugifyMock = vi.fn().mockImplementation((value: string) => value.replace(/\s+/g, "-").toLowerCase());
+    readFixtureMock = vi.fn();
+    multiTurnRepairMock = vi.fn().mockResolvedValue({ ...repairHistory });
+    writeFilesMock = vi.fn().mockResolvedValue(undefined);
+    ensureDefaultExportForAppMock = vi.fn().mockResolvedValue(undefined);
+    runTestsMock = vi.fn().mockResolvedValue({ ...runResult });
+    logEventMock = vi.fn().mockResolvedValue(undefined);
+
+    deps = {
+      slugify: slugifyMock,
+      outputDir,
+      readFixture: readFixtureMock,
+      multiTurnRepair: multiTurnRepairMock,
+      writeFiles: writeFilesMock,
+      ensureDefaultExportForApp: ensureDefaultExportForAppMock,
+      runTests: runTestsMock,
+      logEvent: logEventMock
+    } satisfies ReplayDeps;
+
+    mountReplayRoutes(app, deps);
+  });
+
+  afterEach(async () => {
+    await fs.rm(outputDir, { recursive: true, force: true });
+    vi.restoreAllMocks();
+  });
+
+  describe("/api/replay/repair", () => {
+    it("returns 400 when required fields are missing", async () => {
+      const response = await request(app).post("/api/replay/repair").send({}).expect(400);
+      expect(response.body).toEqual({ error: "project and sessionId required" });
+      expect(readFixtureMock).not.toHaveBeenCalled();
+    });
+
+    it("returns 404 when repair context is missing", async () => {
+      readFixtureMock.mockRejectedValueOnce(new Error("missing"));
+
+      const response = await request(app)
+        .post("/api/replay/repair")
+        .send({ project: "Proj", sessionId: "sess" })
+        .expect(404);
+
+      expect(response.body).toEqual({ error: "repair context fixture not found" });
+      expect(multiTurnRepairMock).not.toHaveBeenCalled();
+    });
+
+    it("replays repair when context exists", async () => {
+      const context = { projectPath: "proj", originalPrompt: "prompt", generatedFiles: [], initialTestResult: runResult };
+      readFixtureMock.mockResolvedValueOnce(context);
+
+      const response = await request(app)
+        .post("/api/replay/repair")
+        .send({ project: "Proj", sessionId: "sess" })
+        .expect(200);
+
+      const slug = slugifyMock("Proj", { lower: true, strict: true });
+      expect(response.body).toEqual({ project: slug, sessionId: "sess", history: repairHistory });
+      expect(multiTurnRepairMock).toHaveBeenCalledWith(context);
+    });
+
+    it("returns 500 when repair execution fails", async () => {
+      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
+      const context = { projectPath: "proj", originalPrompt: "prompt", generatedFiles: [], initialTestResult: runResult };
+      readFixtureMock.mockResolvedValueOnce(context);
+      multiTurnRepairMock.mockRejectedValueOnce(new Error("repair failed"));
+
+      const response = await request(app)
+        .post("/api/replay/repair")
+        .send({ project: "Proj", sessionId: "sess" })
+        .expect(500);
+
+      expect(response.body).toEqual({ error: "repair failed" });
+      expect(consoleError).toHaveBeenCalled();
+    });
+  });
+
+  describe("/api/replay/subtask", () => {
+    it("returns 400 when any required field is missing", async () => {
+      const response = await request(app).post("/api/replay/subtask").send({ project: "Proj" }).expect(400);
+      expect(response.body).toEqual({ error: "project, sessionId, and subtaskId required" });
+      expect(readFixtureMock).not.toHaveBeenCalled();
+    });
+
+    it("returns 404 when project directory is missing", async () => {
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: "Proj", sessionId: "sess", subtaskId: "sub" })
+        .expect(404);
+
+      expect(response.body).toEqual({ error: "project not found" });
+      expect(readFixtureMock).not.toHaveBeenCalled();
+    });
+
+    it("returns 404 when subtask fixture is invalid", async () => {
+      const slug = slugifyMock("Proj", { lower: true, strict: true });
+      await fs.mkdir(path.join(outputDir, slug), { recursive: true });
+      readFixtureMock.mockResolvedValueOnce({});
+
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: "Proj", sessionId: "sess", subtaskId: "sub" })
+        .expect(404);
+
+      expect(response.body).toEqual({ error: "subtask output fixture not found or invalid" });
+      expect(writeFilesMock).not.toHaveBeenCalled();
+    });
+
+    it("replays a subtask and runs tests", async () => {
+      const slug = slugifyMock("Proj", { lower: true, strict: true });
+      await fs.mkdir(path.join(outputDir, slug), { recursive: true });
+      const files = [{ path: "src/index.ts", contents: "export const value = 1;" }];
+      readFixtureMock.mockResolvedValueOnce({ files });
+
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: "Proj", sessionId: "sess", subtaskId: "sub" })
+        .expect(200);
+
+      expect(writeFilesMock).toHaveBeenCalledWith(path.join(outputDir, slug), files);
+      expect(ensureDefaultExportForAppMock).toHaveBeenCalledWith(path.join(outputDir, slug));
+      expect(runTestsMock).toHaveBeenCalledWith({ projectRoot: path.join(outputDir, slug), projectSlug: slug });
+      expect(logEventMock).toHaveBeenCalledWith("test_run", {
+        project: slug,
+        stage: "replay-subtask:sub",
+        status: runResult.status
+      });
+      expect(response.body).toEqual({ ok: true, project: slug, subtaskId: "sub", result: runResult });
+    });
+
+    it("returns 500 when replay fails", async () => {
+      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
+      const slug = slugifyMock("Proj", { lower: true, strict: true });
+      await fs.mkdir(path.join(outputDir, slug), { recursive: true });
+      readFixtureMock.mockResolvedValueOnce({ files: [{ path: "a", contents: "b" }] });
+      writeFilesMock.mockRejectedValueOnce(new Error("write failure"));
+
+      const response = await request(app)
+        .post("/api/replay/subtask")
+        .send({ project: "Proj", sessionId: "sess", subtaskId: "sub" })
+        .expect(500);
+
+      expect(response.body).toEqual({ error: "write failure" });
+      expect(consoleError).toHaveBeenCalled();
+    });
+  });
+});
diff --git a/tests/domains/runner.routes.test.ts b/tests/domains/runner.routes.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d4f21a7a88e95c5d751069f58b565a5ab22c145d
--- /dev/null
+++ b/tests/domains/runner.routes.test.ts
@@ -0,0 +1,94 @@
+import express from "express";
+import request from "supertest";
+import fs from "node:fs/promises";
+import path from "node:path";
+import { tmpdir } from "node:os";
+
+import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
+
+import type { RunnerDeps } from "../../src/domains/runner/routes.js";
+import { mountRunnerRoutes } from "../../src/domains/runner/routes.js";
+
+const baseResult = {
+  status: "pass",
+  passCount: 3,
+  failCount: 0,
+  durationMs: 1200,
+  logsPath: "logs/latest.log",
+  timestamp: new Date().toISOString()
+};
+
+describe("runner routes", () => {
+  let app: express.Application;
+  let outputDir: string;
+  let deps: RunnerDeps;
+  let slugifyMock: ReturnType<typeof vi.fn>;
+  let runTestsMock: ReturnType<typeof vi.fn>;
+  let logEventMock: ReturnType<typeof vi.fn>;
+
+  beforeEach(async () => {
+    outputDir = await fs.mkdtemp(path.join(tmpdir(), "runner-routes-"));
+    app = express();
+    app.use(express.json());
+
+    slugifyMock = vi.fn().mockImplementation((value: string) => value.replace(/\s+/g, "-").toLowerCase());
+    runTestsMock = vi.fn().mockResolvedValue({ ...baseResult });
+    logEventMock = vi.fn().mockResolvedValue(undefined);
+
+    deps = {
+      slugify: slugifyMock,
+      outputDir,
+      runTests: runTestsMock,
+      logEvent: logEventMock
+    } satisfies RunnerDeps;
+
+    mountRunnerRoutes(app, deps);
+  });
+
+  afterEach(async () => {
+    await fs.rm(outputDir, { recursive: true, force: true });
+    vi.restoreAllMocks();
+  });
+
+  it("runs tests for an existing project", async () => {
+    const projectSlug = slugifyMock("My Project", { lower: true, strict: true });
+    await fs.mkdir(path.join(outputDir, projectSlug), { recursive: true });
+
+    const response = await request(app).post("/api/run-tests").send({ project: "My Project" }).expect(200);
+
+    expect(response.body).toEqual(baseResult);
+    expect(runTestsMock).toHaveBeenCalledWith({
+      projectRoot: path.join(outputDir, projectSlug),
+      projectSlug
+    });
+    expect(logEventMock).toHaveBeenCalledWith("test_run", {
+      project: projectSlug,
+      stage: "manual",
+      status: baseResult.status
+    });
+  });
+
+  it("returns 400 when project is missing", async () => {
+    const response = await request(app).post("/api/run-tests").send({}).expect(400);
+    expect(response.body).toEqual({ error: "project required" });
+    expect(runTestsMock).not.toHaveBeenCalled();
+  });
+
+  it("returns 404 when project directory does not exist", async () => {
+    const response = await request(app).post("/api/run-tests").send({ project: "missing" }).expect(404);
+    expect(response.body).toEqual({ error: "project not found" });
+    expect(runTestsMock).not.toHaveBeenCalled();
+  });
+
+  it("returns 500 when sandbox execution fails", async () => {
+    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
+    const projectSlug = slugifyMock("Broken", { lower: true, strict: true });
+    await fs.mkdir(path.join(outputDir, projectSlug), { recursive: true });
+    runTestsMock.mockRejectedValueOnce(new Error("sandbox boom"));
+
+    const response = await request(app).post("/api/run-tests").send({ project: "Broken" }).expect(500);
+
+    expect(response.body).toEqual({ error: "sandbox boom" });
+    expect(consoleError).toHaveBeenCalled();
+  });
+});
 
EOF
)