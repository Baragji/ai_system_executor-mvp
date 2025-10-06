import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../../src/server.js";
import type { RunResult } from "../../src/contracts/validators.js";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "phase1-demo",
      hasTests: true,
      files: [
        { path: "package.json", contents: JSON.stringify({ name: "demo", version: "1.0.0" }) },
        { path: "src/index.ts", contents: "export const add = (a:number,b:number)=>a+b;" },
        { path: "tests/index.test.ts", contents: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from '../src/index.js';\ntest('adds',()=>{assert.equal(add(1,2),3);});" }
      ],
      notes: ["Generated for tests"]
    })
  )
}));

const initialRun: RunResult = {
  status: "fail",
  passCount: 1,
  failCount: 1,
  durationMs: 1000,
  logsPath: "logs/initial.log",
  timestamp: new Date().toISOString()
};

vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn(async () => initialRun)
}));

const repairHistory = {
  attempts: [
    {
      number: 1,
      status: "fail" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      changedFiles: ["src/index.ts"],
      summary: "Attempt 1 failed",
      testResult: {
        status: "fail" as const,
        passCount: 1,
        failCount: 1,
        durationMs: 1100,
        logsPath: "logs/attempt1.log"
      },
      durationMs: 1100,
      cumulativeTime: 1100
    },
    {
      number: 2,
      status: "pass" as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      changedFiles: ["src/index.ts"],
      summary: "Attempt 2 passed",
      testResult: {
        status: "pass" as const,
        passCount: 2,
        failCount: 0,
        durationMs: 900,
        logsPath: "logs/repair.log"
      },
      durationMs: 900,
      cumulativeTime: 2000
    }
  ],
  finalStatus: "pass" as const,
  totalAttempts: 2,
  successAttemptNumber: 2
};

vi.mock("../../src/repair/multiTurnRepair.js", () => ({
  multiTurnRepair: vi.fn(async () => repairHistory)
}));

const OUTPUT_DIR = path.resolve("output");
const TELEMETRY_FILE = path.resolve(".telemetry/events.log");

describe("phase1 e2e flow", () => {
  beforeEach(async () => {
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
    await fs.mkdir(path.dirname(TELEMETRY_FILE), { recursive: true });
    await fs.rm(TELEMETRY_FILE, { force: true });
  });

  afterEach(async () => {
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  });

  it("runs execute endpoint with repair timeline", async () => {
    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "build demo", projectName: "phase1-demo" });

    expect(res.status).toBe(200);
    expect(res.body.testResults.initial.status).toBe("fail");
    expect(res.body.testResults.afterRepair.status).toBe("pass");
    expect(res.body.repair.attempted).toBe(true);
    expect(res.body.repair.repaired).toBe(true);
    expect(res.body.repairHistory.totalAttempts).toBe(2);
    expect(res.body.repairHistory.successAttemptNumber).toBe(2);

    const metaPath = path.join(OUTPUT_DIR, "phase1-demo", "_executor_meta.json");
    const metaRaw = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaRaw);
    expect(meta.testRuns).toHaveLength(3);
    expect(meta.repair.attempted).toBe(true);
    expect(meta.repairHistory.totalAttempts).toBe(2);
    expect(meta.files.length).toBeGreaterThanOrEqual(2);

    const telemetry = await fs.readFile(TELEMETRY_FILE, "utf-8");
    expect(telemetry).toContain("generation_start");
    expect(telemetry).toContain("generation_complete");
  });
});
