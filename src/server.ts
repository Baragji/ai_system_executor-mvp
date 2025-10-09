import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import slugify from "slugify";

import { generateJSON } from "./llm/index.js";
import { validateExecutorOutput } from "./executor/schema.js";
import { sanitizeExecutorOutput } from "./executor/outputProcessing.js";
import { seedTestsInFiles, seedTestsOnDisk } from "./utils/seedTests.js";
import { writeFiles } from "./executor/writeFiles.js";
import { ensureDefaultExportForApp } from "./utils/normalizeExports.js";
import { runInSandbox } from "./runner/runInSandbox.js";
import { multiTurnRepair } from "./repair/multiTurnRepair.js";
// import { validateScaffoldOnDisk } from "./validation/validateScaffold.js";
import { fileSha256 } from "./utils/checksum.js";
import { logEvent } from "./telemetry/events.js";
import type { ExecutorOutput, ExecutorFile } from "./executor/types.js";
import type { RunResult } from "./contracts/validators.js";
import type { FailureCategory, RepairHistory, TestResultSummary } from "./contracts/repairHistoryValidator.js";
import { detectMissing } from "./clarification/detectMissing.js";
import { generateQuestions } from "./clarification/generateQuestions.js";
import { augmentPrompt } from "./clarification/augmentPrompt.js";
import {
  validateClarificationRequest,
  validateClarificationResponse
} from "./contracts/validators.js";
import type {
  ClarificationAnswer,
  ClarificationQuestion,
  ClarificationResponse
} from "./clarification/types.js";
import { decomposeTask } from "./planning/decomposeTask.js";
import { validateDecomposition } from "./planning/validateDecomposition.js";
import { executeTaskPlan } from "./planning/executeTaskPlan.js";
import { generateSubtaskOutputWithRetry } from "./planning/generateSubtaskOutput.js";
import { estimateCompletion } from "./planning/estimateCompletion.js";
import type {
  PlanExecutionContext,
  PlanExecutionResult,
  SubtaskResult,
  TaskPlan,
  TimeEstimate
} from "./planning/types.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const PORT = Number(process.env.PORT || 3000);
const OUTPUT_DIR = path.resolve("output");
const PUBLIC_DIR = path.resolve("public");
// In-memory progress sessions for SSE/polling
type ProgressSnapshot = { stage: string; progress: number; data?: Record<string, unknown>; updatedAt: number; done?: boolean };
const progressSessions = new Map<string, ProgressSnapshot>();

function setProgress(sessionId: string | undefined, stage: string, progress: number, data?: Record<string, unknown>, done?: boolean) {
  if (!sessionId) return;
  progressSessions.set(sessionId, { stage, progress, data, updatedAt: Date.now(), done });
}

function getProgress(sessionId: string): ProgressSnapshot | null {
  const snap = progressSessions.get(sessionId) ?? null;
  return snap;
}

const CLARIFICATION_SESSION_TTL_MS = 10 * 60 * 1000;

type ClarificationSession = {
  questions: ClarificationQuestion[];
  storedAt: number;
};

const clarificationSessions = new Map<string, ClarificationSession>();

