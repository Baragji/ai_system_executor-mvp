import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RunResult } from "../../src/contracts/validators.js";
import type { FailureAnalysis } from "../../src/contracts/repairHistoryValidator.js";

vi.mock("../../src/repair/buildRepairPrompt.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/repair/buildRepairPrompt.js")>(
    "../../src/repair/buildRepairPrompt.js"
  );
  return {
    ...actual,
    buildRepairPrompt: vi.fn(actual.buildRepairPrompt)
  };
});

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn()
}));

vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn()
}));

vi.mock("../../src/repair/analyzeFailure.js", () => ({
  analyzeFailure: vi.fn((log: string): FailureAnalysis => ({
    failedTests: log.trim()
      ? [
          {
            name: "failing test",
            type: "assertion",
            message: log.trim(),
            stackSnippet: []
          }
        ]
      : [],
    totalFailed: log.trim() ? 1 : 0,
    category: "assertion"
  }))
}));

vi.mock("../../src/repair/generateDiff.js", () => ({
  generateDiff: vi.fn(() => ({
    file: "",
    diffText: "",
    linesAdded: 0,
    linesRemoved: 0,
    isMinor: true
  }))
}));

const { multiTurnRepair } = await import("../../src/repair/multiTurnRepair.js");
const { validateRepairHistory } = await import("../../src/contracts/repairHistoryValidator.js");
const { buildRepairPrompt } = await import("../../src/repair/buildRepairPrompt.js");
const { generateJSON } = await import("../../src/llm/index.js");
const { runInSandbox } = await import("../../src/runner/runInSandbox.js");
const { analyzeFailure } = await import("../../src/repair/analyzeFailure.js");
const { generateDiff } = await import("../../src/repair/generateDiff.js");

const buildRepairPromptMock = vi.mocked(buildRepairPrompt);
const generateJSONMock = vi.mocked(generateJSON);
const runInSandboxMock = vi.mocked(runInSandbox);
const analyzeFailureMock = vi.mocked(analyzeFailure);
const generateDiffMock = vi.mocked(generateDiff);

async function writeLog(projectRoot: string, relative: string, contents: string) {
  const fullPath = path.join(projectRoot, relative);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, contents, "utf-8");
}

