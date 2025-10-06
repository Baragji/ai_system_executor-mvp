import type {
  TaskPlan,
  Subtask,
  ExecutionResult,
  ProgressSnapshot
} from "./types.js";

function now(): Date {
  return new Date();
}

function cloneSubtask(subtask: Subtask): Subtask {
  return { ...subtask, dependencies: subtask.dependencies ? [...subtask.dependencies] : undefined };
}

export class ProgressTracker {
  private readonly taskPlan: TaskPlan;

  private currentSubtaskIndex: number;

  private readonly startTime: Date;

  private readonly subtaskResults: Map<string, ExecutionResult>;

  constructor(plan: TaskPlan) {
    this.taskPlan = {
      ...plan,
      subtasks: plan.subtasks.map(subtask => cloneSubtask(subtask))
    };
    this.currentSubtaskIndex = -1;
    this.startTime = now();
    this.subtaskResults = new Map();
  }

  private isSubtaskFinished(id: string): boolean {
    return this.subtaskResults.has(id);
  }

  private isDependencySatisfied(subtask: Subtask): boolean {
    const dependencies = subtask.dependencies ?? [];
    return dependencies.every(depId => {
      const result = this.subtaskResults.get(depId);
      return result?.status === "success";
    });
  }

  private findReadySubtask(): { subtask: Subtask; index: number } | null {
    for (let index = 0; index < this.taskPlan.subtasks.length; index += 1) {
      const subtask = this.taskPlan.subtasks[index];
      if (!subtask) {
        continue;
      }
      if (this.isSubtaskFinished(subtask.id)) {
        continue;
      }
      if (!this.isDependencySatisfied(subtask)) {
        continue;
      }
      return { subtask, index };
    }
    return null;
  }

  private ensureCurrentSubtask(): Subtask | null {
    if (this.currentSubtaskIndex !== -1) {
      const current = this.taskPlan.subtasks[this.currentSubtaskIndex];
      if (current && !this.isSubtaskFinished(current.id)) {
        return current;
      }
    }

    const ready = this.findReadySubtask();
    if (!ready) {
      this.currentSubtaskIndex = -1;
      return null;
    }

    this.currentSubtaskIndex = ready.index;
    const next = this.taskPlan.subtasks[ready.index];
    if (!next) {
      return null;
    }
    next.status = "in_progress";
    return next;
  }

  private peekCurrentSubtask(): Subtask | null {
    if (this.currentSubtaskIndex !== -1) {
      const current = this.taskPlan.subtasks[this.currentSubtaskIndex];
      if (current && !this.isSubtaskFinished(current.id)) {
        return current;
      }
    }

    const ready = this.findReadySubtask();
    return ready ? ready.subtask : null;
  }

  public getCurrentSubtask(): Subtask | null {
    return this.ensureCurrentSubtask();
  }

  public markSubtaskComplete(id: string, result: ExecutionResult): void {
    const subtaskIndex = this.taskPlan.subtasks.findIndex(subtask => subtask.id === id);
    if (subtaskIndex === -1) {
      throw new Error(`Unknown subtask id '${id}'`);
    }
    const subtask = this.taskPlan.subtasks[subtaskIndex];
    if (!subtask) {
      throw new Error(`Subtask '${id}' is missing from plan`);
    }
    if (!this.isDependencySatisfied(subtask)) {
      throw new Error(`Dependencies for '${id}' are not satisfied`);
    }

    this.subtaskResults.set(id, { ...result, status: "success" });
    subtask.status = "completed";

    if (this.currentSubtaskIndex === subtaskIndex) {
      this.currentSubtaskIndex = -1;
    }
  }

  public markSubtaskFailed(id: string, error: Error): void {
    const subtaskIndex = this.taskPlan.subtasks.findIndex(subtask => subtask.id === id);
    if (subtaskIndex === -1) {
      throw new Error(`Unknown subtask id '${id}'`);
    }

    const subtask = this.taskPlan.subtasks[subtaskIndex];
    if (!subtask) {
      throw new Error(`Subtask '${id}' is missing from plan`);
    }

    this.subtaskResults.set(id, {
      status: "failure",
      notes: error.message,
      finishedAt: now()
    });
    subtask.status = "failed";

    if (this.currentSubtaskIndex === subtaskIndex) {
      this.currentSubtaskIndex = -1;
    }
  }

  public getProgress(): ProgressSnapshot {
    const totalSubtasks = this.taskPlan.subtasks.length;
    const completedSubtasks = [...this.subtaskResults.values()].filter(
      result => result.status === "success"
    ).length;
    const failedSubtasks = [...this.subtaskResults.values()].filter(
      result => result.status === "failure"
    ).length;
    const elapsedMs = now().getTime() - this.startTime.getTime();
    const currentSubtask = this.peekCurrentSubtask();
    const percentComplete = totalSubtasks === 0 ? 0 : (completedSubtasks / totalSubtasks) * 100;

    return {
      totalSubtasks,
      completedSubtasks,
      failedSubtasks,
      currentSubtask,
      elapsedMs,
      percentComplete
    };
  }

  public isComplete(): boolean {
    return this.subtaskResults.size >= this.taskPlan.subtasks.length;
  }

  public getNextSubtask(): Subtask | null {
    return this.ensureCurrentSubtask();
  }
}
