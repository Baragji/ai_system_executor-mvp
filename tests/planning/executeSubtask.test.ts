import { describe, expect, it, vi, beforeEach } from "vitest";

import { executeSubtask } from "../../src/planning/executeSubtask.js";
import type {
  ExecutionContext,
  Subtask,
  SubtaskResult,
  SubtaskPromptRequest
} from "../../src/planning/types.js";
import type { ExecutorOutput } from "../../src/executor/types.js";
import type { RunResult } from "../../src/contracts/validators.js";
import type { RepairHistory } from "../../src/contracts/repairHistoryValidator.js";

function createRunResult(status: RunResult["status"], overrides: Partial<RunResult> = {}): RunResult {
  return {
    status,
    passCount: overrides.passCount ?? (status === "pass" ? 2 : 0),
    failCount: overrides.failCount ?? (status === "pass" ? 0 : 1),
    durationMs: overrides.durationMs ?? 1200,
    logsPath: overrides.logsPath ?? `logs/${status}.log`,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    command: overrides.command,
    exitCode: overrides.exitCode,
    signal: overrides.signal,
    timedOut: overrides.timedOut,
    errorMessage: overrides.errorMessage,
    startedAt: overrides.startedAt,
    finishedAt: overrides.finishedAt
  };
}

function buildHistory(finalStatus: RepairHistory["finalStatus"], finalResult: RunResult): RepairHistory {
  return {
    attempts: [
      {
        number: 1,
        status: finalStatus === "pass" ? "pass" : "fail",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        changedFiles: ["src/index.ts"],
        summary: finalStatus === "pass" ? "Fixed failing tests" : "Unable to resolve failures",
        testResult: {
          status: finalResult.status,
          passCount: finalResult.passCount,
          failCount: finalResult.failCount,
          durationMs: finalResult.durationMs,
          logsPath: finalResult.logsPath
        },
        durationMs: finalResult.durationMs ?? 0,
        cumulativeTime: finalResult.durationMs ?? 0
      }
    ],
    finalStatus,
    totalAttempts: 1,
    successAttemptNumber: finalStatus === "pass" ? 1 : undefined
  };
}

function createSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: "setup",
    title: "Set up project",
    description: "Initialize repository and install dependencies",
    status: "pending",
    ...overrides
  };
}

function createContext(overrides: Partial<ExecutionContext> = {}): {
  context: ExecutionContext;
  generateMock: ReturnType<typeof vi.fn>;
  runTestsMock: ReturnType<typeof vi.fn>;
  repairMock: ReturnType<typeof vi.fn>;
  writtenFiles: string[][];
  prompts: string[];
} {
  let timestamp = 0;
  const prompts: string[] = [];
  const writtenFiles: string[][] = [];

  const defaultGenerate = vi.fn(async (request: SubtaskPromptRequest): Promise<ExecutorOutput> => {
    prompts.push(request.prompt);
    return {
      project_name: "demo",
      files: [
        { path: "src/index.ts", contents: "export const value = 1;" }
      ],
      notes: ["Generated"],
      hasTests: true
    };
  });

  const defaultRunTests = vi.fn(async () => createRunResult("pass"));

  const defaultRepair = vi.fn(async () => buildHistory("pass", createRunResult("pass")));

  const context: ExecutionContext = {
    projectPath: "/tmp/project",
    projectSlug: "project",
    originalPrompt: "Build a complex demo",
    previousSubtaskResults: [],
    generateSubtaskOutput: defaultGenerate as ExecutionContext["generateSubtaskOutput"],
    writeFiles: async (_root, files) => {
      writtenFiles.push(files.map(file => file.path));
    },
    runTests: defaultRunTests as ExecutionContext["runTests"],
    multiTurnRepair: defaultRepair as ExecutionContext["multiTurnRepair"],
    now: () => {
      timestamp += 50;
      return timestamp;
    },
    onPromptBuilt: request => {
      prompts.push(request.prompt);
    },
    ...overrides
  };

  const generateMock = context.generateSubtaskOutput as unknown as ReturnType<typeof vi.fn>;
  const runTestsMock = context.runTests as unknown as ReturnType<typeof vi.fn>;
  const repairMock = context.multiTurnRepair as unknown as ReturnType<typeof vi.fn>;

  return {
    context,
    generateMock,
    runTestsMock,
    repairMock,
    writtenFiles,
    prompts
  };
}

