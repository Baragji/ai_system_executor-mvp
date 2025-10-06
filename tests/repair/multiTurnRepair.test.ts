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

import { multiTurnRepair } from "../../src/repair/multiTurnRepair.js";
import { generateJSON } from "../../src/llm/index.js";
import { runInSandbox } from "../../src/runner/runInSandbox.js";
import { validateRepairHistory } from "../../src/contracts/repairHistoryValidator.js";
import type { RunResult } from "../../src/contracts/validators.js";

const generateJSONMock = vi.mocked(generateJSON);
const runInSandboxMock = vi.mocked(runInSandbox);

const tempDirs: string[] = [];

async function createTempProject(): Promise<{
  projectRoot: string;
  filePath: string;
  initialRun: RunResult;
}> {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "multi-turn-"));
  tempDirs.push(projectRoot);

  const sourcePath = path.join(projectRoot, "src");
  await fs.mkdir(sourcePath, { recursive: true });
  const filePath = path.join(sourcePath, "index.ts");
  await fs.writeFile(filePath, "export const value = 1;\n", "utf-8");

  await fs.mkdir(path.join(projectRoot, "logs"), { recursive: true });
  const logPath = path.join(projectRoot, "logs", "initial.log");
  await fs.writeFile(
    logPath,
    "FAIL tests/example.test.ts\n  ● math adds numbers\n    Expected: 2\n    Received: 1\n    at Object.<anonymous> (src/index.test.ts:10:5)\n",
    "utf-8"
  );

  const timestamp = new Date().toISOString();
  const initialRun: RunResult = {
    status: "fail",
    passCount: 0,
    failCount: 1,
    durationMs: 100,
    logsPath: path.relative(projectRoot, logPath),
    timestamp,
    startedAt: timestamp,
    finishedAt: timestamp
  };

  return { projectRoot, filePath: "src/index.ts", initialRun };
}

