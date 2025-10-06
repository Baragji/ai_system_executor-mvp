import { analyzeDependencies } from "./analyzeDependencies.js";
import type { ProgressSnapshot, TaskPlan, TimeEstimate, Subtask } from "./types.js";

function complexityWeight(subtask: Subtask): number {
  switch (subtask.estimatedComplexity) {
    case "high":
      return 1.5;
    case "low":
      return 0.75;
    default:
      return 1;
  }
}

function determineConfidence(progress: ProgressSnapshot): TimeEstimate["confidenceLevel"] {
  const ratio = progress.totalSubtasks === 0
    ? 0
    : progress.completedSubtasks / progress.totalSubtasks;

  if (ratio >= 0.75) return "high";
  if (ratio >= 0.35) return "medium";
  return "low";
}

function baseAverageDuration(progress: ProgressSnapshot): number {
  if (progress.completedSubtasks <= 0 || progress.elapsedMs <= 0) {
    return 5 * 60 * 1000; // default 5 minutes per subtask when no history
  }
  return progress.elapsedMs / progress.completedSubtasks;
}

function remainingCriticalPathWeight(plan: TaskPlan): number {
  const analysis = analyzeDependencies(plan);
  if (!analysis.isAcyclic || analysis.criticalPath.length === 0) {
    return 0;
  }

  const remaining = analysis.criticalPath.filter(id => {
    const subtask = plan.subtasks.find(candidate => candidate.id === id);
    return subtask && subtask.status !== "completed";
  });

  return remaining.length;
}

export function estimateCompletion(progress: ProgressSnapshot, plan: TaskPlan): TimeEstimate {
  const now = Date.now();
  const averageMs = baseAverageDuration(progress);

  const completedIds = new Set(
    plan.subtasks
      .filter(subtask => subtask.status === "completed")
      .map(subtask => subtask.id)
  );
  const failedIds = new Set(
    plan.subtasks
      .filter(subtask => subtask.status === "failed")
      .map(subtask => subtask.id)
  );

  const remainingSubtasks = plan.subtasks.filter(
    subtask => !completedIds.has(subtask.id) && !failedIds.has(subtask.id)
  );

  let estimatedRemainingMs = remainingSubtasks.reduce((total, subtask) => {
    return total + averageMs * complexityWeight(subtask);
  }, 0);

  const criticalWeight = remainingCriticalPathWeight(plan);
  if (criticalWeight > 0) {
    estimatedRemainingMs = Math.max(estimatedRemainingMs, averageMs * criticalWeight);
  }

  const repairBufferMultiplier = 0.1 + progress.failedSubtasks * 0.05;
  const buffer = estimatedRemainingMs * repairBufferMultiplier;
  estimatedRemainingMs += buffer;

  const confidence = determineConfidence(progress);
  const estimatedTimestamp = new Date(now + estimatedRemainingMs).toISOString();

  const basedOn = [
    `average ${Math.round(averageMs)}ms per subtask`,
    `${remainingSubtasks.length} subtasks remaining`,
    `critical path depth ${criticalWeight}`,
    `confidence ${confidence}`
  ].join(", ");

  return {
    estimatedRemainingMs: Math.max(0, Math.round(estimatedRemainingMs)),
    estimatedCompletionTimestamp: estimatedTimestamp,
    confidenceLevel: confidence,
    basedOn
  };
}
