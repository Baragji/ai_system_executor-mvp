import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runInSandbox } from "../../src/runner/runInSandbox.js";
import {
  ensureAbortController,
  setAbortCheckpoint,
  abortSessionExecution,
  __abortRegistryForTest
} from "../../src/orchestrator/abortSignal.js";
import { PausedError } from "../../src/orchestrator/errors.js";
import {
  CHECKPOINT_SCHEMA_ID,
  CHECKPOINT_VERSION
} from "../../src/orchestrator/checkpoints.js";

const fixturesRoot = path.resolve("tests/fixtures");

async function cleanupLogs(project: string) {
  const dir = path.join(fixturesRoot, project, "logs");
  await fs.rm(dir, { recursive: true, force: true });
}

afterEach(async () => {
  await Promise.all([
    cleanupLogs("passing-project"),
    cleanupLogs("failing-project"),
    cleanupLogs("hanging-project")
  ]);
  __abortRegistryForTest().clear();
});

describe.sequential("runInSandbox", () => {
  beforeEach(() => {
    __abortRegistryForTest().clear();
  });

  it("returns pass status for passing projects", async () => {
    const projectRoot = path.join(fixturesRoot, "passing-project");
    const result = await runInSandbox({ projectRoot, projectSlug: "passing" });
    expect(result.status).toBe("pass");
    expect(result.passCount).toBeGreaterThanOrEqual(0);
    const logFile = path.join(projectRoot, result.logsPath);
    await expect(fs.access(logFile)).resolves.toBeUndefined();
  });

  it("returns fail status for failing projects", async () => {
    const projectRoot = path.join(fixturesRoot, "failing-project");
    const result = await runInSandbox({ projectRoot, projectSlug: "failing" });
    expect(result.status).toBe("fail");
    expect(result.failCount).toBeGreaterThanOrEqual(0);
  });

  it("marks timeout as error", async () => {
    const projectRoot = path.join(fixturesRoot, "hanging-project");
    const result = await runInSandbox({ projectRoot, projectSlug: "hang", timeoutMs: 200 });
    expect(result.status).toBe("error");
    expect(result.timedOut).toBe(true);
    expect(result.errorMessage).toContain("timed out");
  });

  it("rejects with PausedError when abort signal triggers", async () => {
    const projectRoot = path.join(fixturesRoot, "passing-project");
    const sessionId = "sandbox-abort";
    const signal = ensureAbortController(sessionId);
    setAbortCheckpoint(sessionId, {
      schema: CHECKPOINT_SCHEMA_ID,
      version: CHECKPOINT_VERSION,
      sessionId,
      state: "PAUSED",
      updatedAt: new Date().toISOString(),
      machine: {
        history: [
          { state: "GENERATING", enteredAt: new Date(Date.now() - 1000).toISOString() },
          { state: "PAUSED", enteredAt: new Date().toISOString(), reason: "abort test" }
        ]
      },
      payload: { pendingQuestions: [] }
    });

    const runPromise = runInSandbox({
      projectRoot,
      projectSlug: "abort", 
      command: "node -e \"setTimeout(() => {}, 2000)\"",
      timeoutMs: 5000,
      sessionId,
      abortSignal: signal
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    abortSessionExecution(sessionId, "abort test");

    await expect(runPromise).rejects.toBeInstanceOf(PausedError);
  });
});
