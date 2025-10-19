import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/server.js";
import {
  __test as executionsStoreTestUtils,
  getExecution,
} from "../src/domain/executionsStore.js";
import * as stepQueueModule from "../src/lib/stepQueueAdapter.js";

describe("/execute and /executions routes", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    executionsStoreTestUtils.clear();
  });

  afterEach(() => {
    executionsStoreTestUtils.clear();
  });

  it("creates a running execution and enqueues work", async () => {
    const enqueueExecution = vi.fn().mockResolvedValue(undefined);
    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      enqueueExecution,
    });

    const app = createApp();

    const response = await request(app)
      .post("/execute")
      .send({ prompt: "hello" })
      .expect(202);

    expect(response.headers["location"]).toMatch(/^\/executions\//);
    expect(response.body).toMatchObject({
      executionId: expect.any(String),
      status: "running",
      location: response.headers["location"],
    });

    expect(enqueueExecution).toHaveBeenCalledWith({
      executionId: response.body.executionId,
      payload: { prompt: "hello" },
    });

    const stored = getExecution(response.body.executionId);
    expect(stored).not.toBeNull();
    expect(stored?.status).toBe("running");

    createAdapterMock.mockRestore();
  });

  it("returns execution status for existing executions", async () => {
    const enqueueExecution = vi.fn().mockResolvedValue(undefined);
    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      enqueueExecution,
    });

    const app = createApp();

    const { body } = await request(app).post("/execute").send({}).expect(202);

    const statusResponse = await request(app)
      .get(`/executions/${body.executionId}`)
      .expect(200);

    expect(statusResponse.body).toMatchObject({
      id: body.executionId,
      status: "running",
    });

    createAdapterMock.mockRestore();
  });

  it("fails gracefully when enqueueing throws", async () => {
    const enqueueExecution = vi.fn().mockRejectedValue(new Error("queue offline"));
    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      enqueueExecution,
    });

    const app = createApp();

    const response = await request(app).post("/execute").send({}).expect(502);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 502,
      title: "Bad Gateway",
      detail: "Failed to enqueue execution",
    });

    const executionId = enqueueExecution.mock.calls[0]?.[0]?.executionId;
    expect(executionId).toBeDefined();
    const stored = executionId ? getExecution(executionId) : null;
    expect(stored?.status).toBe("failed");
    expect(stored?.error).toBe("queue offline");

    createAdapterMock.mockRestore();
  });

  it("returns problem details for missing executions", async () => {
    const enqueueExecution = vi.fn().mockResolvedValue(undefined);
    const createAdapterMock = vi.spyOn(stepQueueModule, "createStepQueueAdapter").mockReturnValue({
      enqueueExecution,
    });

    const app = createApp();

    const response = await request(app).get("/executions/missing").expect(404);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 404,
      title: "Not Found",
      detail: "execution not found",
    });

    createAdapterMock.mockRestore();
  });
});
