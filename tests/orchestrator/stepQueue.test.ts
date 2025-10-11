import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PausedError } from "../../src/orchestrator/abortSignal.js";
import { loadWorkflow } from "../../src/orchestrator/checkpointStore.js";
import { StepQueue } from "../../src/orchestrator/stepQueue.js";
import { resetExecutionQueueForTests } from "../../src/orchestrator/jobQueue.js";

const WORKFLOW_ROOT = path.resolve(".automation", "checkpoints", "step-workflows");

async function clearWorkflows() {
  await fs.rm(WORKFLOW_ROOT, { recursive: true, force: true });
}

describe("StepQueue", () => {
  beforeEach(async () => {
    await clearWorkflows();
    resetExecutionQueueForTests();
  });

  afterEach(async () => {
    await clearWorkflows();
    resetExecutionQueueForTests();
  });

  it("executes registered steps and persists completion", async () => {
    const queue = await StepQueue.create({ mode: "inline" });
    queue.registerHandler("clarify", async context => {
      expect(context.sessionId).toBe("session-alpha");
      expect(context.queueMode).toBe("inline");
      return { status: "completed", data: { note: "clarified" }, stop: true };
    });

    const result = await queue.runWorkflow("session-alpha", [{ type: "clarify" }]);
    expect(result.last?.status).toBe("completed");
    expect(result.last?.data).toEqual({ note: "clarified" });

    const workflow = await loadWorkflow("session-alpha");
    expect(workflow).not.toBeNull();
    expect(workflow?.steps).toHaveLength(1);
    expect(workflow?.steps[0]?.status).toBe("completed");
    expect(workflow?.steps[0]?.result).toEqual({ note: "clarified" });
  });

  it("continues optional steps after failure and records status", async () => {
    const queue = await StepQueue.create({ mode: "inline" });

    queue.registerHandler("plan", async () => {
      throw new Error("plan failed");
    });

    queue.registerHandler("single", async () => {
      return { status: "completed", data: { response: { ok: true } }, stop: true };
    });

    const result = await queue.runWorkflow("session-beta", [
      { type: "plan", optional: true },
      { type: "single" }
    ]);

    expect(result.steps).toHaveLength(1);
    expect(result.last?.stepType).toBe("single");
    expect(result.last?.status).toBe("completed");

    const workflow = await loadWorkflow("session-beta");
    expect(workflow?.steps).toHaveLength(2);
    const [planStep, singleStep] = workflow!.steps;
    expect(planStep.status).toBe("failed");
    expect(singleStep.status).toBe("completed");
  });

  it("propagates pauses and records paused status", async () => {
    const queue = await StepQueue.create({ mode: "inline" });

    queue.registerHandler("generate", async ({ sessionId }) => {
      throw new PausedError(sessionId, "generate");
    });

    await expect(() => queue.runWorkflow("session-gamma", [{ type: "generate" }])).rejects.toThrow(PausedError);

    const workflow = await loadWorkflow("session-gamma");
    expect(workflow?.steps).toHaveLength(1);
    expect(workflow?.steps[0]?.status).toBe("paused");
  });

  it("allows enqueuing additional steps without resetting history", async () => {
    const queue = await StepQueue.create({ mode: "inline" });

    queue.registerHandler("clarify", async () => ({ status: "completed" }));
    queue.registerHandler("single", async () => ({ status: "completed", data: { done: true }, stop: true }));

    await queue.runWorkflow("session-delta", [{ type: "clarify" }]);
    await queue.enqueueStep({ sessionId: "session-delta", stepType: "single" });

    const workflow = await loadWorkflow("session-delta");
    expect(workflow?.steps).toHaveLength(2);
    expect(workflow?.steps[1]?.status).toBe("completed");
  });

  it("resetSession clears prior checkpoints", async () => {
    const queue = await StepQueue.create({ mode: "inline" });
    queue.registerHandler("clarify", async () => ({ status: "completed" }));

    await queue.runWorkflow("session-epsilon", [{ type: "clarify" }]);
    await queue.resetSession("session-epsilon");

    const workflow = await loadWorkflow("session-epsilon");
    expect(workflow).toBeNull();
  });
});