function clarificationSessionKey(prompt: string): string | null {
  const normalized = prompt.trim();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function purgeExpiredSessions(now: number) {
  for (const [key, entry] of clarificationSessions.entries()) {
    if (now - entry.storedAt > CLARIFICATION_SESSION_TTL_MS) {
      clarificationSessions.delete(key);
    }
  }
}

function rememberClarificationQuestions(prompt: string, questions: ClarificationQuestion[]) {
  if (!questions || questions.length === 0) return;
  const key = clarificationSessionKey(prompt);
  if (!key) return;
  const now = Date.now();
  purgeExpiredSessions(now);
  clarificationSessions.set(key, { questions, storedAt: now });
}

function consumeClarificationQuestions(prompt: string): ClarificationQuestion[] | undefined {
  const key = clarificationSessionKey(prompt);
  if (!key) return undefined;
  purgeExpiredSessions(Date.now());
  const entry = clarificationSessions.get(key);
  if (!entry) return undefined;
  clarificationSessions.delete(key);
  return entry.questions;
}

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.use("/", express.static(PUBLIC_DIR, { extensions: ["html"] }));
app.use("/output", express.static(OUTPUT_DIR, { extensions: ["html"] }));

async function ensureMetaDirectory(root: string) {
  await fs.mkdir(root, { recursive: true });
}

async function computeFileChecksums(pathsToHash: string[], projectRoot: string) {
  const entries = [] as { path: string; sha256: string }[];
  for (const relativePath of pathsToHash) {
    const abs = path.join(projectRoot, relativePath);
    try {
      const hash = await fileSha256(abs);
      entries.push({ path: relativePath, sha256: hash });
    } catch (err) {
      console.warn(`Failed to hash ${relativePath}:`, err);
    }
  }
  return entries;
}

async function collectFilePaths(
  projectRoot: string,
  files: ExecutorFile[],
  extraPaths: string[]
): Promise<string[]> {
  const paths = new Set(files.map(file => file.path));
  for (const candidate of extraPaths) {
    if (!candidate) continue;
    paths.add(candidate);
  }

  const existing: string[] = [];
  for (const candidate of paths) {
    const absolute = path.join(projectRoot, candidate);
    try {
      await fs.access(absolute);
      existing.push(candidate);
    } catch {
      // Skip files that no longer exist after repairs (deleted during attempts)
    }
  }

  return existing;
}

function buildTestRunEntry(attempt: string, run: RunResult | TestResultSummary) {
  return {
    attempt,
    status: run.status,
    passCount: run.passCount,
    failCount: run.failCount,
    durationMs: run.durationMs ?? 0,
    logsPath: run.logsPath,
    timestamp: "timestamp" in run && run.timestamp ? run.timestamp : new Date().toISOString()
  };
}

function gatherChangedPaths(history: RepairHistory | null | undefined): string[] {
  if (!history) return [];
  const paths = new Set<string>();
  for (const attempt of history.attempts) {
    for (const changed of attempt.changedFiles) {
      if (changed) {
        paths.add(changed);
      }
    }
  }
  return Array.from(paths);
}

function isComplexPrompt(prompt: string, clarifications?: ClarificationResponse): boolean {
  const normalized = prompt.toLowerCase();
  const featureIndicators = [" and ", " with ", "feature", "module", "api", "database", "auth", "dashboard", "workflow"];
  const bulletLike = /\n-\s|\n\d+\./.test(prompt);
  const multipleSentences = prompt.split(/[.!?]/).filter(chunk => chunk.trim().length > 0).length >= 2;
  if (clarifications && clarifications.answers.length > 0) {
    return true;
  }
  if (prompt.length > 180 || bulletLike || multipleSentences) {
    return true;
  }
  return featureIndicators.some(indicator => normalized.includes(indicator));
}

async function generateExecutorOutputFromPrompt(
  systemPrompt: string,
  userPrompt: string,
  { enforceTests }: { enforceTests: boolean }
): Promise<ExecutorOutput> {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt }
  ];

  const raw = await generateJSON(messages);
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Model did not return valid JSON");
  }

  const sanitized = sanitizeExecutorOutput(data);
  const validation = validateExecutorOutput(sanitized);
  if (!validation.ok) {
    throw new Error(`JSON failed schema validation: ${validation.errors}`);
  }

  const output = validation.value;
  if (enforceTests && !output.hasTests) {
    throw new Error("Generated output must include tests and set hasTests=true");
  }

  return output;
}

function collectPlanGeneratedFiles(results: SubtaskResult[]): string[] {
  const files = new Set<string>();
  results.forEach(result => {
    result.generatedFiles.forEach(file => files.add(file));
  });
  return Array.from(files);
}

