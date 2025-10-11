import { Queue, Worker, QueueEvents, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

import type {
  PlanExecutionJobResult,
  PlanExecutionOptions,
  ResumeContextFixture,
  SingleExecutionOptions,
  SingleExecutionResult
} from "./executionTypes.js";

export type ExecutionJob =
  | { type: "plan"; payload: PlanExecutionOptions }
  | { type: "single"; payload: SingleExecutionOptions };

export type ExecutionJobResult =
  | { type: "plan"; result: PlanExecutionJobResult }
  | { type: "single"; result: SingleExecutionResult };

export type ExecutionJobHandler = (job: ExecutionJob) => Promise<ExecutionJobResult>;

export type ExecutionQueueMode = "inline" | "bullmq";

export interface ExecutionQueueController {
  readonly mode: ExecutionQueueMode;
  submit(job: ExecutionJob, options?: JobsOptions): Promise<ExecutionJobResult>;
  ensureReady(): Promise<void>;
  close(): Promise<void>;
}

export interface ConfigureExecutionQueueOptions {
  connectionString?: string;
  queueName?: string;
  concurrency?: number;
  defaultJobOptions?: JobsOptions;
  mode?: "auto" | ExecutionQueueMode;
}

const DEFAULT_QUEUE_NAME = "executor:jobs";
const DEFAULT_REMOVE_ON_COMPLETE = 100;
const DEFAULT_REMOVE_ON_FAIL = 100;

class InlineExecutionQueue implements ExecutionQueueController {
  public readonly mode: ExecutionQueueMode = "inline";
  private readonly handler: ExecutionJobHandler;

  constructor(handler: ExecutionJobHandler) {
    this.handler = handler;
  }

  async submit(job: ExecutionJob): Promise<ExecutionJobResult> {
    return this.handler(job);
  }

  async ensureReady(): Promise<void> {
    // Inline mode is always ready.
  }

  async close(): Promise<void> {
    // Nothing to close.
  }
}

interface BullMQExecutionOptions {
  connectionString: string;
  queueName: string;
  concurrency: number;
  defaultJobOptions: JobsOptions;
}

class BullMQExecutionQueue implements ExecutionQueueController {
  public readonly mode: ExecutionQueueMode = "bullmq";
  private readonly handler: ExecutionJobHandler;
  private readonly queue: Queue<ExecutionJob>;
  private readonly events: QueueEvents;
  private readonly worker: Worker<ExecutionJob, ExecutionJobResult>;
  private readonly connection: IORedis;
  private readonly defaultJobOptions: JobsOptions;
  private readonly ready: Promise<void>;

  constructor(handler: ExecutionJobHandler, options: BullMQExecutionOptions) {
    this.handler = handler;
    this.connection = new IORedis(options.connectionString, { maxRetriesPerRequest: null });
    this.queue = new Queue<ExecutionJob>(options.queueName, {
      connection: this.connection
    });
    this.events = new QueueEvents(options.queueName, {
      connection: this.connection
    });
    this.worker = new Worker<ExecutionJob, ExecutionJobResult>(
      options.queueName,
      async job => this.handler(job.data),
      {
        connection: this.connection,
        concurrency: options.concurrency
      }
    );
    this.defaultJobOptions = options.defaultJobOptions;
    this.ready = Promise.all([
      this.queue.waitUntilReady?.() ?? Promise.resolve(),
      this.events.waitUntilReady(),
      this.worker.waitUntilReady()
    ]).then(() => undefined);
  }

  async submit(job: ExecutionJob, options?: JobsOptions): Promise<ExecutionJobResult> {
    await this.ready;
    const jobOptions: JobsOptions = {
      ...this.defaultJobOptions,
      ...(options ?? {})
    };
    const queued = await this.queue.add(job.type, job, jobOptions);
    const result = await queued.waitUntilFinished(this.events);
    return result as ExecutionJobResult;
  }

  async ensureReady(): Promise<void> {
    await this.ready;
  }

  async close(): Promise<void> {
    await Promise.allSettled([
      this.worker.close(),
      this.events.close(),
      this.queue.close()
    ]);
    await this.connection.quit().catch(() => undefined);
  }
}

let configuredController: ExecutionQueueController | null = null;
let shutdownRegistered = false;

function resolveConnectionString(options?: ConfigureExecutionQueueOptions): string | undefined {
  if (options?.connectionString) {
    return options.connectionString;
  }
  return process.env.BULLMQ_URL || process.env.REDIS_URL || process.env.REDIS_CONNECTION_URL;
}

function resolveMode(options?: ConfigureExecutionQueueOptions): "auto" | ExecutionQueueMode {
  if (options?.mode) {
    return options.mode;
  }
  const env = process.env.EXECUTION_QUEUE_MODE;
  if (env === "inline" || env === "bullmq") {
    return env;
  }
  return "auto";
}

function registerShutdownHook(controller: ExecutionQueueController) {
  if (shutdownRegistered || controller.mode !== "bullmq") {
    return;
  }
  const close = () => {
    controller.close().catch(error => {
      console.warn("[Queue] Failed to close BullMQ resources during shutdown:", error);
    });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  process.once("beforeExit", close);
  shutdownRegistered = true;
}

export async function configureExecutionQueue(
  handler: ExecutionJobHandler,
  options?: ConfigureExecutionQueueOptions
): Promise<ExecutionQueueController> {
  if (configuredController) {
    return configuredController;
  }

  const inlineController = new InlineExecutionQueue(handler);
  const mode = resolveMode(options);
  const connectionString = resolveConnectionString(options);

  if (mode === "inline" || !connectionString) {
    configuredController = inlineController;
    return configuredController;
  }

  const queueName = options?.queueName ?? process.env.EXECUTION_QUEUE_NAME ?? DEFAULT_QUEUE_NAME;
  const concurrency = options?.concurrency ?? Number(process.env.EXECUTION_QUEUE_CONCURRENCY ?? 1);
  const defaultJobOptions: JobsOptions = {
    removeOnComplete: DEFAULT_REMOVE_ON_COMPLETE,
    removeOnFail: DEFAULT_REMOVE_ON_FAIL,
    ...(options?.defaultJobOptions ?? {})
  };

  try {
    const bullmq = new BullMQExecutionQueue(handler, {
      connectionString,
      queueName,
      concurrency: Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 1,
      defaultJobOptions
    });
    await bullmq.ensureReady();
    configuredController = bullmq;
    registerShutdownHook(bullmq);
    return configuredController;
  } catch (error) {
    console.warn("[Queue] Falling back to inline execution:", error);
    configuredController = inlineController;
    return configuredController;
  }
}

export function getExecutionQueue(): ExecutionQueueController {
  if (!configuredController) {
    throw new Error("Execution queue not configured. Call configureExecutionQueue() first.");
  }
  return configuredController;
}

export function resetExecutionQueueForTests(): void {
  configuredController = null;
  shutdownRegistered = false;
}

export function createSingleJobPayload(options: SingleExecutionOptions): ExecutionJob {
  return { type: "single", payload: options };
}

export function createPlanJobPayload(options: PlanExecutionOptions): ExecutionJob {
  return { type: "plan", payload: options };
}

export type { ResumeContextFixture };
