import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runInSandbox } from "../../src/runner/runInSandbox.js";

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
});

describe.sequential("runInSandbox", () => {
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
});
