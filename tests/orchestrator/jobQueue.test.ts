import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const workerCalls: Array<{ data: unknown }> = [];
  let processor: ((job: { data: unknown }) => Promise<unknown>) | null = null;

  class MockJob {
    constructor(private readonly payload: unknown) {}
    async waitUntilFinished(_events: unknown): Promise<unknown> {
      if (!processor) {
        throw new Error("No worker registered");
      }
      return processor({ data: this.payload });
    }
  }

  class MockQueue {
    constructor(_name: string, _options: unknown) {}
    async waitUntilReady(): Promise<void> {}
    async add(_name: string, data: unknown, _options?: unknown): Promise<MockJob> {
      return new MockJob(data);
    }
    async close(): Promise<void> {}
  }

  class MockQueueEvents {
    constructor(_name: string, _options: unknown) {}
    async waitUntilReady(): Promise<void> {}
    async close(): Promise<void> {}
  }

  class MockWorker {
    constructor(_name: string, fn: (job: { data: unknown }) => Promise<unknown>, _options: unknown) {
      processor = async job => {
        workerCalls.push(job);
        return fn(job);
      };
    }
    async waitUntilReady(): Promise<void> {}
    async close(): Promise<void> {
      processor = null;
      workerCalls.length = 0;
    }
  }

  class MockRedis {
    constructor(_connection: string, _options?: unknown) {}
    async quit(): Promise<void> {}
  }

  const reset = () => {
    processor = null;
    workerCalls.length = 0;
  };

  return { MockQueue, MockQueueEvents, MockWorker, MockRedis, workerCalls, reset };
});

vi.mock("bullmq", () => ({
  Queue: mocks.MockQueue,
  QueueEvents: mocks.MockQueueEvents,
  Worker: mocks.MockWorker
}));

vi.mock("ioredis", () => ({
  default: mocks.MockRedis
}));

import {
  configureExecutionQueue,
  createSingleJobPayload,
  resetExecutionQueueForTests
} from "../../src/orchestrator/jobQueue.js";
import type { ExecutionJobResult } from "../../src/orchestrator/jobQueue.js";
import type { SingleExecutionOptions } from "../../src/orchestrator/executionTypes.js";

const baseSingleOptions: SingleExecutionOptions = {
  sessionId: "session",
  systemPrompt: "system",
  executorPrompt: "executor",
  originalPrompt: "original",
  projectNameHint: "project",
  clarificationsUsed: false,
  clarificationQuestions: [],
  clarificationAsked: false
};

const singleJobResult = { type: "single", result: { response: {}, slug: "slug", targetRoot: "root" } } as unknown as ExecutionJobResult;

beforeEach(() => {
  resetExecutionQueueForTests();
  mocks.reset();
  delete process.env.REDIS_URL;
  delete process.env.BULLMQ_URL;
  delete process.env.EXECUTION_QUEUE_MODE;
});

afterEach(() => {
  resetExecutionQueueForTests();
  mocks.reset();
  delete process.env.REDIS_URL;
  delete process.env.BULLMQ_URL;
  delete process.env.EXECUTION_QUEUE_MODE;
});

describe("configureExecutionQueue", () => {
  it("returns inline controller when no Redis connection is provided", async () => {
    const handler = vi.fn(async () => singleJobResult);
    const controller = await configureExecutionQueue(handler, { mode: "inline" });
    expect(controller.mode).toBe("inline");

    const payload = createSingleJobPayload(baseSingleOptions);
    const result = await controller.submit(payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual(singleJobResult);
  });

  it("uses BullMQ when a connection string is available", async () => {
    process.env.BULLMQ_URL = "redis://stub";
    const handler = vi.fn(async () => singleJobResult);

    const controller = await configureExecutionQueue(handler, { mode: "bullmq" });
    expect(controller.mode).toBe("bullmq");

    const payload = createSingleJobPayload(baseSingleOptions);
    const result = await controller.submit(payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(mocks.workerCalls).toHaveLength(1);
    expect(result).toEqual(singleJobResult);
  });
});
