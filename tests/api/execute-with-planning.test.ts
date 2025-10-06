import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/planning/decomposeTask.js", () => ({
  decomposeTask: vi.fn()
}));

vi.mock("../../src/planning/validateDecomposition.js", () => ({
  validateDecomposition: vi.fn()
}));

vi.mock("../../src/planning/executeTaskPlan.js", () => ({
  executeTaskPlan: vi.fn()
}));

vi.mock("../../src/planning/estimateCompletion.js", () => ({
  estimateCompletion: vi.fn()
}));

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "fallback-project",
      hasTests: true,
      files: [
        { path: "package.json", contents: "{}" },
        { path: "src/index.ts", contents: "export const value = 1;" },
        { path: "tests/index.test.ts", contents: "test('ok', () => {});" }
      ]
    })
  )
}));

vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn(async () => ({
    status: "pass",
    passCount: 2,
    failCount: 0,
    durationMs: 500,
    logsPath: "logs/pass.log",
    timestamp: new Date().toISOString()
  }))
}));

vi.mock("../../src/repair/multiTurnRepair.js", () => ({
  multiTurnRepair: vi.fn(async ({ initialTestResult }) => ({
    attempts: [
      {
        number: 1,
        status: initialTestResult.status,
        changedFiles: [],
        summary: "no repair",
        testResult: {
          status: initialTestResult.status,
          passCount: initialTestResult.passCount,
          failCount: initialTestResult.failCount,
          durationMs: initialTestResult.durationMs,
          logsPath: initialTestResult.logsPath
        },
        durationMs: initialTestResult.durationMs,
        cumulativeTime: initialTestResult.durationMs
      }
    ],
    finalStatus: initialTestResult.status === "pass" ? "pass" : "fail",
    totalAttempts: 1
  }))
}));

import { app } from "../../src/server.js";
import type { TimeEstimate } from "../../src/planning/types.js";
import { decomposeTask } from "../../src/planning/decomposeTask.js";
import { validateDecomposition } from "../../src/planning/validateDecomposition.js";
import { executeTaskPlan } from "../../src/planning/executeTaskPlan.js";
import { estimateCompletion } from "../../src/planning/estimateCompletion.js";
import { generateJSON } from "../../src/llm/index.js";
import { runInSandbox } from "../../src/runner/runInSandbox.js";
import { multiTurnRepair } from "../../src/repair/multiTurnRepair.js";

const decomposeTaskMock = vi.mocked(decomposeTask);
const validateDecompositionMock = vi.mocked(validateDecomposition);
const executeTaskPlanMock = vi.mocked(executeTaskPlan);
const estimateCompletionMock = vi.mocked(estimateCompletion);
const generateJSONMock = vi.mocked(generateJSON);
const runInSandboxMock = vi.mocked(runInSandbox);
const multiTurnRepairMock = vi.mocked(multiTurnRepair);

const OUTPUT_DIR = path.resolve("output");

beforeEach(async () => {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  decomposeTaskMock.mockReset();
  validateDecompositionMock.mockReset();
  executeTaskPlanMock.mockReset();
  estimateCompletionMock.mockReset();
  generateJSONMock.mockClear();
  runInSandboxMock.mockClear();
  multiTurnRepairMock.mockClear();
});

afterEach(async () => {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
});

function createPlanExecutionResult(status: "completed" | "partial" | "failed" = "completed") {
  return {
    status,
    subtaskResults: [
      {
        status: "completed" as const,
        subtaskId: "setup",
        generatedFiles: [],
        testResult: null,
        repairHistory: null,
        durationMs: 120
      },
      {
        status: status === "completed" ? "completed" : "failed",
        subtaskId: "feature",
        generatedFiles: [],
        testResult: null,
        repairHistory: null,
        durationMs: 220
      }
    ],
    progress: {
      totalSubtasks: 2,
      completedSubtasks: status === "failed" ? 1 : 2,
      failedSubtasks: status === "failed" ? 1 : 0,
      currentSubtask: null,
      elapsedMs: 340,
      percentComplete: status === "failed" ? 50 : 100
    },
    totalDurationMs: 340,
    failedSubtasks: status === "failed" ? ["feature"] : [],
    completedSubtasks: status === "failed" ? ["setup"] : ["setup", "feature"]
  };
}