function createPlanExecutionContext(
  params: {
    targetRoot: string;
    slug: string;
    effectivePrompt: string;
    clarifications?: ClarificationResponse;
    systemPrompt: string;
  }
): PlanExecutionContext {
  const { targetRoot, slug, effectivePrompt, clarifications, systemPrompt } = params;

  return {
    projectPath: targetRoot,
    projectSlug: slug,
    originalPrompt: effectivePrompt,
    clarifications,
    previousSubtaskResults: [],
    generateSubtaskOutput: request =>
      generateSubtaskOutputWithRetry(systemPrompt, request, false, undefined, (attempt, reason) =>
        logEvent("plan_progress", {
          project: slug,
          subtask: request.subtask.id,
          status: "retry",
          percent: 0,
          attempt,
          reason
        })
      ),
    writeFiles: async (rootDir, files) => {
      await writeFiles(rootDir, files);
      await ensureDefaultExportForApp(rootDir);
    },
    runTests: options => runInSandbox(options),
    multiTurnRepair: context => multiTurnRepair(context),
    logTelemetry: event =>
      logEvent("plan_progress", {
        project: slug,
        subtask: event.subtaskId,
        status: event.status,
        percent: Number(event.progress.percentComplete.toFixed(2))
      }),
    onProgressUpdate: snapshot =>
      logEvent("plan_snapshot", {
        project: slug,
        completed: snapshot.completedSubtasks,
        failed: snapshot.failedSubtasks,
        percent: Number(snapshot.percentComplete.toFixed(2))
      }),
    now: () => Date.now()
  };
}

