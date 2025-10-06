import type { RunResult } from "../contracts/validators.js";
import type { TestResultSummary } from "../contracts/repairHistoryValidator.js";
import type { Subtask } from "./types.js";
import type { ExecutionContext, SubtaskPromptRequest, SubtaskResult } from "./types.js";

function formatPreviousResults(previous: SubtaskResult[]): string {
  if (previous.length === 0) {
    return "No subtasks completed yet.";
  }

  return previous
    .map(result => {
      const status = result.status === "completed" ? "completed" : "failed";
      const note = result.notes ? ` - ${result.notes}` : "";
      return `- ${result.subtaskId}: ${status}${note}`;
    })
    .join("\n");
}

function buildPrompt(subtask: Subtask, context: ExecutionContext): string {
  const clarifications = context.clarifications
    ?.answers.map(answer => `- ${answer.questionId}: ${answer.value}`)
    .join("\n");

  const successCriteria = subtask.successCriteria
    ? `Success criteria: ${subtask.successCriteria}`
    : "No explicit success criteria provided.";

  const dependencyText = (subtask.dependencies ?? []).length > 0
    ? `Dependencies already completed: ${(subtask.dependencies ?? []).join(", ")}`
    : "No explicit dependencies.";

  return [
    "You are contributing to a larger software project using a task plan.",
    "Focus strictly on the described subtask while respecting existing files.",
    "Provide the updated files that should exist after completing this subtask.",
    "If tests are needed, include them and mark hasTests=true.",
    "Respond with JSON following the executor schema (project_name, files, notes, hasTests).",
    "",
    `Overall project prompt: ${context.originalPrompt}`,
    "",
    "Context from previously completed subtasks:",
    formatPreviousResults(context.previousSubtaskResults),
    "",
    "Clarifications (if any):",
    clarifications ?? "None provided.",
    "",
    "Subtask to execute:",
    `Title: ${subtask.title}`,
    `Description: ${subtask.description}`,
    successCriteria,
    dependencyText,
    "",
    "Return only valid JSON with the resulting files."
  ].join("\n");
}

function normalizeTestResult(initial: RunResult, candidate: RunResult | TestResultSummary | null | undefined): RunResult {
  if (!candidate) {
    return initial;
  }

  if ("timestamp" in candidate) {
    return candidate;
  }

  return {
    status: candidate.status,
    passCount: candidate.passCount,
    failCount: candidate.failCount,
    durationMs: candidate.durationMs ?? initial.durationMs,
    logsPath: candidate.logsPath ?? initial.logsPath,
    timestamp: initial.timestamp,
    command: initial.command,
    exitCode: initial.exitCode,
    signal: initial.signal,
    timedOut: initial.timedOut,
    errorMessage: candidate.errorMessage ?? initial.errorMessage,
    startedAt: initial.startedAt,
    finishedAt: initial.finishedAt
  };
}

async function runTests(
  context: ExecutionContext,
  generatedFiles: string[],
  initialRun: RunResult
): Promise<{ testResult: RunResult; repairHistory: SubtaskResult["repairHistory"]; status: "completed" | "failed"; notes?: string }>
{
  if (initialRun.status === "pass") {
    return { testResult: initialRun, repairHistory: null, status: "completed" };
  }

  try {
    const history = await context.multiTurnRepair({
      projectPath: context.projectPath,
      projectSlug: context.projectSlug,
      originalPrompt: context.originalPrompt,
      generatedFiles,
      initialTestResult: initialRun
    });

    const finalAttempt = history.attempts.at(-1);
    const finalResult = normalizeTestResult(initialRun, finalAttempt?.testResult);
    const completed = history.finalStatus === "pass";
    const notes = completed
      ? undefined
      : `Tests failing after repair (${history.finalStatus}).`;

    return {
      testResult: finalResult,
      repairHistory: history,
      status: completed ? "completed" : "failed",
      notes
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      testResult: initialRun,
      repairHistory: null,
      status: "failed",
      notes: `Repair failed: ${message}`
    };
  }
}

export async function executeSubtask(
  subtask: Subtask,
  context: ExecutionContext
): Promise<SubtaskResult> {
  const start = context.now ? context.now() : Date.now();

  const duration = () => (context.now ? context.now() : Date.now()) - start;

  try {
    const prompt = buildPrompt(subtask, context);
    const request: SubtaskPromptRequest = { subtask, prompt };
    await context.onPromptBuilt?.(request);

    const output = await context.generateSubtaskOutput(request);
    if (!output || !Array.isArray(output.files)) {
      throw new Error("Subtask execution did not return any files");
    }

    await context.writeFiles(context.projectPath, output.files);
    const generatedFiles = output.files.map(file => file.path);

    let testResult: RunResult | null = null;
    let repairHistory: SubtaskResult["repairHistory"] = null;
    let status: SubtaskResult["status"] = "completed";
    let notes: string | undefined;

    if (output.hasTests) {
      const run = await context.runTests({
        projectRoot: context.projectPath,
        projectSlug: context.projectSlug
      });
      const outcome = await runTests(context, generatedFiles, run);
      testResult = outcome.testResult;
      repairHistory = outcome.repairHistory;
      status = outcome.status;
      notes = outcome.notes;
    } else if (Array.isArray(output.notes) && output.notes.length > 0) {
      notes = output.notes.join("; ");
    }

    return {
      status,
      subtaskId: subtask.id,
      generatedFiles,
      testResult,
      repairHistory,
      durationMs: duration(),
      notes
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      subtaskId: subtask.id,
      generatedFiles: [],
      testResult: null,
      repairHistory: null,
      durationMs: duration(),
      notes: message
    };
  }
}

export type { ExecutionContext };
