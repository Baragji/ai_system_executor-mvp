export type StepQueueStepStatus = "queued" | "running" | "completed" | "skipped" | "failed" | "paused";

export interface StepQueueStepDescriptor {
  type: string;
  payload?: Record<string, unknown>;
  stopOnSuccess?: boolean;
  optional?: boolean;
}

export interface StepQueueStepResult {
  stepId: string;
  stepType: string;
  status: StepQueueStepStatus;
  sequence: number;
  stop?: boolean;
  data?: Record<string, unknown>;
}

export interface StepQueueWorkflowResult {
  steps: StepQueueStepResult[];
  last?: StepQueueStepResult;
}

export interface StepQueueRunHooks {
  onStep?: (step: StepQueueStepResult) => void;
}

export interface StepQueueAdapter {
  runWorkflow(
    sessionId: string,
    steps: StepQueueStepDescriptor[],
    hooks?: StepQueueRunHooks
  ): Promise<StepQueueWorkflowResult>;
}

export function createStepQueueAdapter(): StepQueueAdapter {
  return {
    async runWorkflow() {
      throw new Error("StepQueue adapter not implemented");
    },
  };
}
