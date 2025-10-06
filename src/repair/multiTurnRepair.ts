import fs from "node:fs/promises";
import path from "node:path";

import { generateJSON, type LLMMessage } from "../llm/index.js";
import { runInSandbox } from "../runner/runInSandbox.js";
import { buildRepairPrompt } from "./buildRepairPrompt.js";
import { analyzeFailure } from "./analyzeFailure.js";
import { generateDiff } from "./generateDiff.js";
import {
  validateRepairHistory,
  type FailureAnalysis,
  type RepairAttemptRecord,
  type RepairHistory
} from "../contracts/repairHistoryValidator.js";
import {
  validateRepairArtifact,
  type RepairArtifactDescription,
  type RunResult
} from "../contracts/validators.js";
import type { ExecutorFile } from "../executor/types.js";

export interface MultiTurnContext {
  projectPath: string;
  projectSlug: string;
  originalPrompt: string;
  generatedFiles: ExecutorFile[];
  initialTestResult: RunResult;
  maxAttempts?: number;
}

interface RepairProposal {
  artifacts: RepairArtifactDescription[];
  files: ExecutorFile[];
  notes: string[];
}

const SYSTEM_PROMPT = `You are an expert software repair assistant. You receive the original build prompt, the failing test summary, and the original files. Respond with strict JSON describing file updates to apply. JSON format: {"artifacts":[{"path":"string","action":"modify|add|delete","description":"string"}],"files":[{"path":"string","contents":"string"}],"notes":string[]}. When deleting a file include the artifact with action="delete" and omit it from files.`;

function ensureInsideProject(projectRoot: string, candidate: string): string {
  const resolved = path.resolve(projectRoot, candidate);
  if (!resolved.startsWith(path.resolve(projectRoot))) {
    throw new Error(`Path escapes project root: ${candidate}`);
  }
  return resolved;
}

async function readFileSafe(target: string): Promise<string | null> {
  try {
    return await fs.readFile(target, "utf-8");
  } catch (err) {
    const error = err as { code?: string };
    if (error?.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function analyzeRun(projectRoot: string, run: RunResult): Promise<FailureAnalysis | null> {
  if (run.status === "pass") {
    return null;
  }

  if (!run.logsPath) {
    return null;
  }

  try {
    const logs = await fs.readFile(path.join(projectRoot, run.logsPath), "utf-8");
    if (!logs.trim()) {
      return null;
    }
    return analyzeFailure(logs);
  } catch {
    return null;
  }
}

function convertRunResult(run: RunResult): RepairAttemptRecord["testResult"] {
  return {
    status: run.status,
    passCount: run.passCount,
    failCount: run.failCount,
    durationMs: run.durationMs,
    logsPath: run.logsPath,
    summary: run.errorMessage,
    errorMessage: run.errorMessage
  };
}

async function requestRepairPlan(prompt: string): Promise<RepairProposal> {
  const messages: LLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt }
  ];

  const raw = await generateJSON(messages);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Repair model returned invalid JSON: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Repair model payload was not an object");
  }

  const value = parsed as Record<string, unknown>;
  const artifactList = Array.isArray(value.artifacts) ? value.artifacts : [];
  const fileList = Array.isArray(value.files) ? value.files : [];
  const notes = Array.isArray(value.notes)
    ? value.notes.filter((entry): entry is string => typeof entry === "string")
    : [];

  const artifacts: RepairArtifactDescription[] = [];
  for (const entry of artifactList) {
    const validation = validateRepairArtifact(entry);
    if (!validation.ok) {
      throw new Error(`Invalid repair artifact: ${validation.errors}`);
    }
    artifacts.push(validation.value);
  }

  const files: ExecutorFile[] = fileList
    .filter((item): item is ExecutorFile => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return typeof candidate.path === "string" && typeof candidate.contents === "string";
    })
    .map(item => ({
      path: (item as ExecutorFile).path,
      contents: (item as ExecutorFile).contents
    }));

  return { artifacts, files, notes };
}

async function applyArtifacts(
  projectRoot: string,
  proposal: RepairProposal
): Promise<{ changedFiles: string[]; appliedFiles: number }> {
  const fileMap = new Map(proposal.files.map(file => [file.path, file.contents] as const));
  const changed = new Set<string>();
  let applied = 0;

  for (const artifact of proposal.artifacts) {
    const targetPath = ensureInsideProject(projectRoot, artifact.path);

    if (artifact.action === "delete") {
      const original = await readFileSafe(targetPath);
      if (original !== null) {
        generateDiff(original, "", artifact.path);
      }
      await fs.rm(targetPath, { force: true });
      changed.add(artifact.path);
      applied += 1;
      continue;
    }

    const contents = fileMap.get(artifact.path);
    if (typeof contents !== "string") {
      throw new Error(`Missing contents for ${artifact.path}`);
    }

    const original = await readFileSafe(targetPath);
    generateDiff(original ?? "", contents, artifact.path);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, contents, "utf-8");
    changed.add(artifact.path);
    applied += 1;
  }

  return { changedFiles: Array.from(changed), appliedFiles: applied };
}