function createTimeEstimate(): TimeEstimate {
  return {
    estimatedRemainingMs: 1200,
    estimatedCompletionTimestamp: new Date().toISOString(),
    confidenceLevel: "medium",
    basedOn: "test"
  };
}

describe("POST /api/execute with planning", () => {
  it("keeps existing flow for simple prompts", async () => {
    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "build flask hello world" })
      .expect(200);

    expect(decomposeTaskMock).not.toHaveBeenCalled();
    expect(res.body.taskPlanUsed).toBe(false);
    expect(res.body.taskPlan).toBeNull();
    expect(res.body.planExecutionResult).toBeNull();
  });

  it("executes plan for complex prompt", async () => {
    decomposeTaskMock.mockResolvedValueOnce({
      originalPrompt: "build todo app with auth",
      subtasks: [
        { id: "setup", title: "Setup", description: "init", status: "pending" },
        { id: "feature", title: "Feature", description: "build", status: "pending" }
      ],
      totalSubtasks: 2
    });
    validateDecompositionMock.mockReturnValueOnce({
      score: 85,
      issues: [],
      warnings: [],
      requiresHumanReview: false
    });
    executeTaskPlanMock.mockResolvedValueOnce(createPlanExecutionResult("completed"));
    estimateCompletionMock.mockReturnValueOnce(createTimeEstimate());

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "build todo app with auth and database" })
      .expect(200);

    expect(decomposeTaskMock).toHaveBeenCalled();
    expect(validateDecompositionMock).toHaveBeenCalled();
    expect(executeTaskPlanMock).toHaveBeenCalled();
    expect(estimateCompletionMock).toHaveBeenCalled();
    expect(res.body.taskPlanUsed).toBe(true);
    expect(res.body.taskPlan.subtasks).toHaveLength(2);
    expect(res.body.planExecutionResult.status).toBe("completed");
    expect(res.body.timeEstimate).toBeTruthy();

    const slug = res.body.project;
    const metaPath = path.join(OUTPUT_DIR, slug, "_executor_meta.json");
    const metaRaw = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaRaw);
    expect(meta.taskPlanUsed).toBe(true);
    expect(meta.decompositionQuality).toBe(85);
    expect(meta.planningMetrics.totalSubtasks).toBe(2);
  });

  it("falls back to single execution when plan quality low", async () => {
    decomposeTaskMock.mockResolvedValueOnce({
      originalPrompt: "build analytics dashboard",
      subtasks: [],
      totalSubtasks: 0
    });
    validateDecompositionMock.mockReturnValueOnce({
      score: 50,
      issues: [],
      warnings: [],
      requiresHumanReview: false
    });

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "build analytics dashboard with charts and filters" })
      .expect(200);

    expect(res.body.taskPlanUsed).toBe(false);
    expect(generateJSONMock).toHaveBeenCalled();
    expect(runInSandboxMock).toHaveBeenCalled();
    expect(multiTurnRepairMock).toHaveBeenCalled();
  });

  it("returns partial status when plan execution fails", async () => {
    decomposeTaskMock.mockResolvedValueOnce({
      originalPrompt: "build app",
      subtasks: [
        { id: "setup", title: "Setup", description: "init", status: "pending" },
        { id: "feature", title: "Feature", description: "build", status: "pending" }
      ],
      totalSubtasks: 2
    });
    validateDecompositionMock.mockReturnValueOnce({
      score: 90,
      issues: [],
      warnings: [],
      requiresHumanReview: false
    });
    executeTaskPlanMock.mockResolvedValueOnce(createPlanExecutionResult("partial"));
    estimateCompletionMock.mockReturnValueOnce(createTimeEstimate());

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "build ecommerce platform with auth and payments" })
      .expect(200);

    expect(res.body.planExecutionResult.status).toBe("partial");
    expect(res.body.taskPlanUsed).toBe(true);
  });
});
