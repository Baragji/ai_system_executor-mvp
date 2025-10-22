declare module "bullmq" {
  export interface JobsOptions {
    removeOnComplete?: number | boolean;
    removeOnFail?: number | boolean;
    [key: string]: unknown;
  }

  export class Queue<T = unknown> {
    constructor(name: string, options?: { connection?: unknown });
    waitUntilReady?(): Promise<void>;
    add(name: string, data: T, options?: JobsOptions): Promise<{ waitUntilFinished(events: QueueEvents): Promise<unknown> }>;
    close(): Promise<void>;
  }

  export class QueueEvents {
    constructor(name: string, options?: { connection?: unknown });
    waitUntilReady(): Promise<void>;
    close(): Promise<void>;
  }

  export class Worker<T = unknown, R = unknown> {
    constructor(name: string, processor: (job: { data: T }) => Promise<R>, options?: { connection?: unknown; concurrency?: number });
    waitUntilReady(): Promise<void>;
    close(): Promise<void>;
  }
}
