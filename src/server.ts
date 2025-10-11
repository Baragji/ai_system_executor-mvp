import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import slugify from "slugify";

import { generateJSON } from "./llm/index.js";
import { withTraceContext } from "./llm/trace.js";
import { validateExecutorOutput } from "./executor/schema.js";
import { sanitizeExecutorOutput } from "./executor/outputProcessing.js";
import { seedTestsInFiles, seedTestsOnDisk, normalizeSeededTestsOnDisk } from "./utils/seedTests.js";
import { ensureJsonHealthOnDisk } from "./utils/normalizeHealth.js";
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
import type { PlanExecutionContext, SubtaskResult } from "./planning/types.js";
import {
  createAbortSignal,
  cleanupAbortSignal,
  throwIfAborted,
  abortSession,
  PausedError
} from "./orchestrator/abortSignal.js";
import { writeFixture, listFixtures, readFixture } from "./fixtures/index.js";
import type { MultiTurnContext } from "./repair/multiTurnRepair.js";
import {
  type CheckpointPayload,
  type PendingQuestion
} from "./orchestrator/checkpoints.js";
import { raiseInterrupt, type InterruptQuestionInput } from "./orchestrator/interrupts.js";
import { OrchestratorStateMachine, type OrchestratorState } from "./orchestrator/stateMachine.js";
import {
  resumeFromCheckpoint,
  ResumeValidationError,
  ResumeStateError,
  type ResumeAnswer
} from "./orchestrator/resume.js";
import { captureManifest, getManifest } from "./orchestrator/workspaceManifest.js";
import { buildResumePrompts } from "./orchestrator/resumePrompt.js";
import { StepQueue, type StepDescriptor, type StepHandler } from "./orchestrator/stepQueue.js";
import type {
  ExecutorSuccessResponse,
  PlanExecutionJobResult,
  PlanExecutionOptions,
  ResumeContextFixture,
  SingleExecutionOptions,
  SingleExecutionResult
} from "./orchestrator/executionTypes.js";
import type { DependencyValidationWarning } from "./validation/dependencyPreflight.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const PORT = Number(process.env.PORT || 3000);
const OUTPUT_DIR = path.resolve("output");
const PUBLIC_DIR = path.resolve("public");
// In-memory progress sessions for SSE/polling
type ProgressSnapshot = {
  stage: string;
  progress: number;
  data?: Record<string, unknown>;
  updatedAt: number;
  done?: boolean;
  state?: OrchestratorState;
  paused?: boolean;
  questions?: PendingQuestion[];
  checkpointUpdatedAt?: string;
  dependencyWarnings?: DependencyValidationWarning[];
};

interface OrchestrationSession {
  machine: OrchestratorStateMachine;
  paused: boolean;
  questions: PendingQuestion[];
  checkpointUpdatedAt?: string;
  projectSlug?: string;
  originalPrompt?: string;
  effectivePrompt?: string;
  projectName?: string;
  dependencyWarnings: DependencyValidationWarning[];
}

const progressSessions = new Map<string, ProgressSnapshot>();
const orchestrationSessions = new Map<string, OrchestrationSession>();
const PROGRESS_SESSION_TTL_MS = Number(process.env.PROGRESS_SESSION_TTL_MS ?? 15 * 60 * 1000);

function ensureOrchestrationSession(sessionId: string): OrchestrationSession {
  let session = orchestrationSessions.get(sessionId);
  if (!session) {
    session = {
      machine: new OrchestratorStateMachine(),
      paused: false,
      questions: [],
      dependencyWarnings: []
    };
    orchestrationSessions.set(sessionId, session);
  }
  return session;
}

function getOrchestrationSession(sessionId: string): OrchestrationSession | undefined {
  return orchestrationSessions.get(sessionId);
}

function removeOrchestrationSession(sessionId: string): void {
  orchestrationSessions.delete(sessionId);
}

function updateDependencyWarnings(sessionId: string, warnings: DependencyValidationWarning[]): void {
  const session = ensureOrchestrationSession(sessionId);
  session.dependencyWarnings = warnings.slice();

  const existing = progressSessions.get(sessionId);
  if (existing) {
    const baseData = existing.data ? { ...existing.data } : {};
    if (warnings.length > 0) {
      baseData.dependencyWarnings = warnings;
    } else {
      delete baseData.dependencyWarnings;
    }

    const sanitizedData = Object.keys(baseData).length > 0 ? baseData : undefined;
    const updated: ProgressSnapshot = {
      ...existing,
      data: sanitizedData,
      dependencyWarnings: warnings.length > 0 ? warnings.slice() : undefined,
      updatedAt: Date.now()
    };
    progressSessions.set(sessionId, updated);
  }
}

function mapStageToState(stage: string, done?: boolean): OrchestratorState | null {
  if (done) {
    return "DONE";
  }
  switch (stage) {
    case "analyzing":
      return "CLARIFYING";
    case "planning":
      return "PLANNING";
    case "generating":
    case "testing":
      return "GENERATING";
    case "finalizing":
      return "GENERATING";
    default:
      return null;
  }
}

function stateToStage(state: OrchestratorState): string {
  switch (state) {
    case "CLARIFYING":
      return "analyzing";
    case "PLANNING":
      return "planning";
    case "GENERATING":
      return "generating";
    case "PAUSED":
      return "paused";
    case "DONE":
      return "finalizing";
    default:
      return "analyzing";
  }
}