describe("executeSubtask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes a subtask with passing tests", async () => {
    const { context, generateMock, runTestsMock, repairMock, writtenFiles } = createContext();

    const result = await executeSubtask(createSubtask(), context);

    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(runTestsMock).toHaveBeenCalledTimes(1);
    expect(repairMock).not.toHaveBeenCalled();
    expect(writtenFiles[0]).toContain("src/index.ts");
    expect(result.status).toBe("completed");
    expect(result.testResult?.status).toBe("pass");
  });

  it("triggers repair when tests fail", async () => {
    const failingRun = createRunResult("fail", { failCount: 2 });
    const repairSuccessHistory = buildHistory("pass", createRunResult("pass"));
    const { context, runTestsMock, repairMock } = createContext({
      runTests: vi.fn(async () => failingRun),
      multiTurnRepair: vi.fn(async () => repairSuccessHistory)
    });

    const result = await executeSubtask(createSubtask({ id: "auth" }), context);

    expect(runTestsMock).toHaveBeenCalledOnce();
    expect(repairMock).toHaveBeenCalledOnce();
    expect(result.status).toBe("completed");
    expect(result.repairHistory?.finalStatus).toBe("pass");
  });

  it("returns failure when repairs are exhausted", async () => {
    const failingRun = createRunResult("fail", { failCount: 3 });
    const exhaustedHistory = buildHistory("exhausted", failingRun);
    const { context } = createContext({
      runTests: vi.fn(async () => failingRun),
      multiTurnRepair: vi.fn(async () => exhaustedHistory)
    });

    const result = await executeSubtask(createSubtask({ id: "database" }), context);

    expect(result.status).toBe("failed");
    expect(result.repairHistory?.finalStatus).toBe("exhausted");
    expect(result.notes).toContain("Tests failing");
  });

  it("skips tests when none are generated", async () => {
    const { context, runTestsMock } = createContext({
      generateSubtaskOutput: vi.fn(async request => ({
        ...request,
        files: [
          { path: "README.md", contents: "# Demo" }
        ],
        hasTests: false,
        notes: ["Setup complete"]
      }) as unknown as ExecutorOutput)
    });

    const result = await executeSubtask(createSubtask({ id: "docs" }), context);

    expect(runTestsMock).not.toHaveBeenCalled();
    expect(result.status).toBe("completed");
    expect(result.testResult).toBeNull();
    expect(result.notes).toContain("Setup complete");
  });

  it("includes previous subtask context in prompt", async () => {
    const previous: SubtaskResult[] = [
      {
        status: "completed",
        subtaskId: "setup",
        generatedFiles: ["package.json"],
        testResult: createRunResult("pass"),
        repairHistory: null,
        durationMs: 100,
        notes: "baseline"
      }
    ];

    const { context, prompts } = createContext({ previousSubtaskResults: previous });

    await executeSubtask(createSubtask({ id: "feature" }), context);

    const prompt = prompts[0];
    expect(prompt).toContain("setup");
    expect(prompt).toContain("baseline");
    expect(prompt).toContain("Subtask to execute");
  });

  it("handles LLM errors gracefully", async () => {
    const { context } = createContext({
      generateSubtaskOutput: vi.fn(async () => {
        throw new Error("LLM failure");
      })
    });

    const result = await executeSubtask(createSubtask({ id: "broken" }), context);

    expect(result.status).toBe("failed");
    expect(result.notes).toContain("LLM failure");
  });

  it("returns structured result with duration", async () => {
    const { context } = createContext();

    const result = await executeSubtask(createSubtask({ id: "summary" }), context);

    expect(result.subtaskId).toBe("summary");
    expect(result.generatedFiles.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThan(0);
  });
});
