import { validateTaskPlan } from "../contracts/taskPlanValidator.js";
import type { TaskPlan, DecompositionQuality, DecompositionIssue } from "./types.js";

const STOP_WORDS = new Set([
  "build",
  "create",
  "make",
  "with",
  "and",
  "the",
  "app",
  "application",
  "site",
  "for",
  "project"
]);

const CRITICAL_KEYWORDS = [
  {
    pattern: /(auth|login|signup|oauth)/i,
    requirement: /(auth|login|signup|oauth|session|password)/i,
    label: "authentication"
  },
  {
    pattern: /(database|db|persist|storage|data)/i,
    requirement: /(database|db|persistence|storage|schema)/i,
    label: "database"
  },
  {
    pattern: /(payment|checkout|stripe|paypal)/i,
    requirement: /(payment|checkout|transaction)/i,
    label: "payment"
  }
];

const ALWAYS_REQUIRED = [
  {
    requirement: /(test|qa|verify|validation)/i,
    label: "testing"
  }
];

function tokenize(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(token => !STOP_WORDS.has(token))
  );
}

function detectCycles(plan: TaskPlan): string[][] {
  const graph = new Map<string, string[]>();
  plan.subtasks.forEach(subtask => {
    graph.set(subtask.id, [...(subtask.dependencies ?? [])]);
  });

  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (stack.has(node)) {
      const startIndex = path.indexOf(node);
      const cycle = path.slice(startIndex);
      cycle.push(node);
      cycles.push(cycle);
      return;
    }
    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    stack.add(node);
    (graph.get(node) ?? []).forEach(dep => dfs(dep, [...path, node]));
    stack.delete(node);
  }

  plan.subtasks.forEach(subtask => {
    if (!visited.has(subtask.id)) {
      dfs(subtask.id, []);
    }
  });

  return cycles;
}

function addIssue(
  issues: DecompositionIssue[],
  code: string,
  message: string,
  severity: DecompositionIssue["severity"],
  context?: Record<string, unknown>
): void {
  issues.push({ code, message, severity, context });
}

function checkStructuralRules(plan: TaskPlan, issues: DecompositionIssue[]): void {
  const count = plan.subtasks.length;
  if (count < 2 || count > 10) {
    addIssue(
      issues,
      "subtask-count",
      `Subtask count ${count} is outside expected range (2-10)`,
      "issue"
    );
  }

  plan.subtasks.forEach((subtask, index) => {
    const descriptionWordCount = subtask.description.trim().split(/\s+/).length;
    if (descriptionWordCount < 8) {
      addIssue(
        issues,
        "description-too-vague",
        `Subtask '${subtask.id}' description is too short (${descriptionWordCount} words)`,
        "issue",
        { index }
      );
    } else if (descriptionWordCount > 80) {
      addIssue(
        issues,
        "description-too-detailed",
        `Subtask '${subtask.id}' description may be overly detailed (${descriptionWordCount} words)`,
        "issue",
        { index }
      );
    }
  });

  const cycles = detectCycles(plan);
  cycles.forEach(cycle => {
    addIssue(
      issues,
      "circular-dependency",
      `Circular dependency detected: ${cycle.join(" -> ")}`,
      "issue",
      { cycle }
    );
  });
}

function checkCoverage(plan: TaskPlan, prompt: string, issues: DecompositionIssue[]): void {
  const promptTokens = tokenize(prompt);
  const coverageTokens = new Set<string>();
  plan.subtasks.forEach(subtask => {
    tokenize(`${subtask.title} ${subtask.description} ${subtask.successCriteria ?? ""}`).forEach(
      token => coverageTokens.add(token)
    );
  });

  const missingTokens = [...promptTokens].filter(token => !coverageTokens.has(token));
  if (missingTokens.length > 0) {
    addIssue(
      issues,
      "coverage-gaps",
      `Potential coverage gaps for keywords: ${missingTokens.slice(0, 5).join(", ")}`,
      "warning",
      { missingTokens }
    );
  }

  CRITICAL_KEYWORDS.forEach(({ pattern, requirement, label }) => {
    if (pattern.test(prompt) && !plan.subtasks.some(subtask => requirement.test(subtask.description + subtask.title))) {
      addIssue(
        issues,
        "missing-critical-step",
        `Prompt references ${label} but plan lacks explicit coverage`,
        "issue",
        { label }
      );
    }
  });

  ALWAYS_REQUIRED.forEach(({ requirement, label }) => {
    if (!plan.subtasks.some(subtask => requirement.test(subtask.title + subtask.description))) {
      addIssue(
        issues,
        "missing-critical-step",
        `Plan must include ${label} tasks`,
        "issue",
        { label }
      );
    }
  });
}

function checkGranularity(plan: TaskPlan, issues: DecompositionIssue[]): void {
  const repetitiveTitles = plan.subtasks.filter(subtask => /setup|install|configure/i.test(subtask.title));
  if (repetitiveTitles.length > 3) {
    addIssue(
      issues,
      "too-many-setup-steps",
      "Plan may be overly granular with repeated setup tasks",
      "warning",
      { count: repetitiveTitles.length }
    );
  }
}

export function validateDecomposition(plan: TaskPlan, originalPrompt: string): DecompositionQuality {
  const validation = validateTaskPlan(plan);
  const findings: DecompositionIssue[] = [];

  if (!validation.ok) {
    if (validation.issues && validation.issues.length > 0) {
      findings.push(...validation.issues);
    } else {
      throw new Error(`Invalid task plan: ${validation.errors}`);
    }
  }

  checkStructuralRules(plan, findings);
  checkCoverage(plan, originalPrompt, findings);
  checkGranularity(plan, findings);

  const issues = findings.filter(issue => issue.severity === "issue");
  const warnings = findings.filter(issue => issue.severity === "warning");

  const score = Math.max(0, 100 - issues.length * 10 - warnings.length * 5);
  const requiresHumanReview = score < 70 || issues.some(issue => issue.code === "missing-critical-step");

  return {
    score,
    issues,
    warnings,
    requiresHumanReview
  };
}
