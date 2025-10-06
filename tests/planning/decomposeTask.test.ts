import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn()
}));

import { generateJSON } from "../../src/llm/index.js";
import { decomposeTask } from "../../src/planning/decomposeTask.js";
import { TaskPlanValidationError } from "../../src/planning/types.js";

const generateJSONMock = vi.mocked(generateJSON);

function buildResponse(subtasks: Array<{
  id: string;
  dependencies?: string[];
}>, overrides: Record<string, unknown> = {}): string {
  const enrichedSubtasks = subtasks.map(subtask => ({
    id: subtask.id,
    title: `${subtask.id} title`,
    description: `${subtask.id} description that is sufficiently detailed`,
    status: "pending",
    dependencies: subtask.dependencies ?? [],
    estimatedComplexity: "medium",
    successCriteria: `Complete ${subtask.id}`
  }));

  return JSON.stringify({
    originalPrompt: overrides.originalPrompt ?? "prompt",
    subtasks: enrichedSubtasks,
    totalSubtasks: overrides.totalSubtasks ?? enrichedSubtasks.length,
    decompositionStrategy: overrides.decompositionStrategy ?? "strategy"
  });
}

describe("decomposeTask", () => {
  beforeEach(() => {
    generateJSONMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decomposes a simple prompt", async () => {
    generateJSONMock.mockResolvedValueOnce(
      buildResponse([
        { id: "setup" },
        { id: "build", dependencies: ["setup"] }
      ])
    );

    const plan = await decomposeTask("build Flask hello world");
    expect(plan.subtasks).toHaveLength(2);
    expect(plan.totalSubtasks).toBe(2);
  });

  it("decomposes a medium complexity prompt", async () => {
    generateJSONMock.mockResolvedValueOnce(
      buildResponse([
        { id: "requirements" },
        { id: "backend", dependencies: ["requirements"] },
        { id: "auth", dependencies: ["backend"] },
        { id: "crud", dependencies: ["backend", "auth"] },
        { id: "frontend", dependencies: ["crud", "auth"] },
        { id: "tests", dependencies: ["crud"] }
      ])
    );

    const plan = await decomposeTask("build todo app with auth");
    expect(plan.subtasks).toHaveLength(6);
  });

  it("decomposes a complex prompt", async () => {
    generateJSONMock.mockResolvedValueOnce(
      buildResponse([
        { id: "requirements" },
        { id: "database", dependencies: ["requirements"] },
        { id: "auth", dependencies: ["database"] },
        { id: "catalog", dependencies: ["database"] },
        { id: "checkout", dependencies: ["catalog", "auth"] },
        { id: "payment", dependencies: ["checkout"] },
        { id: "orders", dependencies: ["payment"] },
        { id: "admin", dependencies: ["orders", "catalog"] },
        { id: "tests", dependencies: ["catalog", "checkout"] },
        { id: "deploy", dependencies: ["tests"] }
      ])
    );

    const plan = await decomposeTask("build e-commerce site");
    expect(plan.subtasks).toHaveLength(10);
    expect(plan.subtasks[0].id).toBe("requirements");
  });

  it("uses clarifications when provided", async () => {
    generateJSONMock.mockResolvedValueOnce(
      buildResponse([
        { id: "setup" },
        { id: "feature", dependencies: ["setup"] }
      ])
    );

    const plan = await decomposeTask("build app", {
      answers: [
        { questionId: "framework", value: "nextjs" },
        { questionId: "database", value: "postgres" }
      ]
    });

    expect(plan.subtasks).toHaveLength(2);
    expect(generateJSONMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("framework")
        })
      ])
    );
  });

  it("retries when LLM returns invalid JSON", async () => {
    generateJSONMock
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce(
        buildResponse([
          { id: "setup" },
          { id: "feature", dependencies: ["setup"] }
        ])
      );

    const plan = await decomposeTask("build flask hello world");
    expect(plan.subtasks).toHaveLength(2);
    expect(generateJSONMock).toHaveBeenCalledTimes(2);
  });

  it("throws when validation fails after retries", async () => {
    const invalid = JSON.stringify({
      originalPrompt: "prompt",
      subtasks: [
        {
          id: "duplicate",
          title: "dup",
          description: "duplicate description",
          status: "pending",
          dependencies: [],
          estimatedComplexity: "medium",
          successCriteria: "done"
        },
        {
          id: "duplicate",
          title: "dup",
          description: "duplicate description",
          status: "pending",
          dependencies: [],
          estimatedComplexity: "medium",
          successCriteria: "done"
        }
      ],
      totalSubtasks: 2
    });

    generateJSONMock.mockResolvedValue(invalid);

    await expect(() => decomposeTask("build todo app with auth"))
      .rejects.toBeInstanceOf(TaskPlanValidationError);
  });

  it("suggests clarification for vague prompt", async () => {
    await expect(() => decomposeTask("build an app"))
      .rejects.toThrow(/clarifications/i);
  });
});