async function executePlanFlow(params: {
  plan: TaskPlan;
  planQuality: number;
  targetRoot: string;
  slug: string;
  effectivePrompt: string;
  originalPrompt: string;
  clarifications?: ClarificationResponse;
  clarificationsUsed: boolean;
  systemPrompt: string;
  clarificationQuestions: ClarificationQuestion[];
  clarificationsAsked: boolean;
  projectName: string;
  sessionId?: string;
}): Promise<{ response: unknown; meta: unknown; status: PlanExecutionResult["status"]; timeEstimate: TimeEstimate; planExecutionResult: PlanExecutionResult }>
{
  const {
    plan,
    planQuality,
    targetRoot,
    slug,
    effectivePrompt,
    originalPrompt,
    clarifications,
    clarificationsUsed,
    systemPrompt,
    clarificationQuestions,
    clarificationsAsked,
    projectName,
    sessionId
  } = params;

  await ensureMetaDirectory(targetRoot);
  await logEvent("generation_start", { project: slug, mode: "plan" });

  const context = createPlanExecutionContext({
    targetRoot,
    slug,
    effectivePrompt,
    clarifications,
    systemPrompt
  });

  // Hook progress updates into session tracking
  const originalOnProgress = context.onProgressUpdate;
  context.onProgressUpdate = (snapshot, result) => {
    setProgress(sessionId, "generating", Math.max(30, Math.min(90, Number(snapshot.percentComplete) * 0.9)), { completed: snapshot.completedSubtasks });
    originalOnProgress?.(snapshot, result);
  };

  const planExecutionResult = await executeTaskPlan(plan, context);
  const timeEstimate = estimateCompletion(planExecutionResult.progress, plan);
  const generatedFiles = collectPlanGeneratedFiles(planExecutionResult.subtaskResults);
  // Persist the task plan to disk for focused re-runs/debugging
  try {
    await fs.writeFile(path.join(targetRoot, "_task_plan.json"), JSON.stringify(plan, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist _task_plan.json", err);
  }

  // S3: Critical file reconciliation before computing metadata/tests
  const fileValidation = await validateFilesNonEmpty(targetRoot, generatedFiles);
  if (!fileValidation.ok) {
    await logEvent("missing_critical_file", {
      project: slug,
      missing: fileValidation.missing,
      empty: fileValidation.empty
    });
  }
  // Ensure seed tests exist on disk for plan-based generations
  await seedTestsOnDisk(targetRoot);

  const fileMetadata = await computeFileChecksums(
    await collectFilePaths(
      targetRoot,
      generatedFiles.map(pathname => ({ path: pathname, contents: "" })),
      []
    ),
    targetRoot
  );

  const lastResult = planExecutionResult.subtaskResults.at(-1) ?? null;
  const lastHistory = lastResult?.repairHistory ?? null;
  const finalStatus = planExecutionResult.status === "completed" ? "pass" : "fail";

  const responseTestResults = {
    initial: lastResult?.testResult ?? null,
    afterRepair: lastHistory?.attempts.at(-1)?.testResult ?? null
  };

  const testRunEntries = [] as ReturnType<typeof buildTestRunEntry>[];
  planExecutionResult.subtaskResults.forEach(result => {
    if (result.testResult) {
      testRunEntries.push(buildTestRunEntry(result.subtaskId, result.testResult));
    }
    result.repairHistory?.attempts.forEach(attempt => {
      testRunEntries.push(buildTestRunEntry(`${result.subtaskId}-repair-${attempt.number}`, attempt.testResult));
    });
  });

  const clarificationAnswers: ClarificationAnswer[] = clarifications
    ? clarifications.answers.map(answer => ({ ...answer }))
    : [];

  const clarificationTelemetry = {
    asked: clarificationsAsked,
    questions: clarificationQuestions,
    answers: clarificationAnswers,
    improvedSuccess: clarificationsUsed && finalStatus === "pass"
  };

  const repairMetrics = lastHistory ? buildRepairMetrics(lastHistory) : {};
  const repairSummary = lastHistory
    ? buildRepairSummary(
        responseTestResults.initial ?? {
          status: "fail",
          passCount: 0,
          failCount: 1,
          durationMs: lastResult?.durationMs ?? 0,
          logsPath: "",
          timestamp: new Date().toISOString()
        },
        lastHistory
      )
    : { attempted: false, repaired: true, appliedFiles: 0, notes: [], error: null, artifacts: [] };

  const meta = {
    created_at: new Date().toISOString(),
    source_prompt: effectivePrompt,
    original_prompt: originalPrompt,
    clarification: clarificationTelemetry,
    clarifications: {
      used: clarificationsUsed,
      answers: clarificationAnswers,
      asked: clarificationTelemetry.asked
    },
    notes: fileValidation.ok
      ? []
      : [
          fileValidation.missing.length > 0
            ? `Missing files: ${fileValidation.missing.join(", ")}`
            : undefined,
          fileValidation.empty.length > 0
            ? `Empty files: ${fileValidation.empty.join(", ")}`
            : undefined
        ].filter(Boolean),
    testRuns: testRunEntries,
    repair: repairSummary,
    repairMetrics,
    repairHistory: lastHistory,
    files: fileMetadata,
    taskPlanUsed: true,
    decompositionQuality: planQuality,
    subtaskResults: planExecutionResult.subtaskResults,
    planningMetrics: {
      totalSubtasks: plan.subtasks.length,
      completedSubtasks: planExecutionResult.completedSubtasks.length,
      failedSubtasks: planExecutionResult.failedSubtasks.length,
      totalPlanDuration: planExecutionResult.totalDurationMs
    }
  };

  const metaPath = path.join(targetRoot, "_executor_meta.json");
  try {
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  } catch (err) {
    const code = (err as { code?: string } | null | undefined)?.code;
    if (code === "ENOENT") {
      await fs.mkdir(targetRoot, { recursive: true });
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
    } else {
      throw err;
    }
  }

  await logEvent("generation_complete", { project: slug, status: finalStatus, mode: "plan" });

  const responsePayload = {
    ok: true,
    project: slug,
    files_written: generatedFiles.length,
    browse_url: `/output/${slug}/`,
    abs_path: targetRoot,
    testResults: responseTestResults,
    repairMetrics,
    repairHistory: lastHistory,
    repair: repairSummary,
    clarificationsUsed,
    generated: effectivePrompt,
    taskPlanUsed: true,
    taskPlan: plan,
    planExecutionResult,
    timeEstimate,
    decompositionQuality: planQuality,
    projectName
  };

  return { response: responsePayload, meta, status: planExecutionResult.status, timeEstimate, planExecutionResult };
}

function buildRepairSummary(initialRun: RunResult, history: RepairHistory) {
  const attempted = initialRun.status !== "pass";
  const finalAttempt = history.attempts.at(-1);
  const finalStatus = finalAttempt?.testResult.status ?? initialRun.status;

  return {
    attempted,
    repaired: finalStatus === "pass",
    appliedFiles: finalAttempt?.changedFiles.length ?? 0,
    notes: [] as string[],
    error: finalStatus === "pass" ? null : `final status: ${history.finalStatus}`,
    artifacts: [] as unknown[]
  };
}

function buildRepairMetrics(history: RepairHistory) {
  const totalAttempts = history.attempts.length;
  const successAttempt = history.successAttemptNumber;
  const timePerAttempt = history.attempts.map(attempt => attempt.durationMs);
  const failureTypes = history.attempts
    .map(attempt => attempt.failureAnalysis?.category)
    .filter((category): category is FailureCategory => Boolean(category));
  const exhausted = history.finalStatus === "exhausted";
  const efficiency = successAttempt && totalAttempts > 0 && !exhausted
    ? successAttempt / totalAttempts
    : 0;

  const metrics: Record<string, unknown> = {
    totalAttempts,
    timePerAttempt,
    failureTypes,
    exhausted,
    attemptEfficiency: Number.isFinite(efficiency) ? Number(efficiency.toFixed(2)) : 0
  };

  if (successAttempt) {
    metrics.successAttempt = successAttempt;
  }

  return metrics;
}

// Sanitize model output before schema validation to improve resilience.
// - Drops unknown top-level properties
// - Normalizes file paths (removes leading "./")
// - Ensures files array contains only { path, contents } with string types
export { sanitizeExecutorOutput } from "./executor/outputProcessing.js";

app.post("/api/clarify", (req, res) => {
  try {
    const promptRaw = req.body?.prompt;
    const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
    if (!prompt) {
      return res.status(400).json({ error: "prompt required" });
    }

    const missing = detectMissing(prompt);
    const questions = generateQuestions(missing, prompt);
    rememberClarificationQuestions(prompt, questions);
    const payload = { questions };
    const validation = validateClarificationRequest(payload);
    if (!validation.ok) {
      console.error("Clarification payload failed validation", validation.errors);
      return res.status(500).json({ error: "clarification contract violation" });
    }

    return res.json(payload);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/execute", async (req, res) => {
  try {
    const sessionId: string | undefined = typeof req.body?.sessionId === 'string' ? req.body.sessionId : undefined;
    setProgress(sessionId, "analyzing", 10);
    const promptRaw = req.body?.prompt;
    const originalPrompt: string = promptRaw === undefined ? "" : promptRaw.toString();
    const promptForValidation = originalPrompt.trim();
    const projectNameRaw: string | undefined = req.body?.projectName;
    if (!promptForValidation || promptForValidation.length < 3) {
      return res.status(400).json({ error: "prompt required" });
    }

    let clarificationsUsed = false;
    let clarifications: ClarificationResponse | undefined;

    if (req.body?.clarifications !== undefined) {
      const validation = validateClarificationResponse(req.body.clarifications);
      if (!validation.ok) {
        return res.status(400).json({ error: "invalid clarifications", details: validation.errors });
      }
      clarifications = validation.value;
    }

    let effectivePrompt = originalPrompt;
    if (clarifications) {
      const augmented = augmentPrompt(originalPrompt, clarifications);
      if (augmented !== originalPrompt) {
        clarificationsUsed = true;
        effectivePrompt = augmented;
      }
    }

    const systemPrompt = await fs.readFile("src/executor/systemPrompt.md", "utf-8");
    const projectNameInput = typeof projectNameRaw === "string" ? projectNameRaw.trim() : "";

    const storedQuestions = consumeClarificationQuestions(originalPrompt) ?? [];
    let clarificationQuestions = storedQuestions;
    let clarificationAsked = clarificationQuestions.length > 0;
    if (!clarificationAsked && clarifications && clarifications.answers.length > 0) {
      const missingAgain = detectMissing(originalPrompt);
      clarificationQuestions = generateQuestions(missingAgain, originalPrompt);
      clarificationAsked = clarificationQuestions.length > 0;
    }

    if (isComplexPrompt(effectivePrompt, clarifications)) {
      try {
        const plan = await decomposeTask(effectivePrompt, clarifications);
        const quality = validateDecomposition(plan, effectivePrompt);
        if (quality.score >= 70) {
          const planProjectName = projectNameInput || plan.originalPrompt || "planned-project";
          const slug = slugify(planProjectName, { lower: true, strict: true }) || `planned-${Date.now()}`;
          const targetRoot = path.join(OUTPUT_DIR, slug);

          try {
            const planResult = await executePlanFlow({
              plan,
              planQuality: quality.score,
              targetRoot,
              slug,
              effectivePrompt,
              originalPrompt,
              clarifications,
              clarificationsUsed,
              systemPrompt,
              clarificationQuestions,
              clarificationsAsked: clarificationAsked,
              projectName: planProjectName,
              sessionId
            });
            setProgress(sessionId, "finalizing", 95);
            return res.json(planResult.response);
          } catch (planError) {
            console.error("Plan execution failed, falling back to single execution", planError);
            // Fall through to single execution below
          }
        }
      } catch (error) {
        console.warn("Planning decomposition failed, falling back to single execution", error);
        // Fall through to single execution below
      }
    }

    let output: ExecutorOutput;
    try {
      setProgress(sessionId, "planning", 30);
      output = await generateExecutorOutputFromPrompt(systemPrompt, effectivePrompt, { enforceTests: true });
    } catch (error) {
      setProgress(sessionId, "finalizing", 100, { error: (error as Error).message }, true);
      return res.status(422).json({ error: (error as Error).message });
    }

    const projectName = projectNameInput || output.project_name || "generated-project";
    const slug = slugify(projectName, { lower: true, strict: true });
    const targetRoot = path.join(OUTPUT_DIR, slug);

    await fs.mkdir(targetRoot, { recursive: true });
    await ensureMetaDirectory(targetRoot);
    await logEvent("generation_start", { project: slug });

    setProgress(sessionId, "generating", 55);
    // Seed a minimal test and ensure test script before write
    output.files = seedTestsInFiles(output.files);
    await writeFiles(targetRoot, output.files);
    await ensureDefaultExportForApp(targetRoot);

    setProgress(sessionId, "testing", 80);
    const initialRun = await runInSandbox({
      projectRoot: targetRoot,
      projectSlug: slug
    });
    await logEvent("test_run", { project: slug, stage: "initial", status: initialRun.status });

    const repairHistory = await multiTurnRepair({
      projectPath: targetRoot,
      projectSlug: slug,
      originalPrompt: effectivePrompt,
      generatedFiles: output.files.map(file => file.path),
      initialTestResult: initialRun
    });

    await logEvent("repair_attempt", {
      project: slug,
      attempts: repairHistory.totalAttempts,
      finalStatus: repairHistory.finalStatus,
      successAttempt: repairHistory.successAttemptNumber ?? null
    });

    const testRunEntries = [buildTestRunEntry("initial", initialRun)];
    if (initialRun.status !== "pass") {
      for (const attempt of repairHistory.attempts) {
        testRunEntries.push(buildTestRunEntry(`repair-${attempt.number}`, attempt.testResult));
        await logEvent("test_run", {
          project: slug,
          stage: `repair-${attempt.number}`,
          status: attempt.testResult.status
        });
      }
    }

    const afterRepairResult = initialRun.status === "pass"
      ? null
      : repairHistory.attempts.at(-1)?.testResult ?? null;
    const finalStatus = afterRepairResult?.status ?? initialRun.status;

    const changedPaths = gatherChangedPaths(repairHistory);
    const relevantPaths = await collectFilePaths(targetRoot, output.files, changedPaths);
    const fileMetadata = await computeFileChecksums(relevantPaths, targetRoot);
    const clarificationAnswers: ClarificationAnswer[] = clarifications
      ? clarifications.answers.map<ClarificationAnswer>(answer => ({ ...answer }))
      : [];
    const clarificationTelemetry = {
      asked: clarificationAsked,
      questions: clarificationQuestions,
      answers: clarificationAnswers,
      improvedSuccess: clarificationsUsed && finalStatus === "pass"
    };

    const repairSummary = buildRepairSummary(initialRun, repairHistory);
    const responseTestResults = {
      initial: initialRun,
      afterRepair: afterRepairResult
    };

    const meta = {
      created_at: new Date().toISOString(),
      source_prompt: effectivePrompt,
      original_prompt: originalPrompt,
      clarification: clarificationTelemetry,
      clarifications: {
        used: clarificationsUsed,
        answers: clarificationAnswers,
        asked: clarificationTelemetry.asked
      },
      notes: output.notes || [],
      testRuns: testRunEntries,
      repair: repairSummary,
      repairMetrics: buildRepairMetrics(repairHistory),
      repairHistory,
      files: fileMetadata,
      taskPlanUsed: false,
      decompositionQuality: null,
      subtaskResults: [],
      planningMetrics: null
    };

    // Write metadata with a retry in case the target directory was removed concurrently
    const metaPath = path.join(targetRoot, "_executor_meta.json");
    try {
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
    } catch (err: unknown) {
      const code = (err as { code?: string } | null | undefined)?.code;
      if (code === "ENOENT") {
        await fs.mkdir(targetRoot, { recursive: true });
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
      } else {
        throw err;
      }
    }

    await logEvent("generation_complete", {
      project: slug,
      status: finalStatus
    });

    setProgress(sessionId, "finalizing", 95);
    const responsePayload = {
      ok: true,
      project: slug,
      files_written: output.files.length,
      browse_url: `/output/${slug}/`,
      abs_path: targetRoot,
      testResults: responseTestResults,
      repairMetrics: meta.repairMetrics,
      repairHistory,
      repair: meta.repair,
      clarificationsUsed,
      generated: effectivePrompt,
      taskPlanUsed: false,
      taskPlan: null,
      planExecutionResult: null,
      timeEstimate: null,
      decompositionQuality: null,
      projectName
    };
    setProgress(sessionId, "finalizing", 100, undefined, true);
    return res.json(responsePayload);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/run-tests", async (req, res) => {
  try {
    const project: string = (req.body?.project || "").toString();
    if (!project) {
      return res.status(400).json({ error: "project required" });
    }
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try {
      await fs.access(projectRoot);
    } catch {
      return res.status(404).json({ error: "project not found" });
    }

    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
    return res.json(run);
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : "internal error";
    return res.status(500).json({ error: message });
  }
});

// List failed subtasks for a generated project (no regeneration)
app.get("/api/plan/:project/failed-subtasks", async (req, res) => {
  try {
    const { project } = req.params as { project: string };
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    const metaPath = path.join(projectRoot, "_executor_meta.json");
    const buf = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(buf) as { subtaskResults?: Array<{ subtaskId: string; status: string; notes?: string; testResult?: { status: string; errorMessage?: string } | null }> };
    const failed = (meta.subtaskResults ?? []).filter(r => r.status !== "completed").map(r => ({
      subtaskId: r.subtaskId,
      status: r.status,
      reason: r.testResult?.errorMessage || r.notes || "unknown"
    }));
    return res.json({ project: slug, failed });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

// Retest a specific subtask by re-running the project's tests (no regeneration)
app.post("/api/plan/:project/retest-subtask", async (req, res) => {
  try {
    const { project } = req.params as { project: string };
    const slug = slugify(project, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }
    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: "retest-subtask", status: run.status });
    return res.json({ project: slug, result: run });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

// Progress polling endpoint
app.get("/api/progress/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  const snap = getProgress(sessionId);
  if (!snap) {
    return res.status(404).json({ error: "session not found" });
  }
  return res.json(snap);
});

// Progress streaming via SSE
app.get("/api/progress/stream/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = () => {
    const snap = getProgress(sessionId);
    if (snap) {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify(snap)}\n\n`);
      if (snap.done) {
        clearInterval(timer);
        res.end();
      }
    }
  };
  const timer = setInterval(send, 1000);
  send();
  req.on('close', () => clearInterval(timer));
});

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
    }
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Executor MVP listening on http://localhost:${PORT}`);
    console.log(`UI: http://localhost:${PORT}/`);
  });
}

export { app };
import { validateFilesNonEmpty } from "./utils/validateFiles.js";
