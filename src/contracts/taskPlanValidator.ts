import { createRequire } from "node:module";

import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import type { Subtask, TaskPlan, DecompositionIssue } from "../planning/types.js";

const requireJson = createRequire(import.meta.url);
const subtaskSchema = requireJson("../../contracts/subtask.schema.json");
const taskPlanSchema = requireJson("../../contracts/task-plan.schema.json");

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string; issues?: DecompositionIssue[] };

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: false,
  strictSchema: false
});
addFormats(ajv);

const subtaskValidator = ajv.compile<Subtask>(subtaskSchema);
const taskPlanValidator = ajv.compile<TaskPlan>(taskPlanSchema);

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return "Invalid task plan";
  }

  return errors
    .map(error => {
      const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : "<root>";
      return `${path} ${error.message ?? "validation error"}`;
    })
    .join("; ");
}

function ensureUniqueSubtaskIds(subtasks: Subtask[], issues: DecompositionIssue[]): void {
  const seen = new Map<string, number>();

  subtasks.forEach((subtask, index) => {
    const count = seen.get(subtask.id) ?? 0;
    if (count > 0) {
      issues.push({
        code: "duplicate-id",
        message: `Subtask id '${subtask.id}' is duplicated`,
        severity: "issue",
        context: { index }
      });
    }
    seen.set(subtask.id, count + 1);
  });
}

function ensureDependencyIntegrity(subtasks: Subtask[], issues: DecompositionIssue[]): void {
  const ids = new Set(subtasks.map(subtask => subtask.id));

  subtasks.forEach((subtask, index) => {
    const dependencies = subtask.dependencies ?? [];
    dependencies.forEach((dependencyId, depIndex) => {
      if (!ids.has(dependencyId)) {
        issues.push({
          code: "missing-dependency",
          message: `Subtask '${subtask.id}' depends on unknown subtask '${dependencyId}'`,
          severity: "issue",
          context: { index, depIndex }
        });
      }
      if (dependencyId === subtask.id) {
        issues.push({
          code: "self-dependency",
          message: `Subtask '${subtask.id}' cannot depend on itself`,
          severity: "issue",
          context: { index }
        });
      }
    });
  });
}

function detectCycles(subtasks: Subtask[]): string[][] {
  const graph = new Map<string, string[]>();
  const ids = new Set<string>();

  subtasks.forEach(subtask => {
    ids.add(subtask.id);
    graph.set(subtask.id, [...(subtask.dependencies ?? [])]);
  });

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (!ids.has(node)) return;
    if (stack.has(node)) {
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart);
      cycle.push(node);
      cycles.push(cycle);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    const neighbors = graph.get(node) ?? [];
    neighbors.forEach(neighbor => dfs(neighbor, [...path, node]));
    stack.delete(node);
  }

  ids.forEach(id => {
    if (!visited.has(id)) {
      dfs(id, []);
    }
  });

  return cycles;
}

function applyDomainValidation(plan: TaskPlan): DecompositionIssue[] {
  const issues: DecompositionIssue[] = [];

  if (plan.subtasks.length !== plan.totalSubtasks) {
    issues.push({
      code: "total-mismatch",
      message: `totalSubtasks (${plan.totalSubtasks}) must equal subtasks length (${plan.subtasks.length})`,
      severity: "issue"
    });
  }

  ensureUniqueSubtaskIds(plan.subtasks, issues);
  ensureDependencyIntegrity(plan.subtasks, issues);

  const cycles = detectCycles(plan.subtasks);
  if (cycles.length > 0) {
    cycles.forEach(cycle => {
      issues.push({
        code: "circular-dependency",
        message: `Circular dependency detected: ${cycle.join(" -> ")}`,
        severity: "issue",
        context: { cycle }
      });
    });
  }

  return issues;
}

export function validateSubtask(data: unknown): ValidationResult<Subtask> {
  const ok = subtaskValidator(data);
  if (!ok) {
    return { ok: false, errors: formatErrors(subtaskValidator.errors) };
  }

  return { ok: true, value: data as Subtask };
}

export function validateTaskPlan(data: unknown): ValidationResult<TaskPlan> {
  const ok = taskPlanValidator(data);
  if (!ok) {
    return { ok: false, errors: formatErrors(taskPlanValidator.errors) };
  }

  const plan = data as TaskPlan;
  const domainIssues = applyDomainValidation(plan);
  if (domainIssues.length > 0) {
    return {
      ok: false,
      errors: domainIssues.map(issue => issue.message).join("; "),
      issues: domainIssues
    };
  }

  return { ok: true, value: plan };
}
