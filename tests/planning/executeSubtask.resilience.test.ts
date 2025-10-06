import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn()
}));

import { executeSubtask } from "../../src/planning/executeSubtask.js";
import { generateSubtaskOutputWithRetry } from "../../src/planning/generateSubtaskOutput.js";
import { generateJSON } from "../../src/llm/index.js";
import type { ExecutionContext } from "../../src/planning/types.js";

const generateJSONMock = vi.mocked(generateJSON);
const tempDirs: string[] = [];

beforeEach(() => {
  generateJSONMock.mockReset();
});

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe("executeSubtask resilience", () => {
  async function createContext(): Promise<ExecutionContext> {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "subtask-resilience-"));
    tempDirs.push(projectPath);

    return {
      projectPath,
      projectSlug: "demo",
      originalPrompt: "Fix the project",
      clarifications: undefined,
      previousSubtaskResults: [],
      generateSubtaskOutput: request =>
        generateSubtaskOutputWithRetry("system", request, false),
      writeFiles: async (rootDir, files) => {
        await Promise.all(
          files.map(file =>
            fs.mkdir(path.dirname(path.join(rootDir, file.path)), { recursive: true }).then(() =>
              fs.writeFile(path.join(rootDir, file.path), file.contents, "utf-8")
            )
          )
        );
      },
      runTests: async () => ({
        status: "pass",
        passCount: 1,
        failCount: 0,
        durationMs: 100,
        logsPath: "",
        timestamp: new Date().toISOString()
      }),
      multiTurnRepair: vi.fn(),
      now: () => Date.now()
    };
  }

  const subtask = {
    id: "subtask-1",
    title: "Implement feature",
    description: "",
    status: "pending" as const
  };

  it("succeeds when wrapper retries after invalid response", async () => {
    generateJSONMock
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce(
        JSON.stringify({
          project_name: "demo",
          files: [{ path: "src/index.ts", contents: "export const value = 1;" }],
          notes: [],
          hasTests: false
        })
      );

    const context = await createContext();
    const result = await executeSubtask(subtask, context);

    expect(result.status).toBe("completed");
    expect(result.generatedFiles).toContain("src/index.ts");
    expect(result.notes).toBeUndefined();
    expect(generateJSONMock).toHaveBeenCalledTimes(2);
  });

  it("reports failure when retries exhausted", async () => {
    generateJSONMock.mockResolvedValue("not-json");
    const context = await createContext();

    const result = await executeSubtask(subtask, context);

    expect(result.status).toBe("failed");
    expect(result.notes).toMatch(/Failed to generate valid subtask output/);
    expect(generateJSONMock).toHaveBeenCalledTimes(2);
  });
});
