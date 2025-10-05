import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { repairOnce } from "../../src/repair/repairOnce.js";
import type { RunResult } from "../../src/contracts/validators.js";

const originalEnv = { ...process.env };

const baseRun: RunResult = {
  status: "fail",
  passCount: 0,
  failCount: 1,
  durationMs: 500,
  logsPath: "logs/initial.log",
  timestamp: new Date().toISOString()
};

describe("repairOnce", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "";
    process.env.ANTHROPIC_API_KEY = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns attempted true when no LLM available", async () => {
    const result = await repairOnce({
      projectRoot: os.tmpdir(),
      projectSlug: "demo",
      failure: baseRun,
      originalFiles: [],
      prompt: "build"
    });
    expect(result.attempted).toBe(true);
    expect(result.repaired).toBe(false);
    expect(result.error).toMatch(/LLM/);
  });

  it("applies artifacts and reruns tests", async () => {
    process.env.OPENAI_API_KEY = "test";

    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "repair-once-"));
    await fs.mkdir(path.join(tmpRoot, "src"), { recursive: true });
    await fs.writeFile(path.join(tmpRoot, "src/index.ts"), "export const value = 1;", "utf-8");

    const generateMock = vi.spyOn(await import("../../src/llm/index.js"), "generateJSON");
    generateMock.mockResolvedValue(
      JSON.stringify({
        artifacts: [
          { path: "src/index.ts", action: "modify", description: "update value" }
        ],
        files: [
          { path: "src/index.ts", contents: "export const value = 2;" }
        ],
        notes: ["adjusted"]
      })
    );

    const runResult: RunResult = {
      status: "pass",
      passCount: 1,
      failCount: 0,
      durationMs: 100,
      logsPath: "logs/retest.log",
      timestamp: new Date().toISOString()
    };

    const runMock = vi.spyOn(await import("../../src/runner/runInSandbox.js"), "runInSandbox");
    runMock.mockResolvedValue(runResult);

    const outcome = await repairOnce({
      projectRoot: tmpRoot,
      projectSlug: "demo",
      failure: baseRun,
      originalFiles: [{ path: "src/index.ts", contents: "export const value = 1;" }],
      prompt: "build"
    });

    const fileContents = await fs.readFile(path.join(tmpRoot, "src/index.ts"), "utf-8");

    expect(fileContents).toContain("value = 2");
    expect(outcome.repaired).toBe(true);
    expect(outcome.runResult?.status).toBe("pass");
    expect(outcome.notes).toContain("adjusted");

    await fs.rm(tmpRoot, { recursive: true, force: true });
  });
});
