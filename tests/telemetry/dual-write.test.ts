import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let logEvent: typeof import("../../src/telemetry/events.js").logEvent;

describe("logEvent dual write", () => {
  let originalCwd: string;
  let tempDir: string;
  let telemetryDir: string;
  let telemetryFile: string;
  let automationDir: string;
  let traceFile: string;

  async function resetOutputs(): Promise<void> {
    await fs.rm(telemetryFile, { force: true });
    await fs.rm(traceFile, { force: true });
    await fs.mkdir(telemetryDir, { recursive: true });
    await fs.mkdir(automationDir, { recursive: true });
  }

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "telemetry-dual-"));
    process.chdir(tempDir);
    telemetryDir = path.resolve(".telemetry");
    telemetryFile = path.join(telemetryDir, "events.log");
    automationDir = path.resolve(".automation");
    traceFile = path.join(automationDir, "execution_trace.jsonl");
    ({ logEvent } = await import("../../src/telemetry/events.js"));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await resetOutputs();
  });

  it("writes events to both telemetry and execution trace", async () => {
    await logEvent("test_action", {
      taskId: "OBS-FIX-01",
      status: "success",
      cmd: "npm test",
      exitCode: 0,
      stdout_excerpt: "All tests passed",
      stderr_excerpt: ""
    });

    const telemetryData = await fs.readFile(telemetryFile, "utf-8");
    const traceData = await fs.readFile(traceFile, "utf-8");

    expect(telemetryData.trim().length).toBeGreaterThan(0);
    expect(traceData.trim().length).toBeGreaterThan(0);
  });

  it("records required fields in execution trace", async () => {
    await logEvent("test_action", {
      taskId: "task-123",
      status: "queued"
    });

    const traceData = await fs.readFile(traceFile, "utf-8");
    const traceLines = traceData.trim().split("\n");
    const lastEntry = JSON.parse(traceLines.at(-1)!);

    expect(lastEntry).toMatchObject({
      timestamp: expect.any(String),
      task_id: "task-123",
      action: "test_action",
      status: "queued"
    });
  });

  it("produces valid JSONL entries for the trace file", async () => {
    await logEvent("jsonl_check", { taskId: "task-jsonl", status: "running" });
    await logEvent("jsonl_check", { taskId: "task-jsonl", status: "complete" });

    const traceData = await fs.readFile(traceFile, "utf-8");
    const traceLines = traceData.trim().split("\n");

    for (const line of traceLines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("creates the automation directory when missing", async () => {
    await fs.rm(automationDir, { recursive: true, force: true });

    await logEvent("ensure_dir", { taskId: "task-dir", status: "running" });

    const stats = await fs.stat(automationDir);
    expect(stats.isDirectory()).toBe(true);
  });
});