async function createLog(projectRoot: string, name: string, content: string): Promise<string> {
  const full = path.join(projectRoot, "logs", name);
  await fs.writeFile(full, content, "utf-8");
  return path.relative(projectRoot, full);
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

describe("multiTurnRepair", () => {
  it("stops after a second successful attempt and records successAttemptNumber", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    const attempt1Log = await createLog(
      projectRoot,
      "attempt1.log",
      "FAIL tests/example.test.ts\n  ● math adds numbers\n    Expected: 3\n    Received: 2\n    at Object.<anonymous> (src/index.test.ts:12:5)\n"
    );

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 2;\n" }],
          notes: []
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 42;\n" }],
          notes: []
        })
      );

    runInSandboxMock
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 110,
        logsPath: attempt1Log,
        timestamp: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 120,
        logsPath: await createLog(projectRoot, "attempt2.log", "PASS"),
        timestamp: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString()
      });

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => {
      now += 50;
      return now;
    });

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "sample",
      originalPrompt: "Implement addition",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    expect(history.finalStatus).toBe("pass");
    expect(history.successAttemptNumber).toBe(2);
    expect(history.totalAttempts).toBe(2);
    expect(history.attempts).toHaveLength(2);
    expect(history.attempts[0]!.testResult.status).toBe("fail");
    expect(history.attempts[1]!.testResult.status).toBe("pass");
    expect(runInSandboxMock).toHaveBeenCalledTimes(2);
  });

  it("uses all four attempts when success happens on the last try", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    const logs = await Promise.all([
      createLog(
        projectRoot,
        "attempt1.log",
        "FAIL tests/example.test.ts\n  ● first\n    Expected: 2\n    Received: 1\n"
      ),
      createLog(
        projectRoot,
        "attempt2.log",
        "FAIL tests/example.test.ts\n  ● second\n    Expected: 4\n    Received: 2\n"
      ),
      createLog(
        projectRoot,
        "attempt3.log",
        "FAIL tests/example.test.ts\n  ● third\n    Expected: 5\n    Received: 3\n"
      )
    ]);

    const attemptContents = ["export const value = 3;\n", "export const value = 4;\n", "export const value = 5;\n", "export const value = 6;\n"];
    attemptContents.forEach(content => {
      generateJSONMock.mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: content }],
          notes: []
        })
      );
    });

    runInSandboxMock
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 90,
        logsPath: logs[0]!,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 100,
        logsPath: logs[1]!,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 95,
        logsPath: logs[2]!,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 130,
        logsPath: await createLog(projectRoot, "attempt4.log", "PASS"),
        timestamp: new Date().toISOString()
      });

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => (now += 40));

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "four-attempts",
      originalPrompt: "Implement math",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    expect(history.finalStatus).toBe("pass");
    expect(history.successAttemptNumber).toBe(4);
    expect(history.attempts).toHaveLength(4);
    expect(runInSandboxMock).toHaveBeenCalledTimes(4);
  });

  it("marks history as exhausted when all four attempts fail", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    generateJSONMock.mockResolvedValue(
      JSON.stringify({
        artifacts: [{ path: filePath, action: "modify" }],
        files: [{ path: filePath, contents: "export const value = 3;\n" }],
        notes: []
      })
    );

    const failureLog = "FAIL tests/example.test.ts\n  ● still failing\n    Expected: 10\n    Received: 3\n";
    const logPaths = await Promise.all(
      ["a.log", "b.log", "c.log", "d.log"].map(name => createLog(projectRoot, name, failureLog))
    );

    runInSandboxMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 80,
        logsPath: logPaths[0]!,
        timestamp: new Date().toISOString()
      })
    );
    runInSandboxMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 90,
        logsPath: logPaths[1]!,
        timestamp: new Date().toISOString()
      })
    );
    runInSandboxMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 85,
        logsPath: logPaths[2]!,
        timestamp: new Date().toISOString()
      })
    );
    runInSandboxMock.mockImplementationOnce(() =>
      Promise.resolve({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 95,
        logsPath: logPaths[3]!,
        timestamp: new Date().toISOString()
      })
    );

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => (now += 60));

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      originalPrompt: "Fix math",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    expect(history.finalStatus).toBe("exhausted");
    expect(history.successAttemptNumber).toBeUndefined();
    expect(history.attempts).toHaveLength(4);
  });

  it("does not run a fourth attempt when the third attempt passes", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 5;\n" }],
          notes: []
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 6;\n" }],
          notes: []
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 7;\n" }],
          notes: []
        })
      );

    const failLog = await createLog(projectRoot, "attempt1.log", "FAIL still failing\n");
    const failLog2 = await createLog(projectRoot, "attempt2.log", "FAIL still failing\n");

    runInSandboxMock
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 70,
        logsPath: failLog,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 80,
        logsPath: failLog2,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 90,
        logsPath: await createLog(projectRoot, "attempt3.log", "PASS"),
        timestamp: new Date().toISOString()
      });

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => (now += 55));

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      projectSlug: "skip-fourth",
      originalPrompt: "Fix again",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    expect(history.attempts).toHaveLength(3);
    expect(runInSandboxMock).toHaveBeenCalledTimes(3);
    expect(history.finalStatus).toBe("pass");
  });

  it("records error attempts when the LLM call fails and continues with remaining attempts", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    generateJSONMock
      .mockRejectedValueOnce(new Error("network failure"))
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 9;\n" }],
          notes: []
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 10;\n" }],
          notes: []
        })
      );

    const failLog = await createLog(projectRoot, "attempt2.log", "FAIL after retry\n  ● still failing\n");

    runInSandboxMock
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 60,
        logsPath: failLog,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 70,
        logsPath: await createLog(projectRoot, "attempt3.log", "PASS"),
        timestamp: new Date().toISOString()
      });

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => (now += 45));

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      originalPrompt: "Handle errors",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    expect(history.attempts[0]!.status).toBe("error");
    expect(history.attempts[0]!.testResult.status).toBe("error");
    expect(history.attempts[1]!.status).toBe("fail");
    expect(history.attempts[2]!.status).toBe("pass");
    expect(history.finalStatus).toBe("pass");
  });

  it("produces histories that validate against the schema", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 11;\n" }],
          notes: []
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 12;\n" }],
          notes: []
        })
      );

    const failLog = await createLog(projectRoot, "attempt1.log", "FAIL once more\n");

    runInSandboxMock
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 60,
        logsPath: failLog,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 65,
        logsPath: await createLog(projectRoot, "attempt2.log", "PASS"),
        timestamp: new Date().toISOString()
      });

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => (now += 35));

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      originalPrompt: "Validate",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    const validation = validateRepairHistory(history);
    expect(validation.ok).toBe(true);
  });

  it("passes previous attempts into the repair prompt builder", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    const promptSpy = vi.spyOn(await import("../../src/repair/buildRepairPrompt.js"), "buildRepairPrompt");

    generateJSONMock
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 13;\n" }],
          notes: []
        })
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          artifacts: [{ path: filePath, action: "modify" }],
          files: [{ path: filePath, contents: "export const value = 14;\n" }],
          notes: []
        })
      );

    const failLog = await createLog(projectRoot, "attempt1.log", "FAIL context\n  ● issue persists\n");

    runInSandboxMock
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 55,
        logsPath: failLog,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 60,
        logsPath: await createLog(projectRoot, "attempt2.log", "PASS"),
        timestamp: new Date().toISOString()
      });

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => (now += 25));

    await multiTurnRepair({
      projectPath: projectRoot,
      originalPrompt: "Check context",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    expect(promptSpy).toHaveBeenCalledTimes(2);
    const secondCallArgs = promptSpy.mock.calls[1]![0]!;
    expect(secondCallArgs.previousAttempts.length).toBeGreaterThanOrEqual(1);
    expect(secondCallArgs.previousAttempts[0]!.status).toBe("fail");
    expect(secondCallArgs.previousAttempts[0]!.attemptNumber).toBe(1);
    promptSpy.mockRestore();
  });

  it("tracks cumulative time increasing each attempt", async () => {
    const { projectRoot, filePath, initialRun } = await createTempProject();

    generateJSONMock.mockResolvedValue(
      JSON.stringify({
        artifacts: [{ path: filePath, action: "modify" }],
        files: [{ path: filePath, contents: "export const value = 21;\n" }],
        notes: []
      })
    );

    const logPaths = await Promise.all([
      createLog(projectRoot, "attempt1.log", "FAIL still\n"),
      createLog(projectRoot, "attempt2.log", "FAIL still\n"),
      createLog(projectRoot, "attempt3.log", "PASS\n")
    ]);

    runInSandboxMock
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 70,
        logsPath: logPaths[0]!,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "fail",
        passCount: 0,
        failCount: 1,
        durationMs: 75,
        logsPath: logPaths[1]!,
        timestamp: new Date().toISOString()
      })
      .mockResolvedValueOnce({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 80,
        logsPath: logPaths[2]!,
        timestamp: new Date().toISOString()
      });

    let now = 0;
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => (now += 30));

    const history = await multiTurnRepair({
      projectPath: projectRoot,
      originalPrompt: "Check timing",
      generatedFiles: [filePath],
      initialTestResult: initialRun
    });

    dateSpy.mockRestore();

    expect(history.attempts[0]!.cumulativeTime).toBeGreaterThan(0);
    expect(history.attempts[1]!.cumulativeTime).toBeGreaterThan(history.attempts[0]!.cumulativeTime);
    expect(history.attempts[2]!.cumulativeTime).toBeGreaterThan(history.attempts[1]!.cumulativeTime);
  });
});
