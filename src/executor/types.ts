import type { ClarificationAnswer, ClarificationQuestion } from "../clarification/types.js";

export type ExecutorFile = { path: string; contents: string };

export interface RepairMetrics {
  totalAttempts: number;
  successAttempt?: number | null;
  timePerAttempt: number[];
  failureTypes: string[];
  exhausted: boolean;
  attemptEfficiency: number;
}

export interface ExecutorClarificationTelemetry {
  asked: boolean;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  improvedSuccess: boolean;
}

export type ExecutorOutput = {
  project_name?: string;
  files: ExecutorFile[];
  notes?: string[];
  hasTests: boolean;
  clarification?: ExecutorClarificationTelemetry;
  repairMetrics?: RepairMetrics;
};
