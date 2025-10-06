import { describe, expect, it } from "vitest";

import { validateTaskPlan } from "../../src/contracts/taskPlanValidator.js";
import type { Subtask, TaskPlan } from "../../src/planning/types.js";

function createSubtask(partial: Partial<Subtask> & { id: string }): Subtask {
  return {
    id: partial.id,
    title: partial.title ?? "Implement feature",
    description: partial.description ?? "Provide an actionable description for the subtask.",
    status: partial.status ?? "pending",
    dependencies: partial.dependencies ?? [],
    estimatedComplexity: partial.estimatedComplexity ?? "medium",
    successCriteria:
      partial.successCriteria ?? "Demonstrate the subtask delivers the promised feature with tests."
  };
}

function buildPlan(subtasks: Subtask[], overrides: Partial<TaskPlan> = {}): TaskPlan {
  return {
    originalPrompt: overrides.originalPrompt ?? "Implement something useful",
    subtasks,
    totalSubtasks: overrides.totalSubtasks ?? subtasks.length,
    decompositionStrategy: overrides.decompositionStrategy ?? "feature-first"
  };
}

describe("task plan validation", () => {
  it("accepts a valid simple plan", () => {
    const subtasks = [
      createSubtask({ id: "setup-env", title: "Set up project" }),
      createSubtask({
        id: "build-feature",
        title: "Build main feature",
        dependencies: ["setup-env"]
      })
    ];

    const result = validateTaskPlan(buildPlan(subtasks));
    expect(result.ok).toBe(true);
  });

  it("accepts a valid medium plan with dependencies", () => {
    const subtasks = [
      createSubtask({ id: "define-requirements" }),
      createSubtask({ id: "scaffold-backend", dependencies: ["define-requirements"] }),
      createSubtask({
        id: "implement-auth",
        dependencies: ["scaffold-backend"]
      }),
      createSubtask({
        id: "implement-crud",
        dependencies: ["scaffold-backend", "implement-auth"]
      }),
      createSubtask({
        id: "frontend",
        dependencies: ["implement-crud", "implement-auth"]
      }),
      createSubtask({ id: "tests", dependencies: ["implement-crud"] })
    ];

    const result = validateTaskPlan(buildPlan(subtasks));
    expect(result.ok).toBe(true);
  });

  it("accepts a valid complex plan with many subtasks", () => {
    const subtasks = [
      createSubtask({ id: "gather-requirements" }),
      createSubtask({ id: "design-database", dependencies: ["gather-requirements"] }),
      createSubtask({ id: "implement-auth", dependencies: ["design-database"] }),
      createSubtask({ id: "catalog", dependencies: ["design-database"] }),
      createSubtask({ id: "checkout", dependencies: ["catalog", "implement-auth"] }),
      createSubtask({ id: "payment", dependencies: ["checkout"] }),
      createSubtask({ id: "orders", dependencies: ["payment"] }),
      createSubtask({ id: "admin", dependencies: ["orders", "catalog"] }),
      createSubtask({ id: "tests", dependencies: ["catalog", "checkout"] }),
      createSubtask({ id: "deploy", dependencies: ["tests"] })
    ];

    const result = validateTaskPlan(buildPlan(subtasks));
    expect(result.ok).toBe(true);
  });

  it("rejects plan with less than 2 subtasks", () => {
    const plan = buildPlan([createSubtask({ id: "single" })], { totalSubtasks: 1 });
    const result = validateTaskPlan(plan);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatch(/totalSubtasks/);
    }
  });

  it("rejects plan with more than 10 subtasks", () => {
    const subtasks = Array.from({ length: 11 }, (_, index) =>
      createSubtask({ id: `task-${index}`, title: `Task ${index}` })
    );

    const result = validateTaskPlan(buildPlan(subtasks, { totalSubtasks: 11 }));
    expect(result.ok).toBe(false);
  });

  it("rejects circular dependencies", () => {
    const subtasks = [
      createSubtask({ id: "task-a", dependencies: ["task-b"] }),
      createSubtask({ id: "task-b", dependencies: ["task-a"] })
    ];

    const result = validateTaskPlan(buildPlan(subtasks));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatch(/Circular dependency/);
    }
  });

  it("rejects missing dependency references", () => {
    const subtasks = [
      createSubtask({ id: "task-a", dependencies: ["task-b"] }),
      createSubtask({ id: "task-c" })
    ];

    const result = validateTaskPlan(buildPlan(subtasks));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatch(/unknown subtask/);
    }
  });

  it("rejects duplicate subtask ids", () => {
    const subtasks = [
      createSubtask({ id: "dup" }),
      createSubtask({ id: "dup" })
    ];

    const result = validateTaskPlan(buildPlan(subtasks, { totalSubtasks: 2 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatch(/duplicated/);
    }
  });
});
