export type JobsOptions = Record<string, unknown>;

export class Queue<T = unknown> {
  constructor(_name: string, _opts?: Record<string, unknown>) {}

  async add(_name: string, _job: T, _options?: JobsOptions): Promise<{ waitUntilFinished: () => Promise<unknown> }> {
    return {
      waitUntilFinished: async () => ({})
    };
  }

  async close(): Promise<void> {}

  async waitUntilReady(): Promise<void> {}
}

export class Worker<T = unknown, R = unknown> {
  constructor(
    _name: string,
    _processor: (job: { data: T }) => Promise<R>,
    _opts?: Record<string, unknown>
  ) {}

  async close(): Promise<void> {}

  async waitUntilReady(): Promise<void> {}
}

export class QueueEvents {
  constructor(_name: string, _opts?: Record<string, unknown>) {}

  async close(): Promise<void> {}

  async waitUntilReady(): Promise<void> {}
}
