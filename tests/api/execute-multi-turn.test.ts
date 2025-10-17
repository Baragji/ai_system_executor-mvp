import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "multi-turn-demo",
      hasTests: true,
      files: [
        { path: "package.json", contents: JSON.stringify({ name: "demo", version: "1.0.0" }) },
        { path: "src/index.ts", contents: "export const add = (a:number,b:number)=>a+b;" },
        {
          path: "tests/index.test.ts",
          contents: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from '../src/index.js';\ntest('adds', () => { assert.equal(add(1, 2), 3); });"
        }
      ],
      notes: ["Generated for multi-turn tests"]
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
    throw new Error("Skip planning in multi-turn tests");
  })
}));

import { app } from "../../src/server.js";
import { generateJSON } from "../../src/llm/index.js";
import { runInSandbox } from "../../src/runner/runInSandbox.js";
import { multiTurnRepair } from "../../src/repair/multiTurnRepair.js";
import type { RunResult } from "../../src/contracts/validators.js";
import type { RepairHistory } from "../../src/contracts/repairHistoryValidator.js";
import type { ExecutorSuccessResponse } from "../../src/orchestrator/executionTypes.js";
import { postExecuteAndWait } from "../helpers/execute.js";

const generateJSONMock = vi.mocked(generateJSON);
const runInSandboxMock = vi.mocked(runInSandbox);
const multiTurnRepairMock = vi.mocked(multiTurnRepair);

const OUTPUT_DIR = path.resolve("output");
const TELEMETRY_FILE = path.resolve(".telemetry/events.log");

