import { beforeEach, describe, expect, it } from "vitest";

import { executeTaskPlan } from "../../src/planning/executeTaskPlan.js";
import type {
  PlanExecutionContext,
  PlanExecutionResult,
  Subtask,
  SubtaskResult,
  TaskPlan
} from "../../src/planning/types.js";

function createSubtask(id: string, overrides: Partial<Subtask> = {}): Subtask {
  return {
    id,
    title: id,
    description: `${id} work`,
    status: "pending",
    dependencies: [],
    estimatedComplexity: "medium",
    ...overrides
  };
}

function createPlan(subtasks: Subtask[]): TaskPlan {
  return {
    originalPrompt: "build todo app with auth",
    subtasks,
    totalSubtasks: subtasks.length,
    decompositionStrategy: "test"
  };
}

function makeResult(subtask: Subtask, status: SubtaskResult["status"], notes?: string): SubtaskResult {
  return {
    status,
    subtaskId: subtask.id,
    generatedFiles: status === "completed" ? [`${subtask.id}.ts`] : [],
    testResult: null,
    repairHistory: null,
    durationMs: 100,
    notes
  };
}

type ExecutorScenario = Record<string, SubtaskResult>;

function createContext(
  scenario: ExecutorScenario,
  overrides: Partial<PlanExecutionContext> = {}
): { context: PlanExecutionContext; calls: string[] } {
  const calls: string[] = [];
  let now = 0;

  const subtaskExecutor: PlanExecutionContext["subtaskExecutor"] = async (subtask, _execContext) => {
    calls.push(subtask.id);
    return scenario[subtask.id] ?? makeResult(subtask, "completed");
  };

  const context: PlanExecutionContext = {
    projectPath: "/tmp/project",
    projectSlug: "project",
    originalPrompt: "build todo app with auth",
    previousSubtaskResults: [],
    generateSubtaskOutput: async () => ({ files: [], hasTests: false }),
    writeFiles: async () => {},
    runTests: async () => ({
      status: "pass",
      passCount: 1,
      failCount: 0,
      durationMs: 0,
      logsPath: "logs/pass.log",
      timestamp: new Date().toISOString()
    }),
    multiTurnRepair: async () => ({
      attempts: [],
      finalStatus: "pass",
      totalAttempts: 0
    }),
    subtaskExecutor,
    now: () => {
      now += 50;
      return now;
    },
    onProgressUpdate: async () => {},
    logTelemetry: async () => {},
    ...overrides
  };

  return { context, calls };
}

