import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runWithLangGraph } from "../../src/orchestrator/graph.js";
import {
  createExecution,
  getExecution,
  __test as executionsStoreTestUtils,
} from "../../src/orchestrator/executionsStore.js";
import type { StepDescriptor, StepExecutionResult } from "../../src/orchestrator/stepQueue.js";
import type { StepQueue } from "../../src/orchestrator/stepQueue.js";

vi.mock("../../src/telemetry/events.js", () => ({
  logEvent: vi.fn(),
}));

vi.mock("../../src/orchestrator/abortSignal.js", () => ({
  cleanupAbortSignal: vi.fn(),
}));

describe("runWithLangGraph", () => {
  beforeEach(() => {
    executionsStoreTestUtils.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("completes executions with logs and output from StepQueue", async () => {
    const executionId = "graph-success";
    const sessionId = "session-123";
    createExecution(executionId, { status: "started", logs: [] });

    const stepResult: StepExecutionResult = {
      stepId: "step-1",
      stepType: "single",
      status: "completed",
      data: { response: { ok: true, project: { name: "demo" } } },
      stop: true,
      sequence: 0,
    };

    const descriptors: StepDescriptor[] = [{ type: "single", stopOnSuccess: true }];

    const fakeQueue: Partial<StepQueue> = {
      async runWorkflow(_session, _steps, options) {
        options?.onStep?.(stepResult);
        return { steps: [stepResult], last: stepResult };
      },
    };

    const result = await runWithLangGraph({
      executionId,
      sessionId,
      steps: descriptors,
      stepQueue: fakeQueue as StepQueue,
      deterministic: true,
      seed: 42,
    });

    expect(result.output).toEqual(stepResult.data?.response);
    expect(result.logs).toEqual([
      {
        stepId: "step-1",
        stepType: "single",
        status: "completed",
        sequence: 0,
        stop: true,
        data: stepResult.data,
      },
    ]);

    const record = getExecution(executionId);
    expect(record?.status).toBe("completed");
    expect(record?.result).toEqual(stepResult.data?.response);
    expect(record?.logs).toEqual(result.logs);
  });

  it("marks executions as failed when the workflow throws", async () => {
    const executionId = "graph-failure";
    const sessionId = "session-456";
    createExecution(executionId, { status: "started" });

    const descriptors: StepDescriptor[] = [{ type: "single" }];

    const failure = new Error("step failure");
    const fakeQueue: Partial<StepQueue> = {
      async runWorkflow() {
        throw failure;
      },
    };

    await expect(
      runWithLangGraph({
        executionId,
        sessionId,
        steps: descriptors,
        stepQueue: fakeQueue as StepQueue,
        deterministic: false,
        seed: 0,
      })
    ).rejects.toThrow("step failure");

    const record = getExecution(executionId);
    expect(record?.status).toBe("failed");
    expect(record?.error).toBe("step failure");
  });
});
