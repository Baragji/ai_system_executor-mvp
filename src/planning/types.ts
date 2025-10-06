import type { ClarificationResponse } from "../clarification/types.js";
import type { ExecutorFile, ExecutorOutput } from "../executor/types.js";
import type { RunResult } from "../contracts/validators.js";
import type { RepairHistory } from "../contracts/repairHistoryValidator.js";
import type { MultiTurnContext } from "../repair/multiTurnRepair.js";

export type SubtaskStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: SubtaskStatus;
  dependencies?: string[];
  estimatedComplexity?: "low" | "medium" | "high";
  successCriteria?: string;
}

export interface TaskPlan {
  originalPrompt: string;
  subtasks: Subtask[];
  totalSubtasks: number;
  decompositionStrategy?: string;
}

export interface DecompositionIssue {
  code: string;
  message: string;
  severity: "issue" | "warning";
  context?: Record<string, unknown>;
}

export interface DecompositionQuality {
  score: number;
  issues: DecompositionIssue[];
  warnings: DecompositionIssue[];
  requiresHumanReview: boolean;
}

export interface ExecutionResult {
  status: "success" | "failure";
  notes?: string;
  outputPath?: string;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface ProgressSnapshot {
  totalSubtasks: number;
  completedSubtasks: number;
  failedSubtasks: number;
  currentSubtask: Subtask | null;
  elapsedMs: number;
  percentComplete: number;
}

export interface SubtaskResult {
  status: "completed" | "failed";
  subtaskId: string;
  generatedFiles: string[];
  testResult: RunResult | null;
  repairHistory: RepairHistory | null;
  durationMs: number;
  notes?: string;
}

export interface SubtaskPromptRequest {
  subtask: Subtask;
  prompt: string;
}

export interface ExecutionContext {
  projectPath: string;
  projectSlug: string;
  originalPrompt: string;
  clarifications?: ClarificationResponse;
  previousSubtaskResults: SubtaskResult[];
  generateSubtaskOutput: (request: SubtaskPromptRequest) => Promise<ExecutorOutput>;
  writeFiles: (rootDir: string, files: ExecutorFile[]) => Promise<void>;
  runTests: (options: { projectRoot: string; projectSlug: string }) => Promise<RunResult>;
  multiTurnRepair: (context: MultiTurnContext) => Promise<RepairHistory>;
  now?: () => number;
  onPromptBuilt?: (request: SubtaskPromptRequest) => void | Promise<void>;
}

export interface DependencyAnalysis {
  isAcyclic: boolean;
  cycles: string[][];
  executionOrder: string[];
  parallelizable: string[][];
  criticalPath: string[];
}

export interface PlanExecutionContext extends Omit<ExecutionContext, "previousSubtaskResults"> {
  previousSubtaskResults?: SubtaskResult[];
  shouldContinueOnFailure?: (subtask: Subtask, result: SubtaskResult) => boolean;
  isCriticalSubtask?: (subtask: Subtask) => boolean;
  onProgressUpdate?: (snapshot: ProgressSnapshot, result: SubtaskResult) => void | Promise<void>;
  logTelemetry?: (event: { subtaskId: string; status: SubtaskResult["status"]; progress: ProgressSnapshot }) => void | Promise<void>;
  subtaskExecutor?: (subtask: Subtask, context: ExecutionContext) => Promise<SubtaskResult>;
  now?: () => number;
}

export interface PlanExecutionResult {
  status: "completed" | "partial" | "failed";
  subtaskResults: SubtaskResult[];
  progress: ProgressSnapshot;
  totalDurationMs: number;
  failedSubtasks: string[];
  completedSubtasks: string[];
}

export interface TimeEstimate {
  estimatedRemainingMs: number;
  estimatedCompletionTimestamp: string;
  confidenceLevel: "low" | "medium" | "high";
  basedOn: string;
}

export class TaskPlanValidationError extends Error {
  public readonly issues: DecompositionIssue[];

  constructor(message: string, issues: DecompositionIssue[]) {
    super(message);
    this.name = "TaskPlanValidationError";
    this.issues = issues;
    Object.setPrototypeOf(this, TaskPlanValidationError.prototype);
  }
}