function purgeExpiredProgressSessions(now: number) {
  for (const [key, entry] of progressSessions.entries()) {
    if (entry.done && now - entry.updatedAt > PROGRESS_SESSION_TTL_MS) {
      progressSessions.delete(key);
      removeOrchestrationSession(key);
    }
  }
}

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

function getProgress(sessionId: string): ProgressSnapshot | null {
  const snap = progressSessions.get(sessionId) ?? null;
  if (!snap) {
    const session = orchestrationSessions.get(sessionId);
    if (!session) {
      return null;
    }
    return {
      stage: stateToStage(session.machine.state),
      progress: 0,
      updatedAt: Date.now(),
      done: false,
      state: session.machine.state,
      paused: session.paused,
      questions: session.questions,
      checkpointUpdatedAt: session.checkpointUpdatedAt
    };
  }
  return snap;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeInterruptQuestions(input: unknown): InterruptQuestionInput[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const supportedTypes = new Set(["AMBIGUITY", "APPROVAL", "BUDGET_RISK"]);
  const questions: InterruptQuestionInput[] = [];

  for (const entry of input) {
    if (!isPlainObject(entry)) continue;
    const questionRaw = typeof entry.question === "string" ? entry.question.trim() : "";
    if (!questionRaw) continue;

    const typeRaw = typeof entry.type === "string" ? entry.type.trim().toUpperCase() : "";
    const type = supportedTypes.has(typeRaw) ? (typeRaw as InterruptQuestionInput["type"]) : "AMBIGUITY";
    const id = typeof entry.id === "string" ? entry.id.trim() || undefined : undefined;
    const metadata = isPlainObject(entry.metadata) ? (entry.metadata as Record<string, unknown>) : undefined;

    questions.push({
      ...(id ? { id } : {}),
      question: questionRaw,
      type,
      ...(metadata ? { metadata } : {})
    });
  }

  return questions;
}

function normalizeResumeAnswers(input: unknown): ResumeAnswer[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const answers: ResumeAnswer[] = [];
  for (const entry of input) {
    if (!isPlainObject(entry)) continue;
    const questionId = typeof entry.questionId === "string" ? entry.questionId.trim() : "";
    const value = (entry as Record<string, unknown>).value;
    answers.push({ questionId, value });
  }
  return answers;
}

function snapshotFromSession(sessionId: string, fallback?: ProgressSnapshot | null): ProgressSnapshot {
  const session = ensureOrchestrationSession(sessionId);
  const existing = fallback ?? progressSessions.get(sessionId) ?? null;
  const baseStage = existing?.stage ?? stateToStage(session.machine.state);
  const warnings = session.dependencyWarnings;
  let dataWithWarnings: Record<string, unknown> | undefined = existing?.data
    ? { ...existing.data }
    : undefined;
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
  return {
    stage: baseStage,
    progress: existing?.progress ?? 0,
    data: dataWithWarnings,
    updatedAt: Date.now(),
    done: existing?.done ?? false,
    state: session.machine.state,
    paused: session.paused,
    questions: session.questions,
    checkpointUpdatedAt: session.checkpointUpdatedAt,
    dependencyWarnings: warnings.length > 0 ? warnings.slice() : undefined
  };
}

function openProgressStream(req: Request, res: Response, sessionId: string): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
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

  const close = () => {
    clearInterval(timer);
    res.end();
  };

  req.on("close", close);
  req.on("error", close);
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

// removed ensureMetaDirectory (cleaning done inline before runs)

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
    timestamp: "timestamp" in run && run.timestamp ? run.timestamp : new Date().toISOString(),
    errorMessage: "errorMessage" in run ? (run as RunResult).errorMessage : undefined
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
  { enforceTests, sessionId }: { enforceTests: boolean; sessionId?: string }
): Promise<ExecutorOutput> {
  // Check if execution was paused before making LLM call
  throwIfAborted(sessionId, "code_generation");
  
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt }
  ];

  const raw = await withTraceContext({ phase: "single", sessionId }, async () => {
    return generateJSON(messages, { sessionId });
  });
  if (sessionId) {
    throwIfAborted(sessionId, "post_single_llm");
  }
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

async function captureFixture(sessionId: string | undefined, slug: string, relPath: string, data: unknown) {
  if (!sessionId) return;
  try {
    await writeFixture(slug, sessionId, relPath, data);
  } catch (err) {
    console.warn("Failed to write fixture", relPath, err);
  }
}

