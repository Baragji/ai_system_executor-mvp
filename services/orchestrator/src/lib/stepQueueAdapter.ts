export interface StepQueueAdapter {
  enqueueExecution(input: { executionId: string; payload: unknown }): Promise<void>;
}

export function createStepQueueAdapter(): StepQueueAdapter {
  return {
    async enqueueExecution() {
      // Placeholder: real implementation will forward executions to the StepQueue runtime.
    },
  };
}
