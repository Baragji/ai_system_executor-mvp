import { generateJSON } from "../llm/index.js";
import type { ClarificationResponse } from "../clarification/types.js";
import { validateTaskPlan } from "../contracts/taskPlanValidator.js";
import type { TaskPlan, Subtask, DecompositionIssue } from "./types.js";
import { TaskPlanValidationError } from "./types.js";

class ClarificationRequiredError extends Error {
  public readonly code = "clarification_required";

  constructor(message: string) {
    super(message);
    this.name = "ClarificationRequiredError";
  }
}

function needsClarification(prompt: string, clarifications?: ClarificationResponse): boolean {
  if (clarifications && clarifications.answers?.length > 0) {
    return false;
  }

  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return true;
  }

  const words = trimmed.split(/\s+/);
  if (words.length < 4) {
    const containsSpecificDetail = words.some(word => word.length >= 6 || word.includes("-"));
    if (!containsSpecificDetail) {
      return true;
    }
  }

  const genericPhrases = ["build an app", "make an app", "create an app"];
  const lowerPrompt = trimmed.toLowerCase();
  if (genericPhrases.some(phrase => lowerPrompt.includes(phrase))) {
    const hasDetail = /with |for |using |including |featuring /.test(lowerPrompt);
    if (!hasDetail) {
      return true;
    }
  }

  return false;
}

function buildPrompt(
  userPrompt: string,
  clarifications?: ClarificationResponse,
  previousIssues?: DecompositionIssue[]
): string {
  const clarificationText = clarifications
    ? clarifications.answers
        ?.map(answer => `- ${answer.questionId}: ${answer.value}`)
        .join("\n") ?? "None"
    : "None";

  const issuesFeedback = previousIssues
    ?.map(issue => `- ${issue.code}: ${issue.message}`)
    .join("\n") ?? "None";

  return `You are a senior project planner producing structured task plans.\n\n` +
    `Follow this JSON schema:\n` +
    `TaskPlan { originalPrompt: string; subtasks: Subtask[]; totalSubtasks: number; decompositionStrategy?: string }\n` +
    `Subtask { id: string (kebab-case), title: string, description: string (>=10 chars), status: one of pending|in_progress|completed|failed, ` +
    `dependencies: string[], estimatedComplexity: low|medium|high, successCriteria: string }\n` +
    `Constraints: 2-10 subtasks, actionable descriptions, include logical dependencies, avoid circular references, IDs unique.\n` +
    `Original prompt: ${userPrompt}\n` +
    `Clarifications:\n${clarificationText}\n` +
    `Previous validation issues:\n${issuesFeedback}\n` +
    `Respond ONLY with JSON matching the schema.`;
}

function normalizeSubtask(candidate: unknown): Subtask {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Invalid subtask payload received from LLM");
  }

  const record = candidate as Record<string, unknown>;

  const dependencies = Array.isArray(record.dependencies)
    ? record.dependencies.map(String)
    : [];

  const subtask: Subtask = {
    id: String(record.id ?? ""),
    title: String(record.title ?? ""),
    description: String(record.description ?? ""),
    status: (record.status ?? "pending") as Subtask["status"],
    dependencies,
    estimatedComplexity:
      typeof record.estimatedComplexity === "string"
        ? (record.estimatedComplexity as Subtask["estimatedComplexity"])
        : undefined,
    successCriteria:
      typeof record.successCriteria === "string" ? record.successCriteria : undefined
  };

  if (!subtask.successCriteria) {
    delete subtask.successCriteria;
  }

  if (!subtask.estimatedComplexity) {
    delete subtask.estimatedComplexity;
  }

  if (dependencies.length === 0) {
    delete subtask.dependencies;
  }

  return subtask;
}

function parsePlan(raw: string, fallbackPrompt: string): TaskPlan {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`LLM returned invalid JSON: ${(error as Error).message}`);
  }

  const record = parsed as Record<string, unknown>;

  const subtasks = Array.isArray(record.subtasks)
    ? record.subtasks.map(normalizeSubtask)
    : [];

  const plan: TaskPlan = {
    originalPrompt: String(record.originalPrompt ?? fallbackPrompt),
    subtasks,
    totalSubtasks: Number.isInteger(record.totalSubtasks)
      ? (record.totalSubtasks as number)
      : subtasks.length,
    decompositionStrategy:
      typeof record.decompositionStrategy === "string"
        ? (record.decompositionStrategy as string)
        : "llm-decomposition"
  };

  if (!plan.decompositionStrategy) {
    delete plan.decompositionStrategy;
  }

  return plan;
}

async function requestPlan(
  prompt: string,
  clarifications?: ClarificationResponse,
  previousIssues?: DecompositionIssue[]
): Promise<string> {
  const systemPrompt = buildPrompt(prompt, clarifications, previousIssues);
  return generateJSON([
    { role: "system", content: "You output JSON for task plans." },
    { role: "user", content: systemPrompt }
  ]);
}

export async function decomposeTask(
  prompt: string,
  clarifications?: ClarificationResponse
): Promise<TaskPlan> {
  if (needsClarification(prompt, clarifications)) {
    throw new ClarificationRequiredError(
      "Prompt is ambiguous. Collect clarifications before decomposing."
    );
  }

  let previousIssues: DecompositionIssue[] | undefined;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await requestPlan(prompt, clarifications, previousIssues);
      const normalizedPlan = parsePlan(response, prompt);
      const validation = validateTaskPlan(normalizedPlan);

      if (validation.ok) {
        return validation.value;
      }

      previousIssues = validation.issues;
      lastError = new TaskPlanValidationError(
        validation.errors,
        validation.issues ?? []
      );
    } catch (error) {
      if (error instanceof TaskPlanValidationError) {
        lastError = error;
      } else {
        lastError = error as Error;
      }
    }
  }

  if (lastError instanceof TaskPlanValidationError) {
    throw lastError;
  }

  throw lastError ?? new Error("Failed to decompose task");
}

export type { ClarificationRequiredError };