function createPlanExecutionContext(
  params: {
    targetRoot: string;
    slug: string;
    effectivePrompt: string;
    clarifications?: ClarificationResponse;
    systemPrompt: string;
    sessionId?: string;
  }
): PlanExecutionContext {
  const { targetRoot, slug, effectivePrompt, clarifications, systemPrompt, sessionId } = params;

  return {
    projectPath: targetRoot,
    projectSlug: slug,
    sessionId,
    originalPrompt: effectivePrompt,
    clarifications,
    previousSubtaskResults: [],
    generateSubtaskOutput: async request => {
      // Check if execution was paused before generating subtask
      throwIfAborted(sessionId, `subtask_${request.subtask.id}`);
      
      const SUBTASK_TIMEOUT_MS = Number(process.env.SUBTASK_TIMEOUT_MS ?? 120000);
      const label = `subtask:${request.subtask.id}`;
      function raceWithAbort<T>(work: () => Promise<T>): Promise<T> {
        const signal = AbortSignal.timeout(SUBTASK_TIMEOUT_MS);
        return new Promise<T>((resolve, reject) => {
          const onAbort = async () => {
            const message = `${label} aborted after ${SUBTASK_TIMEOUT_MS}ms`;
            await logEvent("plan_abort", { phase: "subtask", subtask: request.subtask.id, reason: message });
            const err: Error & { code?: string } = new Error(message);
            err.code = "ABORT_ERR";
            reject(err);
          };
          signal.addEventListener("abort", onAbort, { once: true });
          work().then(
            v => { signal.removeEventListener("abort", onAbort); resolve(v); },
            e => { signal.removeEventListener("abort", onAbort); reject(e); }
          );
        });
      }
      const out = await withTraceContext({ projectSlug: slug, sessionId, phase: 'subtask', subtaskId: request.subtask.id }, async () =>
        raceWithAbort(() =>
          generateSubtaskOutputWithRetry(
            systemPrompt,
            request,
            false,
            undefined,
            (attempt, reason) =>
              logEvent("plan_progress", {
                project: slug,
                subtask: request.subtask.id,
                status: "retry",
                percent: 0,
                attempt,
                reason
              })
          )
        )
      );
      await captureFixture(sessionId, slug, path.join("subtasks", request.subtask.id, "output.json"), out);
      return out;
    },
    writeFiles: async (rootDir, files) => {
      await writeFiles(rootDir, files);
      await ensureDefaultExportForApp(rootDir);
      await ensureJsonHealthOnDisk(rootDir);
    },
    runTests: options =>
      runInSandbox({
        ...options,
        onDependencyWarnings: warnings => {
          const maybeSessionId = (options as { sessionId?: string }).sessionId;
          if (typeof maybeSessionId === "string" && maybeSessionId) {
            updateDependencyWarnings(maybeSessionId, warnings);
          }
        }
      }),
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
    onPromptBuilt: async request => {
      await captureFixture(sessionId, slug, path.join("subtasks", request.subtask.id, "prompt.json"), {
        subtaskId: request.subtask.id,
        title: request.subtask.title,
        prompt: request.prompt
      });
    },
    now: () => Date.now()
  };
}

