import { ProgressTracker } from "./progressTracker.js";
import { analyzeDependencies } from "./analyzeDependencies.js";
import { executeSubtask } from "./executeSubtask.js";
import type {
  ExecutionContext,
  PlanExecutionContext,
  PlanExecutionResult,
  Subtask,
  SubtaskResult,
  TaskPlan,
  ProgressSnapshot,
  ExecutionResult
} from "./types.js";

function toExecutionResult(result: SubtaskResult): ExecutionResult {
  return {
    status: result.status === "completed" ? "success" : "failure",
    notes: result.notes,
    finishedAt: new Date()
  };
}

function shouldContinue(
  subtask: Subtask,
  result: SubtaskResult,
  context: PlanExecutionContext
): boolean {
  if (context.shouldContinueOnFailure) {
    return context.shouldContinueOnFailure(subtask, result);
  }

  const critical = context.isCriticalSubtask
    ? context.isCriticalSubtask(subtask)
    : subtask.estimatedComplexity === "high";

  return !critical;
}

async function emitProgress(
  context: PlanExecutionContext,
  snapshot: ProgressSnapshot,
  result: SubtaskResult
): Promise<void> {
  await context.onProgressUpdate?.(snapshot, result);
  await context.logTelemetry?.({
    subtaskId: result.subtaskId,
    status: result.status,
    progress: snapshot
  });
}

function mergePreviousResults(
  context: PlanExecutionContext,
  accumulated: SubtaskResult[]
): ExecutionContext {
  return {
    ...context,
    previousSubtaskResults: [...(context.previousSubtaskResults ?? []), ...accumulated]
  };
}

function readPlanDuration(): number | null {
  const raw = process.env.PLAN_MAX_DURATION_MS;
  if (!raw) return 4 * 60 * 1000;
  if (String(raw).trim().toLowerCase() === "off") return null; // allow disabling
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 4 * 60 * 1000;
}
const MAX_PLAN_DURATION_MS = readPlanDuration(); // default 4 minutes; set PLAN_MAX_DURATION_MS=off to disable
function readPlanBudget(): number | null {
  const raw = process.env.PLAN_BUDGET_MS;
  if (raw == null) return 900000; // default 15 minutes
  if (String(raw).trim().toLowerCase() === "off") return null; // allow disabling
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 900000;
}
const PLAN_BUDGET_MS = readPlanBudget(); // set PLAN_BUDGET_MS=off to disable
const MAX_CONSECUTIVE_FAILURES = 3; // Increased from 2 to 3 for better resilience

export async function executeTaskPlan(
  plan: TaskPlan,
  context: PlanExecutionContext
): Promise<PlanExecutionResult> {
  const start = context.now ? context.now() : Date.now();
  const tracker = new ProgressTracker(plan);
  const analysis = analyzeDependencies(plan);

  if (!analysis.isAcyclic) {
    const duration = (context.now ? context.now() : Date.now()) - start;
    return {
      status: "failed",
      subtaskResults: [],
      progress: tracker.getProgress(),
      totalDurationMs: duration,
      failedSubtasks: [],
      completedSubtasks: []
    };
  }

  const executionOrder = analysis.executionOrder.length > 0
    ? analysis.executionOrder
    : plan.subtasks.map(subtask => subtask.id);

  const subtaskExecutor = context.subtaskExecutor ?? executeSubtask;
  const results: SubtaskResult[] = [];
  const completed: string[] = [];
  const failed: string[] = [];
  let halted = false;
  let haltReason: string | undefined;
  let consecutiveFailures = 0;

  for (const subtaskId of executionOrder) {
    const elapsed = (context.now ? context.now() : Date.now()) - start;
    
    // Check plan budget first (hard limit)
    if (PLAN_BUDGET_MS !== null && elapsed > PLAN_BUDGET_MS) {
      halted = true;
      haltReason = `Plan halted: budget exhausted at ${Math.round(elapsed / 1000)}s (PLAN_BUDGET_MS=${PLAN_BUDGET_MS}). Completed ${completed.length}/${plan.subtasks.length}.`;
      console.warn(haltReason);
      break;
    }

    // Check browser timeout limit (for UI responsiveness)
    if (MAX_PLAN_DURATION_MS !== null && elapsed > MAX_PLAN_DURATION_MS) {
      halted = true;
      haltReason = `Plan halted: UI timeout guard at ${Math.round(elapsed / 1000)}s (PLAN_MAX_DURATION_MS=${MAX_PLAN_DURATION_MS}). Completed ${completed.length}/${plan.subtasks.length}.`;
      console.warn(haltReason);
      break;
    }

    // Halt if too many consecutive failures (still useful as a circuit breaker)
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      halted = true;
      haltReason = `Plan halted: ${consecutiveFailures} consecutive failures.`;
      const note = `${haltReason} Completed ${completed.length}/${plan.subtasks.length} subtasks.`;
      console.warn(note);
      break;
    }
    const subtask = plan.subtasks.find(item => item.id === subtaskId);
    if (!subtask) {
      continue;
    }

    if (failed.includes(subtaskId)) {
      continue;
    }

    const dependencies = subtask.dependencies ?? [];
    const unsatisfied = dependencies.filter(dep => !completed.includes(dep));
    if (unsatisfied.length > 0) {
      const failure: SubtaskResult = {
        status: "failed",
        subtaskId,
        generatedFiles: [],
        testResult: null,
        repairHistory: null,
        durationMs: (context.now ? context.now() : Date.now()) - start,
        notes: `Dependencies not satisfied: ${unsatisfied.join(", ")}`
      };
      results.push(failure);
      failed.push(subtaskId);
      tracker.markSubtaskFailed(subtaskId, new Error(failure.notes ?? "Dependencies missing"));
      await emitProgress(context, tracker.getProgress(), failure);
      halted = true;
      haltReason = `Plan halted: dependencies not satisfied for '${subtaskId}' (${unsatisfied.join(", ")}).`;
      break;
    }

    const subtaskContext = mergePreviousResults(context, results);
    const current = tracker.getNextSubtask();
    const activeSubtask = current && current.id === subtask.id ? current : subtask;

    const result = await subtaskExecutor(activeSubtask, subtaskContext);
    results.push(result);

    if (result.status === "completed") {
      tracker.markSubtaskComplete(subtask.id, toExecutionResult(result));
      completed.push(subtask.id);
      consecutiveFailures = 0; // Reset on success
    } else {
      tracker.markSubtaskFailed(subtask.id, new Error(result.notes ?? "Subtask failed"));
      failed.push(subtask.id);
      consecutiveFailures++;
    }

    await emitProgress(context, tracker.getProgress(), result);

    if (result.status === "failed") {
      if (!shouldContinue(subtask, result, context)) {
        halted = true;
        haltReason = `Plan halted: subtask '${subtask.id}' failed and continuation not allowed.`;
        break;
      }
    }
  }

  const end = context.now ? context.now() : Date.now();
  const durationMs = end - start;
  const progress = tracker.getProgress();

  let status: PlanExecutionResult["status"];
  if (failed.length === 0 && tracker.isComplete()) {
    status = "completed";
  } else if (halted && failed.length > 0 && completed.length <= failed.length) {
    status = "failed";
  } else {
    status = "partial";
  }

  return {
    status,
    subtaskResults: results,
    progress,
    totalDurationMs: durationMs,
    failedSubtasks: failed,
    completedSubtasks: completed,
    haltReason
  };
}
