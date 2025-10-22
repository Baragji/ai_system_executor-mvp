import { generateJSON } from "../llm/index.js";
import type { LLMMessage } from "../llm/index.js";
import type { ClarificationResponse } from "../clarification/types.js";
import { validateTaskPlan } from "../contracts/taskPlanValidator.js";
import type { TaskPlan, Subtask, DecompositionIssue } from "./types.js";
import { TaskPlanValidationError } from "./types.js";
import { logEvent } from "../telemetry/events.js";
import { getTraceContext } from "../llm/trace.js";
import { throwIfAborted } from "../orchestrator/abortSignal.js";

class ClarificationRequiredError extends Error {
  public readonly code = "clarification_required";

  constructor(message: string) {
    super(message);
    this.name = "ClarificationRequiredError";
  }
}

class SimplePromptBypassError extends Error {
  public readonly code = "simple_prompt_bypass";

  constructor(message: string) {
    super(message);
    this.name = "SimplePromptBypassError";
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

const SIMPLE_PROMPT_MAX_WORDS = 50;
const BULLET_PATTERN = /(^|\n)\s*(?:[-*]\s+|\d+\.\s+)/;
const COMPLEXITY_KEYWORDS = [
  /(auth|authentication|login|signup|oauth)/i,
  /(database|postgres|mysql|sqlite|mongodb|prisma)/i,
  /(payment|checkout|stripe|paypal)/i,
  /(api\b|graphql|rest|endpoint)/i,
  /(websocket|socket|realtime|streaming)/i,
  /(microservice|micro-services|service-oriented)/i,
  /(worker|queue|job|cron|scheduler)/i,
  /(deploy|deployment|docker|kubernetes|container)/i,
  /(multi-tenant|multiplayer|multi-player)/i,
  /(analytics|dashboard|reporting)/i
];

function hasComplexitySignals(text: string): boolean {
  return COMPLEXITY_KEYWORDS.some(pattern => pattern.test(text));
}

function isSimplePrompt(prompt: string, clarifications?: ClarificationResponse): boolean {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const answersText = clarifications?.answers
    ?.map(answer => `${answer.questionId}: ${String(answer.value ?? "")}`)
    .join(" ") ?? "";

  const combined = `${trimmed} ${answersText}`.trim();
  const wordCount = combined.length === 0 ? 0 : combined.split(/\s+/).filter(Boolean).length;

  if (wordCount === 0) {
    return false;
  }

  if (wordCount > SIMPLE_PROMPT_MAX_WORDS) {
    return false;
  }

  if (BULLET_PATTERN.test(prompt)) {
    return false;
  }

  if (hasComplexitySignals(combined)) {
    return false;
  }

  return true;
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
  const trace = getTraceContext();
  const sessionId = trace?.sessionId;
  const messages: LLMMessage[] = [
    { role: "system", content: "You output JSON for task plans." },
    { role: "user", content: systemPrompt }
  ];

  if (sessionId) {
    return generateJSON(messages, { sessionId });
  }

  return generateJSON(messages);
}

function ms(n: number, fallback: number): number {
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const DECOMPOSE_TIMEOUT_MS = ms(Number(process.env.DECOMPOSE_TIMEOUT_MS ?? 60000), 60000);
const DECOMPOSE_MAX_ATTEMPTS = ms(Number(process.env.DECOMPOSE_MAX_ATTEMPTS ?? 2), 2);
const DECOMPOSE_BACKOFF_BASE_MS = ms(Number(process.env.DECOMPOSE_BACKOFF_BASE_MS ?? 800), 800);
const DECOMPOSE_BACKOFF_MAX_MS = ms(Number(process.env.DECOMPOSE_BACKOFF_MAX_MS ?? 4000), 4000);

async function raceWithAbort<T>(work: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      const err: Error & { code?: string } = new Error(`${label} aborted after ${timeoutMs}ms`);
      err.code = "ABORT_ERR";
      reject(err);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    work().then(
      v => { signal.removeEventListener("abort", onAbort); resolve(v); },
      e => { signal.removeEventListener("abort", onAbort); reject(e); }
    );
  });
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

  if (isSimplePrompt(prompt, clarifications)) {
    throw new SimplePromptBypassError(
      "Prompt is simple enough for direct execution without decomposition."
    );
  }

  let previousIssues: DecompositionIssue[] | undefined;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < DECOMPOSE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await raceWithAbort(
        () => requestPlan(prompt, clarifications, previousIssues),
        DECOMPOSE_TIMEOUT_MS,
        "decomposeTask"
      ).catch(async (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if ((err as { code?: string }).code === "ABORT_ERR") {
          await logEvent("plan_abort", { phase: "decompose", reason: message });
        }
        throw err;
      });
      
      // Check if execution was paused immediately after LLM call completes
      // This catches pause requests that occurred during the LLM call
      const ctx = getTraceContext();
      if (ctx?.sessionId) {
        throwIfAborted(ctx.sessionId, "post_decompose_llm");
      }
      
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
    if (attempt + 1 < DECOMPOSE_MAX_ATTEMPTS) {
      const base = Math.min(DECOMPOSE_BACKOFF_BASE_MS * Math.pow(2, attempt), DECOMPOSE_BACKOFF_MAX_MS);
      const jitter = 0.8 + Math.random() * 0.4; // 20% jitter
      const backoff = Math.floor(base * jitter);
      await logEvent("plan_retry", { phase: "decompose", attempt: attempt + 1, backoffMs: backoff });
      await new Promise(res => setTimeout(res, backoff));
    }
  }

  if (lastError instanceof TaskPlanValidationError) {
    throw lastError;
  }

  throw lastError ?? new Error("Failed to decompose task");
}

export { ClarificationRequiredError, SimplePromptBypassError };