function toPreviousAttempts(attempts: RepairAttemptRecord[]): Parameters<typeof buildRepairPrompt>[0]["previousAttempts"] {
  return attempts.map(attempt => ({
    attemptNumber: attempt.number as 1 | 2 | 3 | 4,
    status: attempt.testResult.status,
    summary: attempt.summary ?? "",
    failureAnalysis: attempt.failureAnalysis ?? null,
    durationMs: attempt.durationMs
  }));
}

function createErrorAttempt(
  attemptNumber: number,
  startedAt: Date,
  cumulative: number,
  error: string
): RepairAttemptRecord {
  const finishedAt = new Date();
  const duration = finishedAt.getTime() - startedAt.getTime();

  return {
    number: attemptNumber,
    status: "error",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    changedFiles: [],
    summary: `Repair attempt failed: ${error}`,
    testResult: {
      status: "error",
      passCount: 0,
      failCount: 0,
      summary: error,
      errorMessage: error,
      durationMs: duration
    },
    durationMs: duration,
    cumulativeTime: cumulative + duration
  };
}

export async function multiTurnRepair(context: MultiTurnContext): Promise<RepairHistory> {
  const maxAttempts = Math.max(1, Math.min(context.maxAttempts ?? 4, 4));
  const attempts: RepairAttemptRecord[] = [];
  let cumulative = 0;
  let currentRun: RunResult = context.initialTestResult;
  let currentAnalysis = await analyzeRun(context.projectPath, currentRun);
  let successAttemptNumber: number | undefined;

  for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber += 1) {
    const startedAt = new Date();
    const attemptIndex = attemptNumber as 1 | 2 | 3 | 4;

    const previousAttempts = toPreviousAttempts(attempts);
    const prompt = buildRepairPrompt({
      attemptNumber: attemptIndex,
      failureAnalysis: currentAnalysis,
      previousAttempts,
      originalPrompt: context.originalPrompt,
      maxAttempts
    });

    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      const attempt = createErrorAttempt(attemptNumber, startedAt, cumulative, "LLM credentials missing");
      attempts.push(attempt);
      cumulative = attempt.cumulativeTime;
      break;
    }

    let proposal: RepairProposal;
    try {
      proposal = await requestRepairPlan(prompt);
    } catch (err) {
      const attempt = createErrorAttempt(
        attemptNumber,
        startedAt,
        cumulative,
        err instanceof Error ? err.message : String(err)
      );
      attempts.push(attempt);
      cumulative = attempt.cumulativeTime;
      continue;
    }

    let changedFiles: string[] = [];
    try {
      const { changedFiles: changed } = await applyArtifacts(context.projectPath, proposal);
      changedFiles = changed;
    } catch (err) {
      const attempt = createErrorAttempt(
        attemptNumber,
        startedAt,
        cumulative,
        err instanceof Error ? err.message : String(err)
      );
      attempts.push(attempt);
      cumulative = attempt.cumulativeTime;
      continue;
    }

    let runResult: RunResult;
    try {
      runResult = await runInSandbox({
        projectRoot: context.projectPath,
        projectSlug: context.projectSlug
      });
    } catch (err) {
      const attempt = createErrorAttempt(
        attemptNumber,
        startedAt,
        cumulative,
        err instanceof Error ? err.message : String(err)
      );
      attempts.push(attempt);
      cumulative = attempt.cumulativeTime;
      continue;
    }

    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startedAt.getTime();
    const failureAnalysis = await analyzeRun(context.projectPath, runResult);

    const summary = runResult.status === "pass"
      ? `Tests passed after updating ${changedFiles.length} file(s).`
      : `Tests still failing after updating ${changedFiles.length} file(s).`;

    const attempt: RepairAttemptRecord = {
      number: attemptNumber,
      status: runResult.status,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      changedFiles,
      summary,
      testResult: convertRunResult(runResult),
      failureAnalysis: failureAnalysis ?? undefined,
      durationMs: duration,
      cumulativeTime: cumulative + duration
    };

    attempts.push(attempt);
    cumulative = attempt.cumulativeTime;

    if (runResult.status === "pass") {
      successAttemptNumber = attemptNumber;
      break;
    }

    currentRun = runResult;
    currentAnalysis = failureAnalysis;
  }

  const finalStatus: RepairHistory["finalStatus"] = successAttemptNumber
    ? "pass"
    : attempts.length >= maxAttempts
      ? "exhausted"
      : "fail";

  const history: RepairHistory = {
    attempts,
    totalAttempts: attempts.length,
    finalStatus,
    ...(successAttemptNumber ? { successAttemptNumber } : {})
  };

  const validation = validateRepairHistory(history);
  if (!validation.ok) {
    throw new Error(`Generated repair history failed validation: ${validation.errors}`);
  }

  return validation.value;
}
