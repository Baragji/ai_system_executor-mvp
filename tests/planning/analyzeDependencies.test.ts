import { describe, expect, it } from "vitest";

import { analyzeDependencies } from "../../src/planning/analyzeDependencies.js";
import type { TaskPlan, Subtask } from "../../src/planning/types.js";

function buildPlan(subtasks: Subtask[]): TaskPlan {
  return {
    originalPrompt: "prompt",
    subtasks,
    totalSubtasks: subtasks.length,
    decompositionStrategy: "strategy"
  };
}

function subtask(id: string, deps: string[] = []): Subtask {
  return {
    id,
    title: `${id} title`,
    description: `${id} description with sufficient detail`,
    status: "pending",
    dependencies: deps,
    estimatedComplexity: "medium",
    successCriteria: `${id} done`
  };
}

describe("analyzeDependencies", () => {
  it("detects acyclic graph", () => {
    const plan = buildPlan([
      subtask("a"),
      subtask("b", ["a"]),
      subtask("c", ["b"])
    ]);

    const analysis = analyzeDependencies(plan);
    expect(analysis.isAcyclic).toBe(true);
    expect(analysis.executionOrder).toEqual(["a", "b", "c"]);
  });

  it("detects cycles", () => {
    const plan = buildPlan([
      subtask("a", ["b"]),
      subtask("b", ["a"])
    ]);

    const analysis = analyzeDependencies(plan);
    expect(analysis.isAcyclic).toBe(false);
    expect(analysis.cycles.length).toBeGreaterThan(0);
  });

  it("computes parallelizable groups", () => {
    const plan = buildPlan([
      subtask("setup"),
      subtask("backend", ["setup"]),
      subtask("frontend", ["setup"]),
      subtask("tests", ["backend", "frontend"])
    ]);

    const analysis = analyzeDependencies(plan);
    expect(analysis.parallelizable).toEqual([
      ["setup"],
      expect.arrayContaining(["backend", "frontend"]),
      ["tests"]
    ]);
  });

  it("computes critical path", () => {
    const plan = buildPlan([
      subtask("setup"),
      subtask("auth", ["setup"]),
      subtask("crud", ["auth"]),
      subtask("frontend", ["crud"]),
      subtask("docs", ["setup"])
    ]);

    const analysis = analyzeDependencies(plan);
    expect(analysis.criticalPath).toEqual(["setup", "auth", "crud", "frontend"]);
  });

  it("handles complex graph", () => {
    const plan = buildPlan([
      subtask("requirements"),
      subtask("design", ["requirements"]),
      subtask("database", ["design"]),
      subtask("auth", ["database"]),
      subtask("catalog", ["database"]),
      subtask("checkout", ["catalog", "auth"]),
      subtask("payment", ["checkout"]),
      subtask("tests", ["checkout", "payment"])
    ]);

    const analysis = analyzeDependencies(plan);
    expect(analysis.isAcyclic).toBe(true);
    expect(analysis.executionOrder[0]).toBe("requirements");
    expect(analysis.executionOrder).toContain("payment");
    expect(analysis.parallelizable.some(group => group.includes("catalog"))).toBe(true);
  });
});
