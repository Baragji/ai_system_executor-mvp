import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../../src/server.js";
import type { RunResult } from "../../src/contracts/validators.js";
import type { RepairHistory } from "../../src/contracts/repairHistoryValidator.js";

const OUTPUT_DIR = path.resolve("output");
const TELEMETRY_FILE = path.resolve(".telemetry/events.log");

let initialRun: RunResult;

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "multi-turn-demo",
      hasTests: true,
      files: [
        { path: "README.md", contents: "# Demo" },
        { path: "src/index.ts", contents: "export const ok = false;" },
        {
          path: "tests/index.test.ts",
          contents: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { ok } from '../src/index.js';\ntest('ok', () => assert.equal(ok, true));"
        }
      ]
    })
  )
}));

vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn(async () => initialRun)
}));

vi.mock("../../src/repair/multiTurnRepair.js", () => ({
  multiTurnRepair: vi.fn()
}));

const multiTurnRepairMock = vi.mocked((await import("../../src/repair/multiTurnRepair.js")).multiTurnRepair);

async function resetOutput() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.rm(TELEMETRY_FILE, { force: true });
}

describe("POST /api/execute multi-turn integration", () => {
  beforeEach(async () => {
    await resetOutput();
    initialRun = {
      status: "fail",
      passCount: 0,
      failCount: 1,
      durationMs: 150,
      logsPath: "logs/initial.log",
      timestamp: new Date().toISOString()
    };
    multiTurnRepairMock.mockReset();
  });

  afterEach(async () => {
    await resetOutput();
  });

  it("skips multi-turn repair when initial run passes", async () => {
    initialRun = {
      status: "pass",
      passCount: 1,
      failCount: 0,
      durationMs: 120,
      logsPath: "logs/initial.log",
      timestamp: new Date().toISOString()
    };

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "Build a project", projectName: "multi-turn-demo" });

    expect(res.status).toBe(200);
    expect(res.body.testResults.afterRepair).toBeNull();
    expect(res.body.repair.attempted).toBe(false);
    expect(multiTurnRepairMock).not.toHaveBeenCalled();
  });

  it("returns repair history when repairs succeed", async () => {
    const successHistory: RepairHistory = {
      attempts: [
        {
          number: 1,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          summary: "Updated flag",
          testResult: {
            status: "pass",
            passCount: 1,
            failCount: 0,
            durationMs: 100,
            logsPath: "logs/repair.log"
          },
          durationMs: 100,
          cumulativeTime: 100
        }
      ],
      finalStatus: "pass",
      totalAttempts: 1,
      successAttemptNumber: 1
    };
    multiTurnRepairMock.mockResolvedValue(successHistory);

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "Fix it", projectName: "multi-turn-demo" });

    expect(res.status).toBe(200);
    expect(res.body.repairHistory.finalStatus).toBe("pass");
    expect(res.body.repairHistory.successAttemptNumber).toBe(1);
    expect(res.body.repairMetrics.totalAttempts).toBe(1);
    expect(res.body.testResults.afterRepair.status).toBe("pass");
  });

  it("exposes exhaustion status when repairs fail", async () => {
    const exhaustedHistory: RepairHistory = {
      attempts: [
        {
          number: 1,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1,
            durationMs: 110,
            logsPath: "logs/a.log"
          },
          durationMs: 110,
          cumulativeTime: 110
        },
        {
          number: 2,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1,
            durationMs: 130,
            logsPath: "logs/b.log"
          },
          durationMs: 130,
          cumulativeTime: 240
        },
        {
          number: 3,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1,
            durationMs: 125,
            logsPath: "logs/c.log"
          },
          durationMs: 125,
          cumulativeTime: 365
        },
        {
          number: 4,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1,
            durationMs: 150,
            logsPath: "logs/d.log"
          },
          durationMs: 150,
          cumulativeTime: 515
        }
      ],
      finalStatus: "exhausted",
      totalAttempts: 4
    };
    multiTurnRepairMock.mockResolvedValue(exhaustedHistory);

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "Fix it", projectName: "multi-turn-demo" });

    expect(res.status).toBe(200);
    expect(res.body.repairHistory.finalStatus).toBe("exhausted");
    expect(res.body.repair.repaired).toBe(false);
    expect(res.body.repairMetrics.exhausted).toBe(true);
  });
});
