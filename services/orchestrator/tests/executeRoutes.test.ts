import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/server.js";
import {
  __test as executionsStoreTestUtils,
  getExecution,
} from "../src/domain/executionsStore.js";
import * as stepQueueModule from "../src/domain/stepQueueAdapter.js";

async function waitForCondition(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        reject(new Error("Timed out waiting for condition"));
        return;
      }

      setTimeout(check, 5);
    };

    check();
  });
}

describe("/execute and /executions routes", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    executionsStoreTestUtils.clear();
  });

  afterEach(() => {
    executionsStoreTestUtils.clear();
  });

  it("delegates to the StepQueue adapter, records logs, and completes executions", async () => {
    const stepDescriptors = [
      { type: "plan", payload: { stage: "plan" } },
      { type: "single", payload: { stage: "single" } },
    ];

    const runWorkflow = vi.fn((sessionId: string, steps, hooks) => {
      expect(sessionId).toBe("session-123");
      expect(steps).toEqual(stepDescriptors);

      const stepOne = {
        stepId: "step-1",
        stepType: "plan",
        status: "completed",
        sequence: 0,
        stop: false,
        data: { response: { message: "planned" } },
      } as const;
      const stepTwo = {
        stepId: "step-2",
        stepType: "single",
        status: "completed",
        sequence: 1,
        stop: true,
        data: { response: { message: "ok" } },
      } as const;

      hooks?.onStep?.(stepOne);
      hooks?.onStep?.(stepTwo);

      return Promise.resolve({ steps: [stepOne, stepTwo], last: stepTwo });
    });

    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      runWorkflow,
    });

    const app = createApp();

    const response = await request(app)
      .post("/execute")
      .send({ sessionId: "session-123", steps: stepDescriptors })
      .expect(202);

    expect(response.headers["location"]).toMatch(/^\/executions\//);

    const executionId = response.body.executionId as string;
    await waitForCondition(() => getExecution(executionId)?.status === "completed");

    const stored = getExecution(executionId);
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("completed");
    expect(stored?.result).toEqual({ message: "ok" });
    expect(stored?.logs).toEqual([
      {
        stepId: "step-1",
        stepType: "plan",
        status: "completed",
        sequence: 0,
        stop: false,
        data: { response: { message: "planned" } },
      },
      {
        stepId: "step-2",
        stepType: "single",
        status: "completed",
        sequence: 1,
        stop: true,
        data: { response: { message: "ok" } },
      },
    ]);

    createAdapterMock.mockRestore();
  });

  it("returns running execution status while workflow is in progress", async () => {
    const stepDescriptors = [{ type: "single", payload: { stage: "single" } }];

    let resolveWorkflow: ((value: { steps: unknown[]; last: unknown }) => void) | undefined;

    const runWorkflow = vi.fn((_sessionId: string, steps, hooks) => {
      expect(steps).toEqual(stepDescriptors);

      const runningStep = {
        stepId: "step-1",
        stepType: "single",
        status: "running",
        sequence: 0,
        stop: false,
        data: { progress: 25 },
      } as const;

      hooks?.onStep?.(runningStep);

      return new Promise(resolve => {
        resolveWorkflow = resolve;
      });
    });

    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      runWorkflow,
    });

    const app = createApp();

    const response = await request(app)
      .post("/execute")
      .send({ steps: stepDescriptors })
      .expect(202);

    const executionId = response.body.executionId as string;

    const statusResponse = await request(app).get(`/executions/${executionId}`).expect(200);
    expect(statusResponse.body).toMatchObject({ id: executionId, status: "running" });
    expect(statusResponse.body.logs).toEqual([
      {
        stepId: "step-1",
        stepType: "single",
        status: "running",
        sequence: 0,
        stop: false,
        data: { progress: 25 },
      },
    ]);

    resolveWorkflow?.({
      steps: [
        {
          stepId: "step-1",
          stepType: "single",
          status: "completed",
          sequence: 0,
          stop: true,
          data: { response: { message: "done" } },
        },
      ],
      last: {
        stepId: "step-1",
        stepType: "single",
        status: "completed",
        sequence: 0,
        stop: true,
        data: { response: { message: "done" } },
      },
    });

    await waitForCondition(() => getExecution(executionId)?.status === "completed");

    createAdapterMock.mockRestore();
  });

  it("marks executions as failed when the workflow rejects", async () => {
    const stepDescriptors = [{ type: "single", payload: {} }];

    const runWorkflow = vi.fn().mockImplementation(() => Promise.reject(new Error("runtime offline")));

    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      runWorkflow,
    });

    const app = createApp();

    const response = await request(app)
      .post("/execute")
      .send({ steps: stepDescriptors })
      .expect(202);

    const executionId = response.body.executionId as string;
    await waitForCondition(() => getExecution(executionId)?.status === "failed");

    const stored = getExecution(executionId);
    expect(stored?.error).toBe("runtime offline");

    createAdapterMock.mockRestore();
  });

  it("returns problem details when the StepQueue adapter throws synchronously", async () => {
    const stepDescriptors = [{ type: "single", payload: {} }];

    const runWorkflow = vi.fn(() => {
      throw new Error("adapter misconfigured");
    });

    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      runWorkflow,
    });

    const app = createApp();

    const response = await request(app)
      .post("/execute")
      .send({ steps: stepDescriptors })
      .expect(502);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 502,
      title: "Bad Gateway",
      detail: "Failed to start execution",
    });

    const executionId = response.body.executionId as string | undefined;
    if (executionId) {
      const stored = getExecution(executionId);
      expect(stored?.status).toBe("failed");
      expect(stored?.error).toBe("adapter misconfigured");
    }

    createAdapterMock.mockRestore();
  });

  it("returns problem details for missing executions", async () => {
    const app = createApp();

    const response = await request(app).get("/executions/missing").expect(404);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 404,
      title: "Not Found",
      detail: "execution not found",
    });
  });
});
