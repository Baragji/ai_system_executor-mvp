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

export interface DependencyAnalysis {
  isAcyclic: boolean;
  cycles: string[][];
  executionOrder: string[];
  parallelizable: string[][];
  criticalPath: string[];
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
