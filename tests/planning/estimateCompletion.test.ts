import { describe, expect, it } from "vitest";

import { estimateCompletion } from "../../src/planning/estimateCompletion.js";
import type { ProgressSnapshot, Subtask, TaskPlan } from "../../src/planning/types.js";

function createSubtask(id: string, overrides: Partial<Subtask> = {}): Subtask {
  return {
    id,
    title: id,
    description: `${id} description`,
    status: "pending",
    dependencies: [],
    estimatedComplexity: "medium",
    ...overrides
  };
}

function createPlan(subtasks: Subtask[]): TaskPlan {
  return {
    originalPrompt: "build complex app",
    subtasks,
    totalSubtasks: subtasks.length,
    decompositionStrategy: "scenario"
  };
}

function snapshot(overrides: Partial<ProgressSnapshot>): ProgressSnapshot {
  return {
    totalSubtasks: 5,
    completedSubtasks: 0,
    failedSubtasks: 0,
    currentSubtask: null,
    elapsedMs: 0,
    percentComplete: 0,
    ...overrides
  };
}

describe("estimateCompletion", () => {
  it("provides low confidence early in plan", () => {
    const subtasks = [
      createSubtask("setup", { status: "completed" }),
      createSubtask("backend"),
      createSubtask("frontend"),
      createSubtask("auth"),
      createSubtask("tests")
    ];
    const plan = createPlan(subtasks);
    const progress = snapshot({
      totalSubtasks: subtasks.length,
      completedSubtasks: 1,
      elapsedMs: 10 * 60 * 1000
    });

    const estimate = estimateCompletion(progress, plan);

    expect(estimate.confidenceLevel).toBe("low");
    expect(estimate.estimatedRemainingMs).toBeGreaterThan(progress.elapsedMs);
  });

  it("returns medium confidence mid-way", () => {
    const subtasks = [
      createSubtask("setup", { status: "completed" }),
      createSubtask("backend", { status: "completed" }),
      createSubtask("frontend", { status: "completed" }),
      createSubtask("auth"),
      createSubtask("tests")
    ];
    const plan = createPlan(subtasks);
    const progress = snapshot({
      totalSubtasks: subtasks.length,
      completedSubtasks: 3,
      elapsedMs: 45 * 60 * 1000
    });

    const estimate = estimateCompletion(progress, plan);

    expect(estimate.confidenceLevel).toBe("medium");
    expect(estimate.estimatedRemainingMs).toBeGreaterThan(0);
  });

  it("achieves high confidence near completion", () => {
    const subtasks = [
      createSubtask("setup", { status: "completed" }),
      createSubtask("backend", { status: "completed" }),
      createSubtask("frontend", { status: "completed" }),
      createSubtask("auth", { status: "completed" }),
      createSubtask("tests")
    ];
    const plan = createPlan(subtasks);
    const progress = snapshot({
      totalSubtasks: subtasks.length,
      completedSubtasks: 4,
      elapsedMs: 90 * 60 * 1000
    });

    const estimate = estimateCompletion(progress, plan);

    expect(estimate.confidenceLevel).toBe("high");
    expect(estimate.estimatedRemainingMs).toBeLessThan(30 * 60 * 1000);
  });

  it("weights high complexity subtasks heavier", () => {
    const subtasks = [
      createSubtask("setup", { status: "completed" }),
      createSubtask("backend", { estimatedComplexity: "high" }),
      createSubtask("frontend")
    ];
    const plan = createPlan(subtasks);
    const progress = snapshot({
      totalSubtasks: subtasks.length,
      completedSubtasks: 1,
      elapsedMs: 30 * 60 * 1000
    });

    const highEstimate = estimateCompletion(progress, plan);

    subtasks[1]!.estimatedComplexity = "low";
    const lowEstimate = estimateCompletion(progress, plan);

    expect(highEstimate.estimatedRemainingMs).toBeGreaterThan(lowEstimate.estimatedRemainingMs);
  });

  it("reduces remaining time as subtasks finish", () => {
    const subtasks = [
      createSubtask("setup", { status: "completed" }),
      createSubtask("backend"),
      createSubtask("frontend")
    ];
    const plan = createPlan(subtasks);

    const earlyProgress = snapshot({
      totalSubtasks: subtasks.length,
      completedSubtasks: 1,
      elapsedMs: 20 * 60 * 1000
    });
    const earlyEstimate = estimateCompletion(earlyProgress, plan);

    subtasks[1]!.status = "completed";
    const laterProgress = snapshot({
      totalSubtasks: subtasks.length,
      completedSubtasks: 2,
      elapsedMs: 40 * 60 * 1000
    });
    const laterEstimate = estimateCompletion(laterProgress, plan);

    expect(laterEstimate.estimatedRemainingMs).toBeLessThan(earlyEstimate.estimatedRemainingMs);
  });

  it("increases confidence as work progresses", () => {
    const subtasks = [
      createSubtask("setup", { status: "completed" }),
      createSubtask("backend", { status: "completed" }),
      createSubtask("frontend", { status: "completed" }),
      createSubtask("auth"),
      createSubtask("tests")
    ];
    const plan = createPlan(subtasks);

    const early = estimateCompletion(
      snapshot({ totalSubtasks: 5, completedSubtasks: 1, elapsedMs: 10 * 60 * 1000 }),
      plan
    );
    const mid = estimateCompletion(
      snapshot({ totalSubtasks: 5, completedSubtasks: 3, elapsedMs: 50 * 60 * 1000 }),
      plan
    );
    subtasks[3]!.status = "completed";
    const late = estimateCompletion(
      snapshot({ totalSubtasks: 5, completedSubtasks: 4, elapsedMs: 80 * 60 * 1000 }),
      plan
    );

    const levels = [early.confidenceLevel, mid.confidenceLevel, late.confidenceLevel];
    expect(levels).toEqual(["low", "medium", "high"]);
  });
});
