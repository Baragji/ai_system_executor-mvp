import type { ClarificationResponse } from "../../clarification/types.js";
import type { SubtaskResult } from "../../planning/types.js";
import type { RunResult } from "../../contracts/validators.js";
import type { RepairHistory, FailureCategory } from "../../contracts/repairHistoryValidator.js";
import { writeFixture } from "../../fixtures/index.js";

export function isComplexPrompt(prompt: string, clarifications?: ClarificationResponse): boolean {
  const normalized = prompt.toLowerCase();
  const featureIndicators = [
    " and ",
    " with ",
    "feature",
    "module",
    "api",
    "database",
    "auth",
    "dashboard",
    "workflow"
  ];
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

export function collectPlanGeneratedFiles(results: SubtaskResult[]): string[] {
  const files = new Set<string>();
  results.forEach(result => {
    result.generatedFiles.forEach(file => files.add(file));
  });
  return Array.from(files);
}

export async function captureFixture(sessionId: string | undefined, slug: string, relPath: string, data: unknown) {
  if (!sessionId) return;
  try {
    await writeFixture(slug, sessionId, relPath, data);
  } catch (err) {
    console.warn("Failed to write fixture", relPath, err);
  }
}

export function buildRepairSummary(initialRun: RunResult, history: RepairHistory) {
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

export function buildRepairMetrics(history: RepairHistory) {
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
    (metrics as Record<string, unknown>).successAttempt = successAttempt;
  }

  return metrics;
}
