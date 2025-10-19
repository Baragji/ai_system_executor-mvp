import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ClarificationRequiredError,
  SimplePromptBypassError,
  TaskPlanValidationError,
  type PlanExecutionResult,
  type TaskPlan,
} from "../src/domain/planning.js";
import { createApp } from "../src/server.js";
import * as telemetry from "../src/telemetry/otel.js";

const decomposeTaskMock = vi.fn();
const executeTaskPlanMock = vi.fn();
const estimateCompletionMock = vi.fn();
const createPlanExecutionContextMock = vi.fn();

vi.mock("../src/domain/planning.js", async () => {
  const actual = await vi.importActual<typeof import("../src/domain/planning.js")>(
    "../src/domain/planning.js",
  );

  return {
    ...actual,
    decomposeTask: (...args: unknown[]) => decomposeTaskMock(...args),
    executeTaskPlan: (...args: unknown[]) => executeTaskPlanMock(...args),
    estimateCompletion: (...args: unknown[]) => estimateCompletionMock(...args),
  };
});

vi.mock("../src/domain/context.js", () => ({
  createPlanExecutionContext: (...args: unknown[]) => createPlanExecutionContextMock(...args),
}));

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.PROBLEM_DETAILS_ENABLED = "1";
  delete process.env.OTEL_ENABLED;
  decomposeTaskMock.mockReset();
  executeTaskPlanMock.mockReset();
  estimateCompletionMock.mockReset();
  createPlanExecutionContextMock.mockReset();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("planning service", () => {
  it("returns health status", async () => {
    const app = createApp();

    const response = await request(app).get("/healthz").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns RFC 9457 problem details for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/missing").expect(404);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 404,
      title: "Not Found",
      detail: "Resource not found",
      instance: "/missing",
      method: "GET",
    });
  });

  it("does not start telemetry when OTEL_ENABLED is falsy", () => {
    process.env.OTEL_ENABLED = "0";

    expect(() => telemetry.maybeInitTelemetry()).not.toThrow();
  });

  it("decomposes prompts through POST /decompose", async () => {
    const app = createApp();
    const plan: TaskPlan = {
      originalPrompt: "build app",
      subtasks: [],
      totalSubtasks: 0,
    };
    decomposeTaskMock.mockResolvedValue(plan);

    const response = await request(app)
      .post("/decompose")
      .send({ prompt: " build app  ", clarifications: { answers: [] } })
      .expect(200);

    expect(response.body).toEqual({ plan });
    expect(decomposeTaskMock).toHaveBeenCalledWith("build app", { answers: [] });
  });

  it("validates prompt input for POST /decompose", async () => {
    const app = createApp();

    const response = await request(app).post("/decompose").send({}).expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      detail: "prompt is required",
    });
    expect(decomposeTaskMock).not.toHaveBeenCalled();
  });

  it("returns problem details when decomposition needs clarifications", async () => {
    const app = createApp();
    decomposeTaskMock.mockRejectedValue(new ClarificationRequiredError("collect clarifications"));

    const response = await request(app)
      .post("/decompose")
      .send({ prompt: "build" })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      title: "Bad Request",
      detail: "collect clarifications",
      code: "clarification_required",
    });
  });

  it("returns conflict when prompt is simple", async () => {
    const app = createApp();
    decomposeTaskMock.mockRejectedValue(new SimplePromptBypassError("use single execution"));

    const response = await request(app)
      .post("/decompose")
      .send({ prompt: "hello" })
      .expect(409);

    expect(response.body).toMatchObject({
      status: 409,
      title: "Conflict",
      code: "simple_prompt_bypass",
    });
  });

  it("returns validation issues from TaskPlanValidationError", async () => {
    const app = createApp();
    decomposeTaskMock.mockRejectedValue(new TaskPlanValidationError("invalid", []));

    const response = await request(app)
      .post("/decompose")
      .send({ prompt: "build complex app" })
      .expect(422);

    expect(response.body).toMatchObject({
      status: 422,
      title: "Unprocessable Content",
      code: "plan_validation_failed",
      issues: [],
    });
  });

  it("executes plans through POST /execute-plan", async () => {
    const app = createApp();
    const plan: TaskPlan = {
      originalPrompt: "build app",
      subtasks: [],
      totalSubtasks: 0,
    };
    const result: PlanExecutionResult = {
      status: "completed",
      subtaskResults: [],
      progress: {
        totalSubtasks: 0,
        completedSubtasks: 0,
        failedSubtasks: 0,
        currentSubtask: null,
        elapsedMs: 0,
        percentComplete: 100,
      },
      totalDurationMs: 10,
      failedSubtasks: [],
      completedSubtasks: [],
    };
    const estimate = {
      estimatedRemainingMs: 0,
      estimatedCompletionTimestamp: new Date().toISOString(),
      confidenceLevel: "high" as const,
      basedOn: "test",
    };

    createPlanExecutionContextMock.mockReturnValue({});
    executeTaskPlanMock.mockResolvedValue(result);
    estimateCompletionMock.mockReturnValue(estimate);

    const payload = {
      plan,
      targetRoot: "/tmp/project",
      slug: "project",
      effectivePrompt: "build app",
      systemPrompt: "system",
      sessionId: "abc123",
    };

    const response = await request(app).post("/execute-plan").send(payload).expect(200);

    expect(createPlanExecutionContextMock).toHaveBeenCalledWith({
      targetRoot: payload.targetRoot,
      slug: payload.slug,
      effectivePrompt: payload.effectivePrompt,
      clarifications: undefined,
      systemPrompt: payload.systemPrompt,
      sessionId: payload.sessionId,
    });
    expect(executeTaskPlanMock).toHaveBeenCalledWith(plan, {});
    expect(estimateCompletionMock).toHaveBeenCalledWith(result.progress, plan);
    expect(response.body).toEqual({ result, estimate });
  });

  it("validates required fields for POST /execute-plan", async () => {
    const app = createApp();

    const response = await request(app).post("/execute-plan").send({ plan: {} }).expect(400);

    expect(response.body).toMatchObject({ status: 400 });
    expect(createPlanExecutionContextMock).not.toHaveBeenCalled();
    expect(executeTaskPlanMock).not.toHaveBeenCalled();
  });

  it("propagates abort errors for POST /execute-plan", async () => {
    const app = createApp();
    const error = new Error("aborted");
    (error as Error & { code?: string }).code = "ABORT_ERR";
    createPlanExecutionContextMock.mockReturnValue({});
    executeTaskPlanMock.mockRejectedValue(error);

    const response = await request(app)
      .post("/execute-plan")
      .send({
        plan: { originalPrompt: "", subtasks: [], totalSubtasks: 0 },
        targetRoot: "/tmp",
        slug: "demo",
        effectivePrompt: "do it",
        systemPrompt: "sys",
      })
      .expect(409);

    expect(response.body).toMatchObject({
      status: 409,
      code: "ABORT_ERR",
    });
  });
});
