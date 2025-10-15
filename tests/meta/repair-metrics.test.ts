import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "metrics-demo",
      hasTests: true,
      files: [
        { path: "package.json", contents: JSON.stringify({ name: "demo", version: "1.0.0" }) },
        { path: "src/index.ts", contents: "export const add = (a:number,b:number)=>a+b;" },
        {
          path: "tests/index.test.ts",
          contents: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from '../src/index.js';\ntest('adds', () => { assert.equal(add(1, 2), 3); });"
        }
      ],
      notes: []
    })
  )
}));

vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn()
}));

vi.mock("../../src/repair/multiTurnRepair.js", () => ({
  multiTurnRepair: vi.fn()
}));

vi.mock("../../src/planning/decomposeTask.js", () => ({
  decomposeTask: vi.fn(async () => {
    throw new Error("Skip planning in metrics tests");
  })
}));

import { app } from "../../src/server.js";
import { runInSandbox } from "../../src/runner/runInSandbox.js";
import { multiTurnRepair } from "../../src/repair/multiTurnRepair.js";
import type { RunResult } from "../../src/contracts/validators.js";
import type { RepairHistory } from "../../src/contracts/repairHistoryValidator.js";
import type { ExecutorSuccessResponse } from "../../src/orchestrator/executionTypes.js";
import { postExecuteAndWait } from "../helpers/execute.js";

const runInSandboxMock = vi.mocked(runInSandbox);
const multiTurnRepairMock = vi.mocked(multiTurnRepair);

const OUTPUT_DIR = path.resolve("output");
const TELEMETRY_DIR = path.resolve(".telemetry");
const TELEMETRY_FILE = path.join(TELEMETRY_DIR, "events.log");

function buildRun(status: RunResult["status"], overrides: Partial<RunResult> = {}): RunResult {
  return {
    status,
    passCount: overrides.passCount ?? (status === "pass" ? 2 : 1),
    failCount: overrides.failCount ?? (status === "pass" ? 0 : 1),
    durationMs: overrides.durationMs ?? 600,
    logsPath: overrides.logsPath ?? `logs/${status}.log`,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    command: overrides.command,
    exitCode: overrides.exitCode,
    signal: overrides.signal,
    timedOut: overrides.timedOut,
    errorMessage: overrides.errorMessage,
    startedAt: overrides.startedAt,
    finishedAt: overrides.finishedAt
  };
}

function buildAttempt(
  number: number,
  status: "pass" | "fail" | "error",
  durationMs: number,
  changedFiles: string[],
  failureType?: string
): RepairHistory["attempts"][number] {
  return {
    number,
    status,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    changedFiles,
    summary: status === "pass" ? "Attempt succeeded" : `Attempt ${number} ${status}`,
    testResult: {
      status,
      passCount: status === "pass" ? 2 : 1,
      failCount: status === "pass" ? 0 : 1,
      durationMs,
      logsPath: `logs/attempt${number}.log`
    },
    failureAnalysis: failureType
      ? {
          category: failureType,
          failedTests: [],
          totalFailed: 1
        }
      : undefined,
    durationMs,
    cumulativeTime: durationMs * number
  };
}

function writeMetaPath(projectName: string) {
  return path.join(OUTPUT_DIR, projectName, "_executor_meta.json");
}

beforeEach(async () => {
  // Targeted cleanup: only this file's project and telemetry log
  await fs.rm(path.join(OUTPUT_DIR, "metrics-demo"), { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(TELEMETRY_DIR, { recursive: true });
  await fs.rm(TELEMETRY_FILE, { force: true });
  runInSandboxMock.mockReset();
  multiTurnRepairMock.mockReset();
});

afterEach(async () => {
  await fs.rm(path.join(OUTPUT_DIR, "metrics-demo"), { recursive: true, force: true });
});

describe("repair metrics telemetry", () => {
  it("includes metrics and efficiency for successful repairs", async () => {
    runInSandboxMock.mockResolvedValueOnce(buildRun("fail"));

    const history: RepairHistory = {
      attempts: [
        buildAttempt(1, "fail", 800, ["src/index.ts"], "assertion"),
        buildAttempt(2, "pass", 900, ["src/index.ts"])
      ],
      finalStatus: "pass",
      totalAttempts: 2,
      successAttemptNumber: 2
    };

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "metrics-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);

    const metaRaw = await fs.readFile(writeMetaPath("metrics-demo"), "utf-8");
    const meta = JSON.parse(metaRaw);
    expect(meta.repairMetrics.totalAttempts).toBe(2);
    expect(meta.repairMetrics.successAttempt).toBe(2);
    expect(meta.repairMetrics.timePerAttempt).toEqual([800, 900]);
    expect(meta.repairMetrics.failureTypes).toContain("assertion");
    expect(meta.repairMetrics.attemptEfficiency).toBeCloseTo(1);
  });

  it("marks exhausted runs and zero efficiency when repairs fail", async () => {
    runInSandboxMock.mockResolvedValueOnce(buildRun("fail"));

    const history: RepairHistory = {
      attempts: [
        buildAttempt(1, "fail", 600, ["src/index.ts"], "timeout"),
        buildAttempt(2, "fail", 700, ["src/index.ts"], "exception"),
        buildAttempt(3, "fail", 650, ["src/index.ts"], "syntax"),
        buildAttempt(4, "fail", 720, ["src/index.ts"], "multiple")
      ],
      finalStatus: "exhausted",
      totalAttempts: 4
    };

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "metrics-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);

    const metaRaw = await fs.readFile(writeMetaPath("metrics-demo"), "utf-8");
    const meta = JSON.parse(metaRaw);
    expect(meta.repairMetrics.totalAttempts).toBe(4);
    expect(meta.repairMetrics.exhausted).toBe(true);
    expect(meta.repairMetrics.attemptEfficiency).toBe(0);
    expect(meta.repairMetrics.failureTypes).toEqual(["timeout", "exception", "syntax", "multiple"]);
  });

  it("handles scenarios with no repair attempts needed", async () => {
    const initialRun = buildRun("pass", { durationMs: 500 });
    runInSandboxMock.mockResolvedValueOnce(initialRun);

    const history: RepairHistory = {
      attempts: [
        {
          number: 1,
          status: "pass",
          startedAt: initialRun.startedAt ?? new Date().toISOString(),
          finishedAt: initialRun.finishedAt ?? new Date().toISOString(),
          changedFiles: [],
          summary: "Initial test run passed - no repair needed.",
          testResult: {
            status: "pass",
            passCount: initialRun.passCount,
            failCount: initialRun.failCount,
            durationMs: initialRun.durationMs,
            logsPath: initialRun.logsPath
          },
          durationMs: initialRun.durationMs,
          cumulativeTime: initialRun.durationMs
        }
      ],
      finalStatus: "pass",
      totalAttempts: 1,
      successAttemptNumber: 1
    };

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "metrics-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);

    const metaRaw = await fs.readFile(writeMetaPath("metrics-demo"), "utf-8");
    const meta = JSON.parse(metaRaw);
    expect(meta.repairMetrics.totalAttempts).toBe(1);
    expect(meta.repairMetrics.successAttempt).toBe(1);
    expect(meta.repairMetrics.timePerAttempt).toEqual([500]);
    expect(meta.repairMetrics.failureTypes).toEqual([]);
    expect(meta.repairMetrics.attemptEfficiency).toBe(1);
    expect(meta.repairMetrics.exhausted).toBe(false);
  });
});