function buildRunResult(status: RunResult["status"], overrides: Partial<RunResult> = {}): RunResult {
  return {
    status,
    passCount: overrides.passCount ?? (status === "pass" ? 2 : 1),
    failCount: overrides.failCount ?? (status === "pass" ? 0 : 1),
    durationMs: overrides.durationMs ?? 500,
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

function buildHistory(attempts: RepairHistory["attempts"], finalStatus: RepairHistory["finalStatus"], successAttempt?: number): RepairHistory {
  return {
    attempts,
    finalStatus,
    totalAttempts: attempts.length,
    successAttemptNumber: successAttempt
  };
}

beforeEach(async () => {
  // Targeted cleanup: only remove this test's project; avoid resetting global telemetry file
  await fs.rm(path.join(OUTPUT_DIR, "multi-turn-demo"), { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(TELEMETRY_FILE), { recursive: true });
  generateJSONMock.mockClear();
  runInSandboxMock.mockReset();
  multiTurnRepairMock.mockReset();
});

afterEach(async () => {
  await fs.rm(path.join(OUTPUT_DIR, "multi-turn-demo"), { recursive: true, force: true });
});

describe("/api/execute multi-turn integration", () => {
  it("execute with initial pass - no repair attempts", async () => {
    const initialRun = buildRunResult("pass", { logsPath: "logs/initial-pass.log" });
    runInSandboxMock.mockResolvedValueOnce(initialRun);

    const history = buildHistory(
      [
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
      "pass",
      1
    );

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "multi-turn-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);
    const payload = result.payload;

    expect(payload.repairHistory.totalAttempts).toBe(1);
    expect(payload.repairHistory.finalStatus).toBe("pass");
    expect(payload.repair.attempted).toBe(false);
    expect(payload.repair.repaired).toBe(true);
    expect(payload.testResults.afterRepair).toBeNull();
  });

  it("execute with single repair success - repairHistory has 1 attempt", async () => {
    const initialRun = buildRunResult("fail", { logsPath: "logs/initial.log" });
    runInSandboxMock.mockResolvedValueOnce(initialRun);

    const finalRun = buildRunResult("pass", { logsPath: "logs/repair.log", durationMs: 700 });

    const history = buildHistory(
      [
        {
          number: 1,
          status: "pass",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          changedFiles: ["src/index.ts"],
          summary: "Attempt succeeded",
          testResult: {
            status: "pass",
            passCount: finalRun.passCount,
            failCount: finalRun.failCount,
            durationMs: finalRun.durationMs,
            logsPath: finalRun.logsPath
          },
          durationMs: finalRun.durationMs,
          cumulativeTime: finalRun.durationMs
        }
      ],
      "pass",
      1
    );

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "multi-turn-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);
    const payload = result.payload;

    expect(payload.repairHistory.totalAttempts).toBe(1);
    expect(payload.repairHistory.successAttemptNumber).toBe(1);
    expect(payload.testResults.afterRepair?.status).toBe("pass");
  });

  it("execute with multi-turn success - repairHistory shows progression", async () => {
    const initialRun = buildRunResult("fail", { logsPath: "logs/initial.log" });
    runInSandboxMock.mockResolvedValueOnce(initialRun);

    const history = buildHistory(
      [
        {
          number: 1,
          status: "fail",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          changedFiles: ["src/index.ts"],
          summary: "First attempt failed",
          testResult: {
            status: "fail",
            passCount: 1,
            failCount: 1,
            durationMs: 800,
            logsPath: "logs/attempt1.log"
          },
          durationMs: 800,
          cumulativeTime: 800
        },
        {
          number: 2,
          status: "fail",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          changedFiles: ["src/index.ts"],
          summary: "Second attempt failed",
          testResult: {
            status: "fail",
            passCount: 1,
            failCount: 1,
            durationMs: 900,
            logsPath: "logs/attempt2.log"
          },
          durationMs: 900,
          cumulativeTime: 1700
        },
        {
          number: 3,
          status: "pass",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          changedFiles: ["src/index.ts"],
          summary: "Final attempt succeeded",
          testResult: {
            status: "pass",
            passCount: 2,
            failCount: 0,
            durationMs: 950,
            logsPath: "logs/attempt3.log"
          },
          durationMs: 950,
          cumulativeTime: 2650
        }
      ],
      "pass",
      3
    );

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "multi-turn-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);
    const payload = result.payload;

    expect(payload.repairHistory.totalAttempts).toBe(3);
    expect(payload.repairHistory.successAttemptNumber).toBe(3);
    expect(payload.testResults.afterRepair?.status).toBe("pass");
    expect(payload.repairHistory.attempts[0].status).toBe("fail");
  });

  it("execute with all attempts exhausted - repairHistory shows 4 attempts", async () => {
    const initialRun = buildRunResult("fail", { logsPath: "logs/initial.log" });
    runInSandboxMock.mockResolvedValueOnce(initialRun);

    const attempts: RepairHistory["attempts"] = [];
    for (let i = 1; i <= 4; i += 1) {
      attempts.push({
        number: i as 1 | 2 | 3 | 4,
        status: "fail",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        changedFiles: ["src/index.ts"],
        summary: `Attempt ${i} failed`,
        testResult: {
          status: "fail",
          passCount: 1,
          failCount: 1,
          durationMs: 1000 + i * 50,
          logsPath: `logs/attempt${i}.log`
        },
        durationMs: 1000 + i * 50,
        cumulativeTime: attempts.reduce((acc, entry) => acc + entry.durationMs, 0) + 1000 + i * 50
      });
    }

    const history = buildHistory(attempts, "exhausted");
    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "multi-turn-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);
    const payload = result.payload;

    expect(payload.repairHistory.totalAttempts).toBe(4);
    expect(payload.repairHistory.finalStatus).toBe("exhausted");
    expect(payload.repair.repaired).toBe(false);
  });

  it("response includes both testResults and repairHistory", async () => {
    const initialRun = buildRunResult("fail");
    runInSandboxMock.mockResolvedValueOnce(initialRun);

    const history = buildHistory(
      [
        {
          number: 1,
          status: "pass",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          changedFiles: ["src/index.ts"],
          summary: "Repair success",
          testResult: {
            status: "pass",
            passCount: 2,
            failCount: 0,
            durationMs: 750,
            logsPath: "logs/attempt1.log"
          },
          durationMs: 750,
          cumulativeTime: 750
        }
      ],
      "pass",
      1
    );

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "multi-turn-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);
    const payload = result.payload;

    expect(payload).toHaveProperty("testResults");
    expect(payload).toHaveProperty("repairHistory");
    expect(payload.testResults.initial?.status).toBe("fail");
    expect(payload.testResults.afterRepair?.status).toBe("pass");
  });

  it("backward compatibility - maintains legacy fields", async () => {
    const initialRun = buildRunResult("fail");
    runInSandboxMock.mockResolvedValueOnce(initialRun);

    const history = buildHistory(
      [
        {
          number: 1,
          status: "pass",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          changedFiles: ["src/index.ts"],
          summary: "Repair success",
          testResult: {
            status: "pass",
            passCount: 2,
            failCount: 0,
            durationMs: 700,
            logsPath: "logs/attempt1.log"
          },
          durationMs: 700,
          cumulativeTime: 700
        }
      ],
      "pass",
      1
    );

    multiTurnRepairMock.mockResolvedValueOnce(history);

    const result = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt: "build demo",
      projectName: "multi-turn-demo"
    });

    expect(result.finalStatus).toBe(200);
    expect([200, 202]).toContain(result.initialStatus);
    const payload = result.payload;

    expect(payload.repair.attempted).toBe(true);
    expect(payload.repair.repaired).toBe(true);
    expect(payload.testResults.afterRepair?.status).toBe("pass");
  });
});
