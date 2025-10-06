import { describe, expect, it } from "vitest";

import { validateDecomposition } from "../../src/planning/validateDecomposition.js";
import type { TaskPlan, Subtask } from "../../src/planning/types.js";

function createSubtask(partial: Partial<Subtask> & { id: string }): Subtask {
  return {
    id: partial.id,
    title: partial.title ?? `${partial.id} title`,
    description:
      partial.description ??
        `${partial.id} description with actionable details about implementation steps and verification`,
    status: partial.status ?? "pending",
    dependencies: partial.dependencies ?? [],
    estimatedComplexity: partial.estimatedComplexity ?? "medium",
    successCriteria: partial.successCriteria ?? `Complete ${partial.id}`
  };
}

function buildPlan(subtasks: Subtask[]): TaskPlan {
  return {
    originalPrompt: "prompt",
    subtasks,
    totalSubtasks: subtasks.length,
    decompositionStrategy: "strategy"
  };
}

describe("validateDecomposition", () => {
  it("scores a good decomposition highly", () => {
    const plan = buildPlan([
      createSubtask({
        id: "requirements",
        description: "Gather detailed todo requirements and constraints from stakeholders"
      }),
      createSubtask({
        id: "database",
        description: "Design relational database schema and persistence for todo items",
        dependencies: ["requirements"]
      }),
      createSubtask({
        id: "auth",
        description: "Implement signup and login flows with password hashing",
        dependencies: ["database"]
      }),
      createSubtask({
        id: "crud",
        description: "Build CRUD endpoints for todo items tied to authenticated users",
        dependencies: ["auth"]
      }),
      createSubtask({
        id: "tests",
        description: "Write integration tests covering auth and todo flows",
        dependencies: ["crud"]
      })
    ]);

    const quality = validateDecomposition(plan, "build todo app with auth and database");
    expect(quality.score).toBe(100);
    expect(quality.issues).toHaveLength(0);
    expect(quality.warnings).toHaveLength(0);
    expect(quality.requiresHumanReview).toBe(false);
  });

  it("detects vague subtask descriptions", () => {
    const plan = buildPlan([
      createSubtask({ id: "step-a", description: "Do the basic setup quickly with minimal detail" }),
      createSubtask({ id: "step-b", description: "Handle the remaining work without specific actions" })
    ]);

    const quality = validateDecomposition(plan, "build simple app");
    expect(quality.issues.some(issue => issue.code === "description-too-vague")).toBe(true);
  });

  it("detects overly detailed subtasks", () => {
    const longDescription = Array.from({ length: 90 }, () => "info").join(" ");
    const plan = buildPlan([
      createSubtask({ id: "step-a", description: longDescription }),
      createSubtask({ id: "tests", description: "Write automated regression tests covering behaviour" })
    ]);

    const quality = validateDecomposition(plan, "build feature");
    expect(quality.issues.some(issue => issue.code === "description-too-detailed")).toBe(true);
  });

  it("detects missing critical steps", () => {
    const plan = buildPlan([
      createSubtask({ id: "requirements" }),
      createSubtask({ id: "frontend" }),
      createSubtask({ id: "tests" })
    ]);

    const quality = validateDecomposition(plan, "build secure app with auth");
    expect(quality.issues.some(issue => issue.code === "missing-critical-step")).toBe(true);
  });

  it("detects circular dependencies", () => {
    const plan = buildPlan([
      createSubtask({ id: "task-a", dependencies: ["task-b"] }),
      createSubtask({ id: "task-b", dependencies: ["task-a"] })
    ]);

    const quality = validateDecomposition(plan, "build something");
    expect(quality.issues.some(issue => issue.code === "circular-dependency")).toBe(true);
  });

  it("flags adequate plans with warnings but keeps review optional", () => {
    const plan = buildPlan([
      createSubtask({
        id: "setup-1",
        title: "Install dependencies",
        description: "Install CLI dependencies and bootstrap project tooling for the command line"
      }),
      createSubtask({
        id: "setup-2",
        title: "Configure tooling",
        description: "Configure linting, formatting, and CLI execution scripts"
      }),
      createSubtask({
        id: "setup-3",
        title: "Set up CI",
        description: "Set up continuous integration pipeline for the cli project"
      }),
      createSubtask({
        id: "setup-4",
        title: "Set up env vars",
        description: "Define environment variables required for cli configuration"
      }),
      createSubtask({
        id: "tests",
        description: "Write tests for flows including cli argument parsing"
      })
    ]);

    const quality = validateDecomposition(plan, "build cli tool");
    expect(quality.warnings.length).toBeGreaterThan(0);
    expect(quality.score).toBeLessThan(100);
    expect(quality.requiresHumanReview).toBe(false);
  });

  it("sets human review flag when score drops below threshold", () => {
    const plan = buildPlan([
      createSubtask({ id: "step-a", description: "Do the basic setup quickly with minimal detail" }),
      createSubtask({ id: "step-b", description: "Do more of the generic work without detail" })
    ]);

    const quality = validateDecomposition(plan, "build secure api with auth and database");
    expect(quality.score).toBeLessThan(70);
    expect(quality.requiresHumanReview).toBe(true);
  });
});
