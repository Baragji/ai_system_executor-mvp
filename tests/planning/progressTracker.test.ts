import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProgressTracker } from "../../src/planning/progressTracker.js";
import type { TaskPlan, Subtask } from "../../src/planning/types.js";

function createPlan(): TaskPlan {
  const subtasks: Subtask[] = [
    {
      id: "setup",
      title: "Set up project",
      description: "Initialize repository and install dependencies",
      status: "pending",
      dependencies: [],
      estimatedComplexity: "medium",
      successCriteria: "Repository initialized"
    },
    {
      id: "auth",
      title: "Implement auth",
      description: "Build signup and login flows",
      status: "pending",
      dependencies: ["setup"],
      estimatedComplexity: "high",
      successCriteria: "Users can log in"
    },
    {
      id: "tests",
      title: "Write tests",
      description: "Write integration tests covering auth",
      status: "pending",
      dependencies: ["auth"],
      estimatedComplexity: "medium",
      successCriteria: "Tests pass"
    }
  ];

  return {
    originalPrompt: "build todo app with auth",
    subtasks,
    totalSubtasks: subtasks.length,
    decompositionStrategy: "feature-first"
  };
}

describe("ProgressTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with task plan", () => {
    const tracker = new ProgressTracker(createPlan());
    const progress = tracker.getProgress();

    expect(progress.totalSubtasks).toBe(3);
    expect(progress.completedSubtasks).toBe(0);
    expect(progress.failedSubtasks).toBe(0);
    expect(progress.currentSubtask?.id).toBe("setup");
  });

  it("tracks subtask completion", () => {
    const tracker = new ProgressTracker(createPlan());
    tracker.markSubtaskComplete("setup", { status: "success" });

    const progress = tracker.getProgress();
    expect(progress.completedSubtasks).toBe(1);
    expect(progress.currentSubtask?.id).toBe("auth");
  });

  it("tracks subtask failure", () => {
    const tracker = new ProgressTracker(createPlan());
    tracker.markSubtaskComplete("setup", { status: "success" });
    tracker.markSubtaskFailed("auth", new Error("api error"));

    const progress = tracker.getProgress();
    expect(progress.failedSubtasks).toBe(1);
    expect(progress.currentSubtask).toBeNull();
  });

  it("calculates progress percentage", () => {
    const tracker = new ProgressTracker(createPlan());
    tracker.markSubtaskComplete("setup", { status: "success" });
    tracker.markSubtaskComplete("auth", { status: "success" });

    const progress = tracker.getProgress();
    expect(progress.percentComplete).toBeCloseTo((2 / 3) * 100, 5);
  });

  it("detects completion", () => {
    const tracker = new ProgressTracker(createPlan());
    tracker.markSubtaskComplete("setup", { status: "success" });
    tracker.markSubtaskComplete("auth", { status: "success" });
    tracker.markSubtaskComplete("tests", { status: "success" });

    expect(tracker.isComplete()).toBe(true);
  });

  it("respects dependencies when fetching next subtask", () => {
    const tracker = new ProgressTracker(createPlan());
    expect(tracker.getNextSubtask()?.id).toBe("setup");

    tracker.markSubtaskComplete("setup", { status: "success" });
    expect(tracker.getNextSubtask()?.id).toBe("auth");
  });

  it("prevents completion before dependencies satisfied", () => {
    const tracker = new ProgressTracker(createPlan());
    expect(() => tracker.markSubtaskComplete("auth", { status: "success" })).toThrow(
      /Dependencies/
    );
  });

  it("handles out-of-order completion once dependencies met", () => {
    const tracker = new ProgressTracker(createPlan());
    tracker.markSubtaskComplete("setup", { status: "success" });
    tracker.markSubtaskComplete("auth", { status: "success" });

    expect(() => tracker.markSubtaskComplete("tests", { status: "success" })).not.toThrow();
    expect(tracker.getProgress().completedSubtasks).toBe(3);
  });
});