describe("executeTaskPlan", () => {
  beforeEach(() => {
    // no global state to reset, but keep hook for clarity
  });

  it("executes subtasks in linear order", async () => {
    const setup = createSubtask("setup");
    const feature = createSubtask("feature", { dependencies: ["setup"] });
    const tests = createSubtask("tests", { dependencies: ["feature"] });
    const plan = createPlan([setup, feature, tests]);
    const scenario: ExecutorScenario = {
      setup: makeResult(setup, "completed"),
      feature: makeResult(feature, "completed"),
      tests: makeResult(tests, "completed")
    };
    const { context, calls } = createContext(scenario);

    const result = await executeTaskPlan(plan, context);

    expect(calls).toEqual(["setup", "feature", "tests"]);
    expect(result.status).toBe("completed");
  });

  it("respects dependency ordering", async () => {
    const setup = createSubtask("setup");
    const backend = createSubtask("backend", { dependencies: ["setup"] });
    const frontend = createSubtask("frontend", { dependencies: ["setup"] });
    const plan = createPlan([setup, backend, frontend]);
    const scenario: ExecutorScenario = {
      setup: makeResult(setup, "completed"),
      backend: makeResult(backend, "completed"),
      frontend: makeResult(frontend, "completed")
    };
    const { context, calls } = createContext(scenario);

    await executeTaskPlan(plan, context);

    expect(calls[0]).toBe("setup");
    expect(new Set(calls.slice(1))).toEqual(new Set(["backend", "frontend"]));
  });

  it("continues when failure is non-critical", async () => {
    const setup = createSubtask("setup");
    const auth = createSubtask("auth", { dependencies: ["setup"] });
    const docs = createSubtask("docs");
    const plan = createPlan([setup, auth, docs]);
    const scenario: ExecutorScenario = {
      setup: makeResult(setup, "completed"),
      auth: makeResult(auth, "failed", "tests failing"),
      docs: makeResult(docs, "completed")
    };
    const { context } = createContext(scenario, {
      shouldContinueOnFailure: () => true
    });

    const result = await executeTaskPlan(plan, context);

    expect(result.status).toBe("partial");
    expect(result.failedSubtasks).toContain("auth");
    expect(result.completedSubtasks).toContain("docs");
  });

  it("returns completed when all succeed", async () => {
    const tasks = ["setup", "api", "tests"].map(id => createSubtask(id));
    const plan = createPlan(tasks);
    const scenario: ExecutorScenario = Object.fromEntries(
      tasks.map(task => [task.id, makeResult(task, "completed")])
    );
    const { context } = createContext(scenario);

    const result = await executeTaskPlan(plan, context);

    expect(result.status).toBe("completed");
    expect(result.completedSubtasks).toHaveLength(tasks.length);
  });

  it("marks result as partial when some fail", async () => {
    const setup = createSubtask("setup");
    const feature = createSubtask("feature", { dependencies: ["setup"] });
    const docs = createSubtask("docs");
    const plan = createPlan([setup, feature, docs]);
    const scenario: ExecutorScenario = {
      setup: makeResult(setup, "completed"),
      feature: makeResult(feature, "failed"),
      docs: makeResult(docs, "completed")
    };
    const { context } = createContext(scenario, {
      shouldContinueOnFailure: () => true
    });

    const result = await executeTaskPlan(plan, context);

    expect(result.status).toBe("partial");
    expect(result.failedSubtasks).toEqual(["feature"]);
  });

  it("halts on critical failure", async () => {
    const setup = createSubtask("setup");
    const auth = createSubtask("auth", { dependencies: ["setup"], estimatedComplexity: "high" });
    const ui = createSubtask("ui", { dependencies: ["auth"] });
    const plan = createPlan([setup, auth, ui]);
    const scenario: ExecutorScenario = {
      setup: makeResult(setup, "completed"),
      auth: makeResult(auth, "failed", "critical issue"),
      ui: makeResult(ui, "completed")
    };
    const { context } = createContext(scenario, {
      shouldContinueOnFailure: undefined,
      isCriticalSubtask: subtask => subtask.id === "auth"
    });

    const result = await executeTaskPlan(plan, context);

    expect(result.status).toBe("failed");
    expect(result.completedSubtasks).toEqual(["setup"]);
  });

  it("tracks progress updates", async () => {
    const setup = createSubtask("setup");
    const build = createSubtask("build", { dependencies: ["setup"] });
    const plan = createPlan([setup, build]);
    const scenario: ExecutorScenario = {
      setup: makeResult(setup, "completed"),
      build: makeResult(build, "completed")
    };
    const snapshots: PlanExecutionResult["progress"][] = [];
    const { context } = createContext(scenario, {
      onProgressUpdate: snapshot => {
        snapshots.push({ ...snapshot });
      }
    });

    await executeTaskPlan(plan, context);

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].completedSubtasks).toBe(1);
    expect(Math.round(snapshots.at(-1)?.percentComplete ?? 0)).toBe(100);
  });

  it("returns structured execution data", async () => {
    const plan = createPlan([createSubtask("setup")]);
    const scenario: ExecutorScenario = {
      setup: makeResult(plan.subtasks[0]!, "completed")
    };
    const { context } = createContext(scenario);

    const result = await executeTaskPlan(plan, context);

    expect(result.subtaskResults).toHaveLength(1);
    expect(Array.isArray(result.failedSubtasks)).toBe(true);
    expect(Array.isArray(result.completedSubtasks)).toBe(true);
    expect(result.totalDurationMs).toBeGreaterThan(0);
  });
});
