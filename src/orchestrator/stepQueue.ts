import { randomUUID } from "node:crypto";

import { PausedError } from "./abortSignal.js";
import {
  configureExecutionQueue,
  type ConfigureExecutionQueueOptions,
  type ExecutionQueueController,
  type ExecutionQueueMode,
  type StepJobPayload
} from "./jobQueue.js";
import {
  ensureWorkflowPlan,
  getNextSequence,
  initializeWorkflow,
  loadWorkflow,
  recordStepCompletion,
  recordStepFailure,
  recordStepPaused,
  recordStepQueued,
  recordStepRunning,
  resetWorkflow,
  type PlannedStepRecord,
  type StepRecord,
  type StepStatus
} from "./checkpointStore.js";

export type ExecutionStepType =
  | "clarify"
  | "plan"
  | "generate"
  | "test"
  | "repair"
  | "single"
  | "finalize";

export interface StepHandlerContext {
  sessionId: string;
  stepId: string;
  stepType: ExecutionStepType;
  sequence: number;
  payload?: Record<string, unknown>;
  queueMode: ExecutionQueueMode;
}

export interface StepHandlerResult {
  status?: "completed" | "skipped";
  data?: Record<string, unknown>;
  stop?: boolean;
}

export type StepHandler = (context: StepHandlerContext) => Promise<StepHandlerResult>;

export interface StepDescriptor {
  type: ExecutionStepType;
  payload?: Record<string, unknown>;
  stopOnSuccess?: boolean;
  optional?: boolean;
}

export interface StepExecutionResult {
  stepId: string;
  stepType: ExecutionStepType;
  status: StepStatus;
  data?: Record<string, unknown>;
  stop?: boolean;
  sequence: number;
}

export interface WorkflowRunResult {
  steps: StepExecutionResult[];
  last?: StepExecutionResult;
}

export interface WorkflowRunOptions {
  resume?: boolean;
  onStep?: (result: StepExecutionResult) => void;
}

export class StepQueue {
  private controller: ExecutionQueueController;
  private readonly handlers = new Map<ExecutionStepType, StepHandler>();

  private constructor(controller: ExecutionQueueController) {
    this.controller = controller;
  }

  static async create(options?: ConfigureExecutionQueueOptions): Promise<StepQueue> {
    let queue: StepQueue | null = null;
    const controller = await configureExecutionQueue(async job => {
      if (job.type !== "step") {
        throw new Error(`Unsupported execution job type: ${(job as { type: string }).type}`);
      }
      if (!queue) {
        throw new Error("StepQueue not initialized");
      }
      const result = await queue.handle(job.payload as StepJobPayload);
      return { type: "step", result } as const;
    }, options);

    queue = new StepQueue(controller);
    return queue;
  }

  get mode(): ExecutionQueueMode {
    return this.controller.mode;
  }

  registerHandler(stepType: ExecutionStepType, handler: StepHandler): void {
    this.handlers.set(stepType, handler);
  }

  async resetSession(sessionId: string): Promise<void> {
    await resetWorkflow(sessionId);
  }

  async runWorkflow(sessionId: string, steps: StepDescriptor[], options?: WorkflowRunOptions): Promise<WorkflowRunResult> {
    if (!sessionId) {
      throw new Error("sessionId is required to run workflow");
    }

    const planned: PlannedStepRecord[] = steps.map((descriptor, index) => ({
      order: index,
      stepType: descriptor.type,
      optional: Boolean(descriptor.optional),
      stopOnSuccess: descriptor.stopOnSuccess ?? true,
      payload: descriptor.payload ? JSON.parse(JSON.stringify(descriptor.payload)) : undefined
    }));

    if (options?.resume) {
      const workflow = await loadWorkflow(sessionId);
      if (!workflow) {
        throw new Error(`Workflow not initialized for session ${sessionId}`);
      }
      await ensureWorkflowPlan(sessionId, planned);
    } else {
      await this.resetSession(sessionId);
      await initializeWorkflow(sessionId, planned);
    }

    const results: StepExecutionResult[] = [];

    for (let index = 0; index < steps.length; index += 1) {
      const descriptor = steps[index];
      if (!descriptor) {
        continue;
      }
      const { type, payload, stopOnSuccess = true, optional = false } = descriptor;
      try {
        const existingRecord = await this.selectRecordedStep(sessionId, index);

        if (options?.resume) {
          if (existingRecord && (existingRecord.status === "completed" || existingRecord.status === "skipped")) {
            const carried: StepExecutionResult = {
              stepId: existingRecord.stepId,
              stepType: existingRecord.stepType as ExecutionStepType,
              status: existingRecord.status,
              data: existingRecord.result,
              stop: existingRecord.stop,
              sequence: index
            };
            results.push(carried);
            options?.onStep?.(carried);
            const shouldCarryStop =
              carried.status === "completed" && (carried.stop ?? stopOnSuccess ?? true);
            if (shouldCarryStop) {
              return { steps: results, last: carried };
            }
            continue;
          }
        }

        const plannedPayload = planned[index]?.payload;
        const payloadForRun = payload ?? existingRecord?.payload ?? plannedPayload;

        const result = await this.enqueueStep({
          sessionId,
          stepType: type,
          payload: payloadForRun,
          sequence: index
        });
        results.push(result);
        options?.onStep?.(result);
        const shouldStop = (result.status === "completed" && (result.stop ?? stopOnSuccess)) || result.status === "paused";
        if (shouldStop) {
          return { steps: results, last: result };
        }
        if (result.status === "skipped") {
          continue;
        }
      } catch (error) {
        if (error instanceof PausedError) {
          throw error;
        }
        if (!optional) {
          throw error;
        }
        // optional failure already recorded in checkpoint store
      }
    }

    return { steps: results, last: results.at(-1) };
  }

