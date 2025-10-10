import fs from "node:fs/promises";
import path from "node:path";
import type { RunResult } from "../contracts/validators.js";
import type { TestResultSummary } from "../contracts/repairHistoryValidator.js";
import type { Subtask } from "./types.js";
import type { ExecutionContext, SubtaskPromptRequest, SubtaskResult } from "./types.js";
// path already imported above
import { writeFixture } from "../fixtures/index.js";

async function formatPreviousResults(previous: SubtaskResult[], projectPath: string): Promise<string> {
  if (previous.length === 0) {
    return "No subtasks completed yet.";
  }

  const results = await Promise.all(
    previous.map(async result => {
      const status = result.status === "completed" ? "completed" : "failed";
      const note = result.notes ? ` - ${result.notes}` : "";

      if (result.generatedFiles.length === 0) {
        return `- ${result.subtaskId}: ${status}${note}\n  No files generated`;
      }

      // Read actual file contents for context (limit to key files to avoid token bloat)
      const keyFiles = result.generatedFiles.filter(f =>
        !f.includes('node_modules') &&
        !f.includes('.lock') &&
        !f.includes('package-lock')
      ).slice(0, 5); // Max 5 files per subtask

      const fileContents = await Promise.all(
        keyFiles.map(async filePath => {
          try {
            const fullPath = path.join(projectPath, filePath);
            const content = await fs.readFile(fullPath, "utf-8");
            const truncated = content.length > 500 ? content.slice(0, 500) + "\n... (truncated)" : content;
            return `\n  ${filePath}:\n    ${truncated.split('\n').join('\n    ')}`;
          } catch {
            return `\n  ${filePath}: (could not read)`;
          }
        })
      );

      const otherFiles = result.generatedFiles.length > keyFiles.length
        ? `\n  + ${result.generatedFiles.length - keyFiles.length} more files`
        : "";

      return `- ${result.subtaskId}: ${status}${note}${fileContents.join("")}${otherFiles}`;
    })
  );

  return results.join("\n");
}

async function buildPrompt(subtask: Subtask, context: ExecutionContext): Promise<string> {
  const clarifications = context.clarifications
    ?.answers.map(answer => `- ${answer.questionId}: ${answer.value}`)
    .join("\n");

  const successCriteria = subtask.successCriteria
    ? `Success criteria: ${subtask.successCriteria}`
    : "No explicit success criteria provided.";

  const dependencyText = (subtask.dependencies ?? []).length > 0
    ? `Dependencies already completed: ${(subtask.dependencies ?? []).join(", ")}`
    : "No explicit dependencies.";

  const previousContext = await formatPreviousResults(
    context.previousSubtaskResults,
    context.projectPath
  );

  return [
    "You are contributing to a larger software project using a task plan.",
    "Focus strictly on the described subtask while respecting existing files.",
    "Build upon the code from previous subtasks - the file contents are provided below.",
    "Provide ALL files that should exist after this subtask (including updated versions of existing files).",
    "If tests are needed, include them and mark hasTests=true.",
    "Respond with JSON following the executor schema (project_name, files, notes, hasTests).",
    "",
    `Overall project prompt: ${context.originalPrompt}`,
    "",
    "Context from previously completed subtasks (with file contents):",
    previousContext,
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
    "IMPORTANT: Include ALL files that should exist, including:",
    "- Modified versions of files from previous subtasks",
    "- New files for this subtask",
    "- Configuration files (package.json, etc.) with updated dependencies if needed",
    "",
    "Return only valid JSON with the complete set of files."
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
    // Capture initial run for fixtures if session is present
    if (context.sessionId) {
      try {
        await writeFixture(context.projectSlug, context.sessionId, path.join("tests", "initial.json"), initialRun);
      } catch { void 0; }
    }
    const repairCtx = {
      projectPath: context.projectPath,
      projectSlug: context.projectSlug,
      originalPrompt: context.originalPrompt,
      generatedFiles,
      initialTestResult: initialRun
    };
    if (context.sessionId) {
      try {
        await writeFixture(context.projectSlug, context.sessionId, path.join("repair", "context.json"), repairCtx);
      } catch { void 0; }
    }
    const history = await context.multiTurnRepair(repairCtx);
    if (context.sessionId) {
      try {
        await writeFixture(context.projectSlug, context.sessionId, path.join("repair", "history.json"), history);
      } catch { void 0; }
    }

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
    const prompt = await buildPrompt(subtask, context);
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
