import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../../src/server.js";
import type { RunResult } from "../../src/contracts/validators.js";
import type { RepairHistory } from "../../src/contracts/repairHistoryValidator.js";

const OUTPUT_DIR = path.resolve("output");
let initialRun: RunResult;

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "metrics-demo",
      hasTests: true,
      files: [
        { path: "README.md", contents: "# Demo" },
        { path: "src/index.ts", contents: "export const value = 0;" },
        {
          path: "tests/index.test.ts",
          contents: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { value } from '../src/index.js';\ntest('value', () => assert.equal(value, 1));"
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

async function readMeta(projectSlug: string) {
  const metaPath = path.join(OUTPUT_DIR, projectSlug, "_executor_meta.json");
  const contents = await fs.readFile(metaPath, "utf-8");
  return JSON.parse(contents) as {
    repairMetrics: unknown;
  };
}

async function resetOutput() {
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
}

describe("repair metrics meta", () => {
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

  it("records metrics when repairs succeed", async () => {
    const history: RepairHistory = {
      attempts: [
        {
          number: 1,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          failureAnalysis: {
            failedTests: [],
            totalFailed: 1,
            category: "assertion"
          },
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
          failureAnalysis: {
            failedTests: [],
            totalFailed: 1,
            category: "timeout"
          },
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1,
            durationMs: 120,
            logsPath: "logs/b.log"
          },
          durationMs: 120,
          cumulativeTime: 230
        },
        {
          number: 3,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          summary: "fixed",
          testResult: {
            status: "pass",
            passCount: 1,
            failCount: 0,
            durationMs: 90,
            logsPath: "logs/c.log"
          },
          durationMs: 90,
          cumulativeTime: 320
        }
      ],
      finalStatus: "pass",
      totalAttempts: 3,
      successAttemptNumber: 3
    };
    multiTurnRepairMock.mockResolvedValue(history);

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "Fix metrics", projectName: "metrics-demo" });

    expect(res.status).toBe(200);
    const meta = await readMeta(res.body.project);
    const metrics = meta.repairMetrics as Record<string, unknown>;
    expect(metrics.totalAttempts).toBe(3);
    expect(metrics.successAttempt).toBe(3);
    expect(metrics.timePerAttempt).toEqual([110, 120, 90]);
    expect(metrics.failureTypes).toEqual(["assertion", "timeout"]);
    expect(metrics.attemptEfficiency).toBeCloseTo(1);
    expect(metrics.exhausted).toBe(false);
  });

  it("marks exhausted repairs and zero efficiency when no success", async () => {
    const history: RepairHistory = {
      attempts: [
        {
          number: 1,
          changedFiles: ["src/index.ts"],
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          failureAnalysis: {
            failedTests: [],
            totalFailed: 1,
            category: "exception"
          },
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1,
            durationMs: 140,
            logsPath: "logs/x.log"
          },
          durationMs: 140,
          cumulativeTime: 140
        }
      ],
      finalStatus: "exhausted",
      totalAttempts: 1
    };
    multiTurnRepairMock.mockResolvedValue(history);

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "Fail metrics", projectName: "metrics-demo" });

    expect(res.status).toBe(200);
    const meta = await readMeta(res.body.project);
    const metrics = meta.repairMetrics as Record<string, unknown>;
    expect(metrics.exhausted).toBe(true);
    expect(metrics.attemptEfficiency).toBe(0);
  });

  it("omits metrics when no repair is required", async () => {
    initialRun = {
      status: "pass",
      passCount: 1,
      failCount: 0,
      durationMs: 100,
      logsPath: "logs/initial.log",
      timestamp: new Date().toISOString()
    };

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "Nothing", projectName: "metrics-demo" });

    expect(res.status).toBe(200);
    const meta = await readMeta(res.body.project);
    expect(meta.repairMetrics).toBeNull();
  });
});