function makeRunResult(overrides: Partial<RunResult> = {}): RunResult {
  return {
    status: "fail",
    passCount: 0,
    failCount: 1,
    durationMs: 100,
    logsPath: "logs/run.log",
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe("multiTurnRepair", () => {
  let projectRoot: string;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = "test";
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "multi-turn-"));
    await fs.mkdir(path.join(projectRoot, "src"), { recursive: true });
    await fs.writeFile(path.join(projectRoot, "src/index.ts"), "export const value = 1;\n", "utf-8");
    buildRepairPromptMock.mockClear();
    generateJSONMock.mockReset();
    runInSandboxMock.mockReset();
    analyzeFailureMock.mockClear();
    generateDiffMock.mockClear();
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  async function prepareInitialRun(logMessage: string): Promise<RunResult> {
    const initial = makeRunResult({ logsPath: "logs/initial.log" });
    await writeLog(projectRoot, "logs/initial.log", logMessage);
    return initial;
  }

  it("stops after a successful second attempt", async () => {
    const initialRun = await prepareInitialRun("Initial failure");

    await writeLog(projectRoot, "logs/attempt1.log", "Still failing");
    await writeLog(projectRoot, "logs/attempt2.log", "All good");

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "adjust value" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 2;\n" }
          ],
          notes: ["attempt1"]
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "final fix" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 3;\n" }
          ],
          notes: ["attempt2"]
        })
      );

    runInSandboxMock
      .mockResolvedValueOnce(
        makeRunResult({
          status: "fail",
          logsPath: "logs/attempt1.log",
          durationMs: 150
        })
      )
      .mockResolvedValueOnce(
        makeRunResult({
          status: "pass",
          logsPath: "logs/attempt2.log",
          passCount: 1,
          failCount: 0,
          durationMs: 120
        })
      );

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "demo",
      originalPrompt: "Fix the issue",
      generatedFiles: [{ path: "src/index.ts", contents: "export const value = 1;\n" }],
      initialTestResult: initialRun
    });

    expect(history.finalStatus).toBe("pass");
    expect(history.successAttemptNumber).toBe(2);
    expect(history.attempts).toHaveLength(2);
    expect(generateJSONMock).toHaveBeenCalledTimes(2);
    expect(runInSandboxMock).toHaveBeenCalledTimes(2);
    expect(history.attempts[1]?.testResult.status).toBe("pass");
    expect(history.attempts[1]?.cumulativeTime).toBeGreaterThan(history.attempts[0]?.cumulativeTime ?? 0);

    const secondPromptContext = buildRepairPromptMock.mock.calls[1]?.[0];
    expect(secondPromptContext?.previousAttempts).toHaveLength(1);
    expect(secondPromptContext?.previousAttempts?.[0]?.status).toBe("fail");
  });

  it("uses all four attempts when success arrives late", async () => {
    const initialRun = await prepareInitialRun("Initial failure");
    for (let idx = 1; idx <= 4; idx += 1) {
      await writeLog(projectRoot, `logs/attempt${idx}.log`, `Attempt ${idx} logs`);
    }

    let promptCall = 0;
    generateJSONMock.mockImplementation(async () => {
      promptCall += 1;
      const attempt = promptCall;
      return JSON.stringify({
        artifacts: [
          { path: "src/index.ts", action: "modify", description: `change ${attempt}` }
        ],
        files: [
          { path: "src/index.ts", contents: `export const value = ${attempt + 1};\n` }
        ]
      });
    });

    runInSandboxMock
      .mockResolvedValueOnce(
        makeRunResult({ status: "fail", logsPath: "logs/attempt1.log", durationMs: 110 })
      )
      .mockResolvedValueOnce(
        makeRunResult({ status: "fail", logsPath: "logs/attempt2.log", durationMs: 120 })
      )
      .mockResolvedValueOnce(
        makeRunResult({ status: "fail", logsPath: "logs/attempt3.log", durationMs: 130 })
      )
      .mockResolvedValueOnce(
        makeRunResult({
          status: "pass",
          logsPath: "logs/attempt4.log",
          passCount: 1,
          failCount: 0,
          durationMs: 140
        })
      );

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "late-success",
      originalPrompt: "Fix the issue",
      generatedFiles: [{ path: "src/index.ts", contents: "export const value = 1;\n" }],
      initialTestResult: initialRun
    });

    expect(history.attempts).toHaveLength(4);
    expect(history.finalStatus).toBe("pass");
    expect(generateJSONMock).toHaveBeenCalledTimes(4);
  });

  it("marks history as exhausted when all attempts fail", async () => {
    const initialRun = await prepareInitialRun("Initial failure");
    for (let idx = 1; idx <= 4; idx += 1) {
      await writeLog(projectRoot, `logs/attempt${idx}.log`, `Attempt ${idx} logs`);
    }

    generateJSONMock.mockResolvedValue(
      JSON.stringify({
        artifacts: [
          { path: "src/index.ts", action: "modify", description: "try fix" }
        ],
        files: [
          { path: "src/index.ts", contents: "export const value = 2;\n" }
        ]
      })
    );

    let callIndex = 0;
    runInSandboxMock.mockImplementation(async () => {
      callIndex += 1;
      return makeRunResult({
        status: "fail",
        logsPath: `logs/attempt${callIndex}.log`,
        durationMs: 100 + callIndex * 10
      });
    });

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "exhausted",
      originalPrompt: "Fix the issue",
      generatedFiles: [{ path: "src/index.ts", contents: "export const value = 1;\n" }],
      initialTestResult: initialRun
    });

    expect(history.finalStatus).toBe("exhausted");
    expect(history.successAttemptNumber).toBeUndefined();
    expect(history.attempts).toHaveLength(4);
  });

  it("skips remaining attempts once a pass occurs", async () => {
    const initialRun = await prepareInitialRun("Initial failure");
    await writeLog(projectRoot, "logs/attempt1.log", "still failing");
    await writeLog(projectRoot, "logs/attempt2.log", "pass logs");

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "attempt1" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 2;\n" }
          ]
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "attempt2" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 3;\n" }
          ]
        })
      );

    runInSandboxMock
      .mockResolvedValueOnce(
        makeRunResult({ status: "fail", logsPath: "logs/attempt1.log", durationMs: 120 })
      )
      .mockResolvedValueOnce(
        makeRunResult({
          status: "pass",
          logsPath: "logs/attempt2.log",
          durationMs: 100,
          passCount: 1,
          failCount: 0
        })
      );

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "early-success",
      originalPrompt: "Fix the issue",
      generatedFiles: [{ path: "src/index.ts", contents: "export const value = 1;\n" }],
      initialTestResult: initialRun
    });

    expect(history.attempts).toHaveLength(2);
    expect(generateJSONMock).toHaveBeenCalledTimes(2);
  });

  it("records an error attempt when LLM call fails but continues", async () => {
    const initialRun = await prepareInitialRun("Initial failure");
    await writeLog(projectRoot, "logs/attempt2.log", "success logs");

    generateJSONMock
      .mockRejectedValueOnce(new Error("LLM down"))
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "recover" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 3;\n" }
          ]
        })
      );

    runInSandboxMock.mockResolvedValueOnce(
      makeRunResult({
        status: "pass",
        logsPath: "logs/attempt2.log",
        passCount: 1,
        failCount: 0,
        durationMs: 90
      })
    );

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "llm-retry",
      originalPrompt: "Fix the issue",
      generatedFiles: [{ path: "src/index.ts", contents: "export const value = 1;\n" }],
      initialTestResult: initialRun
    });

    expect(history.attempts[0]?.testResult.status).toBe("error");
    expect(history.attempts[1]?.testResult.status).toBe("pass");
    expect(history.finalStatus).toBe("pass");
  });

  it("returns history that passes schema validation", async () => {
    const initialRun = await prepareInitialRun("Initial failure");
    await writeLog(projectRoot, "logs/attempt1.log", "fail");
    await writeLog(projectRoot, "logs/attempt2.log", "pass");

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "first" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 2;\n" }
          ]
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "second" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 3;\n" }
          ]
        })
      );

    runInSandboxMock
      .mockResolvedValueOnce(
        makeRunResult({ status: "fail", logsPath: "logs/attempt1.log", durationMs: 115 })
      )
      .mockResolvedValueOnce(
        makeRunResult({
          status: "pass",
          logsPath: "logs/attempt2.log",
          passCount: 1,
          failCount: 0,
          durationMs: 105
        })
      );

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "validation",
      originalPrompt: "Fix the issue",
      generatedFiles: [{ path: "src/index.ts", contents: "export const value = 1;\n" }],
      initialTestResult: initialRun
    });

    const validation = validateRepairHistory(history);
    expect(validation.ok).toBe(true);
  });

  it("calls generateDiff for each changed file", async () => {
    const initialRun = await prepareInitialRun("Initial failure");
    await writeLog(projectRoot, "logs/attempt1.log", "still failing");
    await writeLog(projectRoot, "logs/attempt2.log", "pass");

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "first" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 2;\n" }
          ]
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [
            { path: "src/index.ts", action: "modify", description: "second" }
          ],
          files: [
            { path: "src/index.ts", contents: "export const value = 3;\n" }
          ]
        })
      );

    runInSandboxMock
      .mockResolvedValueOnce(
        makeRunResult({ status: "fail", logsPath: "logs/attempt1.log", durationMs: 120 })
      )
      .mockResolvedValueOnce(
        makeRunResult({
          status: "pass",
          logsPath: "logs/attempt2.log",
          passCount: 1,
          failCount: 0,
          durationMs: 95
        })
      );

    await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "diff-calls",
      originalPrompt: "Fix the issue",
      generatedFiles: [{ path: "src/index.ts", contents: "export const value = 1;\n" }],
      initialTestResult: initialRun
    });

    expect(generateDiffMock).toHaveBeenCalled();
    const changedPaths = new Set(
      generateDiffMock.mock.calls.map(call => call[2])
    );
    expect(changedPaths.has("src/index.ts")).toBe(true);
  });
});
