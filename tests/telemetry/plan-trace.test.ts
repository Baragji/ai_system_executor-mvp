import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();
const tempDirs: string[] = [];

afterEach(async () => {
  process.chdir(originalCwd);
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe("plan progress telemetry", () => {
  it("records trace entries with subtask and progress", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "telemetry-test-"));
    tempDirs.push(tempDir);
    process.chdir(tempDir);

    vi.resetModules();
    const { logEvent } = await import("../../src/telemetry/events.js");

    await logEvent("plan_progress", {
      taskId: "plan:demo",
      subtask: "subtask-1",
      status: "in_progress",
      percent: 50
    });

    const tracePath = path.join(tempDir, ".automation", "execution_trace.jsonl");
    for (let i = 0; i < 10; i += 1) {
      try {
        await fs.access(tracePath);
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    const contents = await fs.readFile(tracePath, "utf-8");
    const lines = contents
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!);
    const { validateExecutionTrace } = await import(
      "../../src/contracts/executionTraceValidator.js"
    );
    const validation = validateExecutionTrace(entry);
    expect(validation.ok).toBe(true);
    expect(validation.value?.subtask_id).toBe("subtask-1");
    expect(validation.value?.progress_pct).toBe(50);
  });
});