async function executePlanFlow(params: PlanExecutionOptions): Promise<PlanExecutionJobResult> {
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

  if (sessionId) {
    ensureOrchestrationSession(sessionId).projectSlug = slug;
  }

  // Clean project directory to avoid stale files influencing plan runs
  try { await fs.rm(targetRoot, { recursive: true, force: true }); } catch (_e) { void _e; }
  await fs.mkdir(targetRoot, { recursive: true });
  await logEvent("generation_start", { project: slug, mode: "plan" });

  const context = createPlanExecutionContext({
    targetRoot,
    slug,
    effectivePrompt,
    clarifications,
    systemPrompt,
    sessionId
  });

  // Hook progress updates into session tracking
  const originalOnProgress = context.onProgressUpdate;
  context.onProgressUpdate = (snapshot, result) => {
    setProgress(sessionId, "generating", Math.max(30, Math.min(90, Number(snapshot.percentComplete) * 0.9)), { completed: snapshot.completedSubtasks });
    originalOnProgress?.(snapshot, result);
  };

  const planExecutionResult = await executeTaskPlan(plan, context);
  // Save plan fixture for replay
  await captureFixture(sessionId, slug, "plan.json", plan);
  // Capture clarify/effective prompt and questions
  await captureFixture(sessionId, slug, "clarify.json", {
    originalPrompt,
    effectivePrompt,
    clarifications,
    clarificationQuestions,
    clarificationsAsked
  });
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
  // Ensure seed tests exist on disk for plan-based generations and normalize runner-specific seeds
  await seedTestsOnDisk(targetRoot);
  await ensureJsonHealthOnDisk(targetRoot);
  await normalizeSeededTestsOnDisk(targetRoot);

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

async function runSingleExecution(options: SingleExecutionOptions): Promise<SingleExecutionResult> {
  const {
    sessionId,
    systemPrompt,
    executorPrompt,
    originalPrompt,
    projectNameHint,
    clarifications,
    clarificationsUsed,
    clarificationQuestions,
    clarificationAsked,
    preserveWorkspace,
    slugOverride,
    resumeFixture,
    tracePhase,
    progressMetadata
  } = options;

  const traceSlug = slugOverride ?? (slugify(projectNameHint || "generated-project", { lower: true, strict: true }) || "generated-project");

  try {
    // Only set progress to planning if not resuming or if state allows it
    if (!resumeFixture && sessionId) {
      const session = ensureOrchestrationSession(sessionId);
      // Only transition to planning if we're in a valid state (CLARIFYING)
      if (session.machine.state === "CLARIFYING") {
        setProgress(sessionId, "planning", 30, progressMetadata);
      }
    } else if (!sessionId) {
      // No session tracking, safe to call setProgress
      setProgress(sessionId, "planning", 30, progressMetadata);
    }
    // If resuming, skip setProgress to avoid invalid transitions
    let output: ExecutorOutput;
    try {
      output = await withTraceContext({ projectSlug: traceSlug, sessionId, phase: tracePhase ?? "single" }, async () =>
        generateExecutorOutputFromPrompt(systemPrompt, executorPrompt, { enforceTests: true, sessionId })
      );
    } catch (rawError) {
      if (rawError instanceof PausedError) {
        throw rawError;
      }
      const message = rawError instanceof Error ? rawError.message : "Model failed";
      setProgress(sessionId, "finalizing", 100, { error: message }, true);
      const wrapped = new Error(message);
      (wrapped as { statusCode?: number }).statusCode = 422;
      throw wrapped;
    }

    const projectName = projectNameHint?.trim() || output.project_name || "generated-project";
    const slug = slugOverride ?? slugify(projectName, { lower: true, strict: true });
    const targetRoot = path.join(OUTPUT_DIR, slug);

    if (sessionId) {
      const session = ensureOrchestrationSession(sessionId);
      session.projectSlug = slug;
      session.projectName = projectName;
      session.originalPrompt = session.originalPrompt ?? originalPrompt;
      session.effectivePrompt = executorPrompt;
    }

    if (!preserveWorkspace) {
      try {
        await fs.rm(targetRoot, { recursive: true, force: true });
      } catch (_e) {
        void _e;
      }
    }
    await fs.mkdir(targetRoot, { recursive: true });

    if (resumeFixture && sessionId) {
      try {
        await captureFixture(sessionId, slug, path.join("resume", "context.json"), resumeFixture);
      } catch (error) {
        console.warn("Failed to capture resume context fixture", error);
      }
    }

    await logEvent("generation_start", { project: slug, mode: tracePhase ?? "single" });

    if (sessionId) {
      updateDependencyWarnings(sessionId, []);
    }

    setProgress(sessionId, "generating", 55, progressMetadata);

    output.files = seedTestsInFiles(output.files);
    await writeFiles(targetRoot, output.files);
    await ensureDefaultExportForApp(targetRoot);
    await ensureJsonHealthOnDisk(targetRoot);
    await normalizeSeededTestsOnDisk(targetRoot);

    setProgress(sessionId, "testing", 80, progressMetadata);
    const initialRun = await runInSandbox({
      projectRoot: targetRoot,
      projectSlug: slug,
      sessionId,
      onDependencyWarnings: warnings => {
        if (sessionId) {
          updateDependencyWarnings(sessionId, warnings);
        }
      }
    });
    await logEvent("test_run", { project: slug, stage: "initial", status: initialRun.status });
    await captureFixture(sessionId, slug, path.join("tests", "initial.json"), initialRun);

    const repairHistory = await multiTurnRepair({
      projectPath: targetRoot,
      projectSlug: slug,
      originalPrompt: executorPrompt,
      generatedFiles: output.files.map(file => file.path),
      initialTestResult: initialRun,
      sessionId
    });
    await captureFixture(sessionId, slug, path.join("repair", "history.json"), repairHistory);

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

    const afterRepairResult: RunResult | null =
      initialRun.status === "pass" ? null : (repairHistory.attempts.at(-1)?.testResult as RunResult | undefined) ?? null;
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
      source_prompt: executorPrompt,
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
      status: finalStatus,
      mode: tracePhase ?? "single"
    });

    setProgress(sessionId, "finalizing", 95, progressMetadata);
    const responsePayload: ExecutorSuccessResponse = {
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
      generated: executorPrompt,
      taskPlanUsed: false,
      taskPlan: null,
      planExecutionResult: null,
      timeEstimate: null,
      decompositionQuality: null,
      projectName
    };
    setProgress(sessionId, "finalizing", 100, progressMetadata, true);

    if (sessionId) {
      cleanupAbortSignal(sessionId);
    }

    return { response: responsePayload, slug, targetRoot };
  } catch (error) {
    if (error instanceof PausedError) {
      if (sessionId) {
        cleanupAbortSignal(sessionId);
      }
    }
    throw error;
  }
}

type PlanStepPayload = {
  systemPrompt: string;
  effectivePrompt: string;
  originalPrompt: string;
  clarifications?: ClarificationResponse;
  clarificationsUsed: boolean;
  clarificationQuestions: ClarificationQuestion[];
  clarificationAsked: boolean;
  projectNameInput: string;
  queueMetadata?: Record<string, unknown>;
};

type SingleStepPayload = {
  singleOptions: SingleExecutionOptions;
};

const planStepHandler: StepHandler = async ({
  sessionId,
  payload,
  queueMode
}) => {
  const data = (payload ?? {}) as PlanStepPayload;
  if (queueMode === "bullmq" && data.queueMetadata) {
    setProgress(sessionId, "planning", 20, data.queueMetadata);
  }

  try {
    throwIfAborted(sessionId, "decomposition");

    const baseSlugPre = slugify(data.projectNameInput || "session", { lower: true, strict: true }) || "session";
    const plan = await withTraceContext({ projectSlug: baseSlugPre, sessionId, phase: "decompose" }, async () =>
      decomposeTask(data.effectivePrompt, data.clarifications)
    );
    const quality = validateDecomposition(plan, data.effectivePrompt);
    if (quality.score < 70) {
      return { status: "skipped" };
    }

    const planProjectName = data.projectNameInput || plan.originalPrompt || "planned-project";
    const slug = slugify(planProjectName, { lower: true, strict: true }) || `planned-${Date.now()}`;
    const targetRoot = path.join(OUTPUT_DIR, slug);

    const planOptions: PlanExecutionOptions = {
      plan,
      planQuality: quality.score,
      targetRoot,
      slug,
      effectivePrompt: data.effectivePrompt,
      originalPrompt: data.originalPrompt,
      clarifications: data.clarifications,
      clarificationsUsed: data.clarificationsUsed,
      systemPrompt: data.systemPrompt,
      clarificationQuestions: data.clarificationQuestions,
      clarificationsAsked: data.clarificationAsked,
      projectName: planProjectName,
      sessionId
    };

    const planResult = await executePlanFlow(planOptions);
    const response = planResult.response as ExecutorSuccessResponse;
    return { status: "completed", data: { response, slug, targetRoot }, stop: true };
  } catch (error) {
    if (error instanceof PausedError) {
      throw error;
    }
    console.warn("Planning execution failed, falling back to single execution", error);
    try {
      const session = ensureOrchestrationSession(sessionId);
      if (session.machine.state === "PLANNING") {
        session.machine.transition("GENERATING", { reason: "fallback_to_single_after_plan_error" });
      }
    } catch (transitionErr) {
      console.warn("Could not transition state during plan fallback:", transitionErr);
    }
    return { status: "skipped" };
  }
};

