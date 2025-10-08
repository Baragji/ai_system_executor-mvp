import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn()
}));
vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn()
}));

import { validateRepairHistory } from "../../src/contracts/repairHistoryValidator.js";
import type { RepairHistory } from "../../src/contracts/repairHistoryValidator.js";
import { multiTurnRepair } from "../../src/repair/multiTurnRepair.js";
import { generateJSON } from "../../src/llm/index.js";
import { runInSandbox } from "../../src/runner/runInSandbox.js";
import type { RunResult } from "../../src/contracts/validators.js";

const generateJSONMock = vi.mocked(generateJSON);
const runInSandboxMock = vi.mocked(runInSandbox);

describe("repair history schema with strategy", () => {
  it("accepts attempts that include a strategy", () => {
    const history: RepairHistory = {
      attempts: [
        {
          number: 1,
          changedFiles: [],
          strategy: "syntax_focus",
          summary: "Attempt failed",
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1
          },
          durationMs: 10,
          cumulativeTime: 10
        }
      ],
      finalStatus: "fail",
      totalAttempts: 1
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(true);
  });

  it("remains compatible when strategy is omitted", () => {
    const history: RepairHistory = {
      attempts: [
        {
          number: 1,
          changedFiles: [],
          summary: "Attempt failed",
          testResult: {
            status: "fail",
            passCount: 0,
            failCount: 1
          },
          durationMs: 10,
          cumulativeTime: 10
        }
      ],
      finalStatus: "fail",
      totalAttempts: 1
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(true);
  });
});

describe("multiTurnRepair strategy annotation", () => {
  const tempDirs: string[] = [];

  async function createTempProject(): Promise<{
    projectRoot: string;
    filePath: string;
    initialRun: RunResult;
  }> {
    const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "adaptive-history-"));
    tempDirs.push(projectRoot);

    const srcDir = path.join(projectRoot, "src");
    await fs.mkdir(srcDir, { recursive: true });
    const filePath = path.join(srcDir, "index.ts");
    await fs.writeFile(filePath, "export const value = 1;\n", "utf-8");

    const logsDir = path.join(projectRoot, "logs");
    await fs.mkdir(logsDir, { recursive: true });
    const logPath = path.join(logsDir, "initial.log");
    await fs.writeFile(
      logPath,
      "FAIL tests/example.test.ts\n  ● computes sum\n    expect(received).toBe(2)\n    Received: 1\n",
      "utf-8"
    );

    const timestamp = new Date().toISOString();
    return {
      projectRoot,
      filePath: "src/index.ts",
      initialRun: {
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 100,
        logsPath: path.relative(projectRoot, logPath),
        timestamp,
        startedAt: timestamp,
        finishedAt: timestamp
      }
    };
  }

  beforeEach(() => {
    generateJSONMock.mockReset();
    runInSandboxMock.mockReset();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
  });

  it("records the selected strategy for each attempt", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    generateJSONMock.mockResolvedValueOnce(
      JSON.stringify({
        artifacts: [{ path: filePath, action: "modify" }],
        files: [{ path: filePath, contents: "export const value = 2;\n" }],
        notes: []
      })
    );

    runInSandboxMock.mockResolvedValueOnce({
      status: "pass",
      passCount: 1,
      failCount: 0,
      durationMs: 120,
      logsPath: "",
      timestamp: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString()
    });

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "adaptive",
      originalPrompt: "Fix the failing addition test",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    expect(history.attempts[0]?.strategy).toBe("assertion_focus");
    expect(history.attempts[0]?.summary).toContain("Attempt 1");
  });
});