  async enqueueStep({
    sessionId,
    stepType,
    payload,
    sequence
  }: {
    sessionId: string;
    stepType: ExecutionStepType;
    payload?: Record<string, unknown>;
    sequence?: number;
  }): Promise<StepExecutionResult> {
    if (!sessionId) {
      throw new Error("sessionId is required to enqueue step");
    }

    const currentSequence = sequence ?? (await getNextSequence(sessionId));
    const job: StepJobPayload = {
      sessionId,
      stepId: randomUUID(),
      stepType,
      sequence: currentSequence,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined
    };

    await recordStepQueued({
      sessionId,
      stepId: job.stepId,
      stepType,
      sequence: currentSequence,
      payload: job.payload
    });

    const result = await this.controller.submit({ type: "step", payload: job });
    if (result.type !== "step") {
      throw new Error(`Unexpected job result type: ${(result as { type: string }).type}`);
    }
    return result.result as StepExecutionResult;
  }

  private async handle(job: StepJobPayload): Promise<StepExecutionResult> {
    const stepType = job.stepType as ExecutionStepType;
    const handler = this.handlers.get(stepType);
    if (!handler) {
      throw new Error(`No handler registered for step ${job.stepType}`);
    }

    await recordStepRunning(job.sessionId, job.stepId);
    try {
      const result = await handler({
        sessionId: job.sessionId,
        stepId: job.stepId,
        stepType,
        sequence: job.sequence,
        payload: job.payload,
        queueMode: this.controller.mode
      });
      const status: StepStatus = result.status ?? "completed";
      await recordStepCompletion({
        sessionId: job.sessionId,
        stepId: job.stepId,
        status,
        result: result.data,
        stop: result.stop
      });
      return {
        stepId: job.stepId,
        stepType,
        status,
        data: result.data,
        stop: result.stop,
        sequence: job.sequence
      };
    } catch (error) {
      if (error instanceof PausedError) {
        error.stepId = job.stepId;
        error.stepType = stepType;
        error.sequence = job.sequence;
        await recordStepPaused({ sessionId: job.sessionId, stepId: job.stepId, error });
      } else {
        await recordStepFailure({ sessionId: job.sessionId, stepId: job.stepId, error });
      }
      throw error;
    }
  }

  async getWorkflow(sessionId: string): Promise<StepRecord[] | null> {
    const workflow = await loadWorkflow(sessionId);
    return workflow?.steps ?? null;
  }

  async getPlannedSteps(sessionId: string): Promise<PlannedStepRecord[] | null> {
    const workflow = await loadWorkflow(sessionId);
    return workflow?.plan ?? null;
  }

  private async selectRecordedStep(sessionId: string, sequence: number | null): Promise<StepRecord | undefined> {
    if (sequence === null || sequence === undefined) {
      return undefined;
    }
    const workflow = await loadWorkflow(sessionId);
    if (!workflow) {
      return undefined;
    }
    for (let index = workflow.steps.length - 1; index >= 0; index -= 1) {
      const entry = workflow.steps[index];
      if (entry && entry.sequence === sequence) {
        return entry;
      }
    }
    return undefined;
  }
}
