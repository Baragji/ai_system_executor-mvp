import type { ClarificationResponse, ClarificationQuestion, ClarificationAnswer } from "../clarification/types.js";
import type { RunResult } from "../contracts/validators.js";
import type { FailureCategory, RepairHistory, TestResultSummary } from "../contracts/repairHistoryValidator.js";
import type { TaskPlan, PlanExecutionResult, TimeEstimate, SubtaskResult } from "../planning/types.js";

export interface ResumeContextFixture {
  adjustment?: string;
  answeredQuestions?: Array<{ id: string; question: string; answer: unknown }>;
  manifestSummary?: {
    totalFiles: number;
    totalSize: number;
    topFiles: Array<{ path: string; size: number; hash: string }>;
  } | null;
  checkpoint?: { state: string; updatedAt: string };
  prompt?: { system: string; user: string };
}

export interface ExecutorSuccessResponse {
  ok: true;
  project: string;
  files_written: number;
  browse_url: string;
  abs_path: string;
  testResults: { initial: RunResult | null; afterRepair: RunResult | null };
  repairMetrics: Record<string, unknown>;
  repairHistory: RepairHistory;
  repair: {
    attempted: boolean;
    repaired: boolean;
    appliedFiles: number;
    notes: string[];
    error: FailureCategory | string | null;
    artifacts: unknown[];
  };
  clarificationsUsed: boolean;
  generated: string;
  taskPlanUsed: boolean;
  taskPlan: TaskPlan | null;
  planExecutionResult: PlanExecutionResult | null;
  timeEstimate: TimeEstimate | null;
  decompositionQuality: number | null;
  projectName: string;
  clarificationTelemetry?: {
    asked: boolean;
    questions: ClarificationQuestion[];
    answers: ClarificationAnswer[];
    improvedSuccess: boolean;
  };
  repairTimeline?: Array<{
    subtaskId?: string;
    attempt: number;
    status: "pass" | "fail" | "error";
    startedAt: string;
    finishedAt: string;
    logsPath?: string;
    failureCategory?: FailureCategory | null;
    testResult?: TestResultSummary | null;
  }>;
  testRuns?: Array<{
    id: string;
    status: string;
    logsPath: string;
    startedAt: string;
    finishedAt: string;
  }>;
  clarifications?: {
    used: boolean;
    answers: ClarificationAnswer[];
    asked: boolean;
  };
  missingFiles?: string[];
  emptyFiles?: string[];
  fileMetadata?: Array<{ path: string; hash: string }>;
  taskPlanMetadata?: {
    subtaskCount: number;
    completedSubtasks: number;
    failedSubtasks: number;
    durationMs: number;
  };
  lastSubtaskResult?: SubtaskResult | null;
}

export interface SingleExecutionOptions {
  sessionId?: string;
  systemPrompt: string;
  executorPrompt: string;
  originalPrompt: string;
  projectNameHint?: string;
  clarifications?: ClarificationResponse;
  clarificationsUsed: boolean;
  clarificationQuestions: ClarificationQuestion[];
  clarificationAsked: boolean;
  preserveWorkspace?: boolean;
  slugOverride?: string;
  resumeFixture?: ResumeContextFixture;
  tracePhase?: string;
  progressMetadata?: Record<string, unknown>;
}

export interface SingleExecutionResult {
  response: ExecutorSuccessResponse;
  slug: string;
  targetRoot: string;
}

export interface PlanExecutionOptions {
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
}

export interface PlanExecutionJobResult {
  response: unknown;
  meta: unknown;
  status: PlanExecutionResult["status"];
  timeEstimate: TimeEstimate;
  planExecutionResult: PlanExecutionResult;
}