const singleStepHandler: StepHandler = async ({ payload, queueMode }) => {
  const data = (payload ?? {}) as SingleStepPayload;
  if (!data.singleOptions) {
    throw new Error("singleOptions payload required for single step");
  }

  const baseOptions = data.singleOptions;
  const options: SingleExecutionOptions = {
    ...baseOptions,
    progressMetadata: baseOptions.progressMetadata ? { ...baseOptions.progressMetadata } : undefined
  };

  if (queueMode === "bullmq") {
    const queuedMeta = { ...(options.progressMetadata ?? {}), queued: true, mode: "queue" };
    options.progressMetadata = queuedMeta;
    if (options.sessionId) {
      setProgress(options.sessionId, "planning", 20, queuedMeta);
    }
  }

  const result = await runSingleExecution(options);
  return {
    status: "completed",
    data: { response: result.response, slug: result.slug, targetRoot: result.targetRoot },
    stop: true
  };
};

const stepQueue = await StepQueue.create();
stepQueue.registerHandler("plan", planStepHandler);
stepQueue.registerHandler("single", singleStepHandler);

async function resolveSessionPrompts(
  sessionId: string,
  session: OrchestrationSession | undefined,
  projectSlug: string
): Promise<{ original: string; effective?: string }> {
  const cachedOriginal = session?.originalPrompt;
  const cachedEffective = session?.effectivePrompt;
  if (cachedOriginal && cachedEffective) {
    return { original: cachedOriginal, effective: cachedEffective };
  }
  if (cachedOriginal && !cachedEffective) {
    return { original: cachedOriginal, effective: cachedEffective ?? undefined };
  }
  try {
    const clarify = await readFixture<{ originalPrompt?: string; effectivePrompt?: string }>(projectSlug, sessionId, "clarify.json");
    const original = cachedOriginal ?? clarify.originalPrompt ?? "<unknown>";
    const effective = cachedEffective ?? clarify.effectivePrompt;
    return { original, effective };
  } catch {
    return { original: cachedOriginal ?? "<unknown>", effective: cachedEffective ?? undefined };
  }
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
  const sessionId: string | undefined = typeof req.body?.sessionId === "string" ? req.body.sessionId : undefined;
  const wantsSse = typeof req.headers.accept === "string" && req.headers.accept.includes("text/event-stream");
  let sseStarted = false;

  const ensureSse = () => {
    if (!wantsSse || sseStarted) {
      return;
    }
    sseStarted = true;
    res.status(202);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
  };

  const sendSse = (event: string, data: unknown) => {
    if (!wantsSse) {
      return;
    }
    ensureSse();
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const closeSse = () => {
    if (!wantsSse) {
      return;
    }
    ensureSse();
    res.end();
  };

  try {
    if (!sessionId) {
      return res.status(400).json({ error: "session id required" });
    }

    createAbortSignal(sessionId);

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

    await captureFixture(
      sessionId,
      slugify(projectNameRaw || "session", { lower: true, strict: true }) || "session",
      "clarify.json",
      {
        originalPrompt,
        effectivePrompt,
        clarifications
      }
    );

    const systemPrompt = await fs.readFile("src/executor/systemPrompt.md", "utf-8");
    const projectNameInput = typeof projectNameRaw === "string" ? projectNameRaw.trim() : "";
    const session = sessionId ? ensureOrchestrationSession(sessionId) : undefined;
    if (session) {
      session.originalPrompt = originalPrompt;
      session.effectivePrompt = effectivePrompt;
      session.projectName = projectNameInput || session.projectName;
    }

    const storedQuestions = consumeClarificationQuestions(originalPrompt) ?? [];
    let clarificationQuestions = storedQuestions;
    let clarificationAsked = clarificationQuestions.length > 0;
    if (!clarificationAsked && clarifications && clarifications.answers.length > 0) {
      const missingAgain = detectMissing(originalPrompt);
      clarificationQuestions = generateQuestions(missingAgain, originalPrompt);
      clarificationAsked = clarificationQuestions.length > 0;
    }

    const queueMetadata = stepQueue.mode === "bullmq" ? { queued: true, mode: "queue" } : undefined;

    const steps: StepDescriptor[] = [];

    if (isComplexPrompt(effectivePrompt, clarifications)) {
      const planPayload: PlanStepPayload = {
        systemPrompt,
        effectivePrompt,
        originalPrompt,
        clarifications,
        clarificationsUsed,
        clarificationQuestions,
        clarificationAsked,
        projectNameInput,
        queueMetadata
      };
      steps.push({ type: "plan", payload: planPayload, stopOnSuccess: true, optional: true });
    }

    const singleOptions: SingleExecutionOptions = {
      sessionId,
      systemPrompt,
      executorPrompt: effectivePrompt,
      originalPrompt,
      projectNameHint: projectNameInput,
      clarifications,
      clarificationsUsed,
      clarificationQuestions,
      clarificationAsked,
      preserveWorkspace: false,
      tracePhase: "single"
    };

    if (queueMetadata) {
      singleOptions.progressMetadata = { ...queueMetadata };
    }

    const singlePayload: SingleStepPayload = { singleOptions };
    steps.push({ type: "single", payload: singlePayload, stopOnSuccess: true });

    const workflow = await stepQueue.runWorkflow(sessionId, steps, {
      onStep: step => {
        sendSse("step", {
          sessionId,
          stepId: step.stepId,
          stepType: step.stepType,
          status: step.status,
          sequence: step.sequence,
          stop: Boolean(step.stop),
          timestamp: new Date().toISOString()
        });
      }
    });

    const finalStep = workflow.last;
    const responsePayload = finalStep?.data?.response as ExecutorSuccessResponse | undefined;
    if (!responsePayload) {
      throw new Error("Execution pipeline did not produce a response payload");
    }

    if (wantsSse) {
      sendSse("completed", { sessionId, response: responsePayload });
      closeSse();
      return;
    }

    return res.json(responsePayload);
  } catch (err: unknown) {
    if (err instanceof PausedError) {
      console.log(`Execution paused for session ${err.sessionId} during ${err.phase}`);
      const workflowSteps = sessionId ? await stepQueue.getWorkflow(sessionId) : null;
      const pausedRecord = workflowSteps?.slice().reverse().find(step => step.status === "paused");
      const stepMeta = pausedRecord
        ? { stepId: pausedRecord.stepId, stepType: pausedRecord.stepType, sequence: pausedRecord.sequence }
        : {
            stepId: err.stepId,
            stepType: err.stepType,
            sequence: err.sequence
          };
      const payload = {
        paused: true,
        sessionId: err.sessionId,
        phase: err.phase,
        message: err.message,
        ...stepMeta
      };

      if (wantsSse) {
        res.status(202);
        sendSse("paused", payload);
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

    return res.status(500).json({ error: message });
  } finally {
    if (sessionId) {
      cleanupAbortSignal(sessionId);
    }
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

// List available fixtures for a project
app.get("/api/fixtures/:project", async (req, res) => {
  try {
    const { project } = req.params as { project: string };
    const slug = slugify(project, { lower: true, strict: true });
    const sessions = await listFixtures(slug);
    return res.json({ project: slug, sessions });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

// Replay repair from captured context without regeneration
app.post("/api/replay/repair", async (req, res) => {
  try {
    const projectRaw: string = (req.body?.project || "").toString();
    const sessionId: string = (req.body?.sessionId || "").toString();
    if (!projectRaw || !sessionId) {
      return res.status(400).json({ error: "project and sessionId required" });
    }
    const slug = slugify(projectRaw, { lower: true, strict: true });
    const ctx = await readFixture<MultiTurnContext>(slug, sessionId, path.join("repair", "context.json")).catch(() => null);
    if (!ctx) {
      return res.status(404).json({ error: "repair context fixture not found" });
    }
    // Re-run repair with current logic
    const history = await multiTurnRepair(ctx);
    return res.json({ project: slug, sessionId, history });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
    return res.status(500).json({ error: message });
  }
});

// Replay a single subtask by applying saved files and running tests
app.post("/api/replay/subtask", async (req, res) => {
  try {
    const projectRaw: string = (req.body?.project || "").toString();
    const sessionId: string = (req.body?.sessionId || "").toString();
    const subtaskId: string = (req.body?.subtaskId || "").toString();
    if (!projectRaw || !sessionId || !subtaskId) {
      return res.status(400).json({ error: "project, sessionId, and subtaskId required" });
    }
    const slug = slugify(projectRaw, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);
    try { await fs.access(projectRoot); } catch { return res.status(404).json({ error: "project not found" }); }

    type FixtureOutput = { files?: { path: string; contents: string }[] };
    const output = await readFixture<FixtureOutput>(slug, sessionId, path.join("subtasks", subtaskId, "output.json")).catch(() => null);
    if (!output || !Array.isArray(output.files)) {
      return res.status(404).json({ error: "subtask output fixture not found or invalid" });
    }
    await writeFiles(projectRoot, output.files);
    await ensureDefaultExportForApp(projectRoot);

    const run = await runInSandbox({ projectRoot, projectSlug: slug });
    await logEvent("test_run", { project: slug, stage: `replay-subtask:${subtaskId}` , status: run.status });
    return res.json({ ok: true, project: slug, subtaskId, result: run });
  } catch (err) {
    const message = (err as Error).message || 'internal error';
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

// Pause/resume session orchestration
app.post("/api/sessions/:id/pause", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const sessionId = id.trim();
    if (!sessionId) {
      return res.status(400).json({ error: "session id required" });
    }

    const current = getProgress(sessionId);
    if (!current) {
      return res.status(404).json({ error: "session not found" });
    }

    const session = ensureOrchestrationSession(sessionId);
    if (session.paused) {
      return res.status(409).json({ error: "session already paused" });
    }

    const reasonRaw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const reason = reasonRaw || "Manual pause requested";

    const normalizedQuestions = normalizeInterruptQuestions(req.body?.questions);
    const defaultQuestion: InterruptQuestionInput = {
      question: "Please provide guidance to continue execution.",
      type: "AMBIGUITY"
    };
    const questions: InterruptQuestionInput[] = normalizedQuestions.length > 0
      ? normalizedQuestions
      : [defaultQuestion];

    let machineContext: Record<string, unknown> | undefined;
    if (req.body?.context !== undefined) {
      if (req.body.context === null || isPlainObject(req.body.context)) {
        machineContext = req.body.context ?? undefined;
      } else {
        return res.status(400).json({ error: "context must be a plain object" });
      }
    }

    let checkpointPayload: Omit<CheckpointPayload, "pendingQuestions"> | undefined;
    if (req.body?.payload !== undefined) {
      if (!isPlainObject(req.body.payload)) {
        return res.status(400).json({ error: "payload must be a plain object" });
      }
      checkpointPayload = req.body.payload as Omit<CheckpointPayload, "pendingQuestions">;
    }

    if (session.projectSlug) {
      checkpointPayload = {
        ...(checkpointPayload ?? {}),
        executor: {
          ...(checkpointPayload?.executor ?? {}),
          projectSlug: session.projectSlug
        }
      };
    }

    // Abort the in-flight execution
    const aborted = abortSession(sessionId);
    console.log(`[Pause] Session ${sessionId} abort signal sent: ${aborted}`);

    const checkpoint = await raiseInterrupt({
      sessionId,
      machine: session.machine,
      reason,
      questions,
      machineContext,
      checkpointPayload
    });

    session.paused = true;
    session.questions = checkpoint.payload?.pendingQuestions ?? [];
    session.checkpointUpdatedAt = checkpoint.updatedAt;

    if (session.projectSlug) {
      try {
        await captureManifest(sessionId, session.projectSlug);
      } catch (error) {
        console.warn(`[Pause] Failed to capture manifest for session ${sessionId}:`, error);
      }
    }

    const snapshot = snapshotFromSession(sessionId, current);
    snapshot.stage = stateToStage(session.machine.state);
    snapshot.paused = true;
    snapshot.questions = session.questions;
    snapshot.checkpointUpdatedAt = checkpoint.updatedAt;
    snapshot.done = false;
    snapshot.updatedAt = Date.now();
    progressSessions.set(sessionId, snapshot);

    return res.status(201).json({ checkpoint });
  } catch (error) {
    if (error instanceof Error && /Cannot raise interrupt/.test(error.message)) {
      return res.status(409).json({ error: error.message });
    }
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "unknown error" });
  }
});

app.post("/api/sessions/:id/resume", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const sessionId = id.trim();
    if (!sessionId) {
      return res.status(400).json({ error: "session id required" });
    }

    const session = getOrchestrationSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "session not found" });
    }

    const answers = normalizeResumeAnswers(req.body?.answers);
    const reasonRaw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    const adjustmentRaw = typeof req.body?.adjustment === "string" ? req.body.adjustment.trim() : "";

    const result = await resumeFromCheckpoint(sessionId, answers, {
      machine: session.machine,
      reason: reasonRaw || undefined
    });

    session.paused = false;
    session.questions = [];
    session.checkpointUpdatedAt = result.checkpoint.updatedAt;
    session.machine = result.machine;
    const resumedSlug = result.checkpoint.payload?.executor?.projectSlug;
    if (typeof resumedSlug === "string" && resumedSlug.trim()) {
      session.projectSlug = resumedSlug.trim();
    }

    const fallbackSlug = slugify(sessionId, { lower: true, strict: true }) || sessionId;
    const projectSlug = (session.projectSlug ?? resumedSlug ?? fallbackSlug).trim();
    session.projectSlug = projectSlug;

    const manifest = await getManifest(sessionId);
    const systemPrompt = await fs.readFile("src/executor/systemPrompt.md", "utf-8");
    const promptSnapshot = await resolveSessionPrompts(sessionId, session, projectSlug);
    const prompts = buildResumePrompts(systemPrompt, {
      projectSlug,
      originalPrompt: promptSnapshot.original,
      effectivePrompt: promptSnapshot.effective,
      adjustment: adjustmentRaw,
      checkpoint: result.checkpoint,
      answeredQuestions: result.answeredQuestions,
      manifest
    });

    session.effectivePrompt = prompts.userPrompt;

    const snapshot = snapshotFromSession(sessionId, progressSessions.get(sessionId) ?? null);
    snapshot.stage = stateToStage(session.machine.state);
    snapshot.paused = false;
    snapshot.questions = [];
    snapshot.checkpointUpdatedAt = result.checkpoint.updatedAt;
    snapshot.updatedAt = Date.now();
    snapshot.done = false;
    const resumeData: Record<string, unknown> = {
      ...(snapshot.data ?? {}),
      resume: true,
      ...(adjustmentRaw ? { adjustment: adjustmentRaw } : {})
    };
    if (session.dependencyWarnings.length > 0) {
      resumeData.dependencyWarnings = session.dependencyWarnings;
      snapshot.dependencyWarnings = session.dependencyWarnings.slice();
    } else {
      delete resumeData.dependencyWarnings;
      snapshot.dependencyWarnings = undefined;
    }
    snapshot.data = resumeData;
    progressSessions.set(sessionId, snapshot);

    const resumeFixture: ResumeContextFixture = {
      adjustment: adjustmentRaw || undefined,
      answeredQuestions: result.answeredQuestions.map(item => ({
        id: item.id,
        question: item.question,
        answer: item.answer
      })),
      manifestSummary: manifest?.summary
        ? {
            totalFiles: manifest.summary.totalFiles,
            totalSize: manifest.summary.totalSize,
            topFiles: manifest.summary.topFiles.slice(0, 10)
          }
        : null,
      checkpoint: { state: result.checkpoint.state, updatedAt: result.checkpoint.updatedAt },
      prompt: { system: prompts.systemPrompt, user: prompts.userPrompt }
    };

    const progressMetadata = {
      resume: true,
      ...(adjustmentRaw ? { adjustment: adjustmentRaw } : {}),
      ...(session.dependencyWarnings.length > 0
        ? { dependencyWarnings: session.dependencyWarnings }
        : {})
    };

    const providerConfigured = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

    if (!providerConfigured) {
      try {
        await captureFixture(sessionId, projectSlug, path.join("resume", "context.json"), resumeFixture);
      } catch (error) {
        console.warn("[Resume] Failed to persist resume context without provider:", error);
      }
      console.warn(`[Resume] No LLM provider configured; skipping automatic resume for ${sessionId}`);
    } else {
      createAbortSignal(sessionId);

      const resumeOptions: SingleExecutionOptions = {
        sessionId,
        systemPrompt: prompts.systemPrompt,
        executorPrompt: prompts.userPrompt,
        originalPrompt: promptSnapshot.original,
        projectNameHint: session.projectName ?? projectSlug,
        clarifications: undefined,
        clarificationsUsed: false,
        clarificationQuestions: [],
        clarificationAsked: false,
        preserveWorkspace: true,
        slugOverride: projectSlug,
        resumeFixture,
        tracePhase: "resume",
        progressMetadata
      };

      if (stepQueue.mode === "bullmq") {
        resumeOptions.progressMetadata = { ...progressMetadata, queued: true, mode: "queue" };
      }

      const plannedSteps = await stepQueue.getPlannedSteps(sessionId);

      type PlanEntry = {
        order: number;
        stepType: string;
        optional: boolean;
        stopOnSuccess: boolean;
        payload?: Record<string, unknown>;
      };

      const orderedPlan: PlanEntry[] = plannedSteps && plannedSteps.length > 0
        ? plannedSteps
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(entry => ({
              order: entry.order,
              stepType: entry.stepType,
              optional: entry.optional,
              stopOnSuccess: entry.stopOnSuccess,
              payload: entry.payload
                ? (JSON.parse(JSON.stringify(entry.payload)) as Record<string, unknown>)
                : undefined
            }))
        : [
            {
              order: 0,
              stepType: "single",
              optional: false,
              stopOnSuccess: true,
              payload: { singleOptions: resumeOptions }
            }
          ];

      const descriptors: StepDescriptor[] = orderedPlan.map(entry => {
        const basePayload = entry.payload ? { ...entry.payload } : undefined;
        if (entry.stepType === "single") {
          const payload: Record<string, unknown> = basePayload ? { ...basePayload } : {};
          payload.singleOptions = resumeOptions;
          return {
            type: entry.stepType as StepDescriptor["type"],
            payload,
            optional: entry.optional,
            stopOnSuccess: entry.stopOnSuccess
          };
        }
        return {
          type: entry.stepType as StepDescriptor["type"],
          payload: basePayload,
          optional: entry.optional,
          stopOnSuccess: entry.stopOnSuccess
        };
      });

      stepQueue
        .runWorkflow(sessionId, descriptors, { resume: true })
        .catch(error => {
          if (error instanceof PausedError) {
            return;
          }
          const message = error instanceof Error ? error.message : "resume execution failed";
          console.error(`[Resume] Execution failed for session ${sessionId}:`, error);
          setProgress(sessionId, "finalizing", 100, { resume: true, error: message }, true);
        })
        .finally(() => {
          cleanupAbortSignal(sessionId);
        });
    }

    return res.json({
      checkpoint: result.checkpoint,
      answeredQuestions: result.answeredQuestions,
      resumed: true,
      dependencyWarnings: session.dependencyWarnings.slice()
    });
  } catch (error) {
    if (error instanceof ResumeValidationError) {
      return res.status(400).json({ error: error.message, issues: error.issues });
    }
    if (error instanceof ResumeStateError) {
      return res.status(409).json({ error: error.message });
    }
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "unknown error" });
  }
});

app.get("/api/progress/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  openProgressStream(req, res, sessionId);
});

// JSON snapshot endpoint retained for polling fallbacks
app.get("/api/progress/snapshot/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  const snap = getProgress(sessionId);
  if (!snap) {
    return res.status(404).json({ error: "session not found" });
  }
  return res.json(snap);
});

// Legacy SSE alias for compatibility
app.get("/api/progress/stream/:sessionId", (req, res) => {
  const { sessionId } = req.params as { sessionId: string };
  openProgressStream(req, res, sessionId);
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
// Test helpers for progress TTL logic
export const __progressTest = {
  set(sessionId: string, entry: ProgressSnapshot) { progressSessions.set(sessionId, entry); },
  get(sessionId: string) { return progressSessions.get(sessionId) ?? null; },
  purge(now: number) { purgeExpiredProgressSessions(now); },
  ttl() { return PROGRESS_SESSION_TTL_MS; },
  clear() { progressSessions.clear(); }
};

export const __orchestratorTest = {
  ensure(sessionId: string) {
    return ensureOrchestrationSession(sessionId).machine;
  },
  clear() {
    orchestrationSessions.clear();
  }
};
import { validateFilesNonEmpty } from "./utils/validateFiles.js";
