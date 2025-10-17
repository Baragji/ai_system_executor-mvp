import { generateJSON } from "../llm/index.js";
import { withTraceContext, getTraceContext } from "../llm/trace.js";
import { sanitizeExecutorOutput } from "../executor/outputProcessing.js";
import { validateExecutorOutput } from "../contracts/validators.js";
import type { ExecutorOutput } from "../executor/types.js";
import type { SubtaskPromptRequest } from "./types.js";
import { throwIfAborted } from "../orchestrator/abortSignal.js";

const DEFAULT_MAX_ATTEMPTS = 2;

function buildRetryMessage(reason: string): string {
  return [
    "Previous response failed validation.",
    `Reason: ${reason}.`,
    "Respond ONLY with valid JSON that matches the executor-output schema and includes all required fields."
  ].join(" ");
}

export async function generateSubtaskOutputWithRetry(
  systemPrompt: string,
  request: SubtaskPromptRequest,
  enforceTests: boolean,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  onRetry?: (attempt: number, reason: string) => void | Promise<void>
): Promise<ExecutorOutput> {
  const baseMessages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: request.prompt }
  ];

  let lastError = "";

  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    const messages = [...baseMessages];
    if (attempt > 1 && lastError) {
      messages.splice(1, 0, { role: "system" as const, content: buildRetryMessage(lastError) });
    }

    const raw = await withTraceContext({ phase: "subtask" }, async () => {
      const trace = getTraceContext();
      const sessionId = trace?.sessionId;
      return generateJSON(messages, { sessionId });
    });

    // Check if execution was paused immediately after LLM call completes
    // This catches pause requests that occurred during the LLM call
    const ctx = getTraceContext();
    if (ctx?.sessionId) {
      throwIfAborted(ctx.sessionId, "post_subtask_llm");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      lastError = `invalid JSON: ${reason}`;
      if (attempt === maxAttempts) break;
      await onRetry?.(attempt, lastError);
      continue;
    }

    const sanitized = sanitizeExecutorOutput(parsed);
    const validation = validateExecutorOutput(sanitized);
    if (!validation.ok) {
      lastError = `schema validation failed: ${validation.errors}`;
      if (attempt === maxAttempts) break;
      await onRetry?.(attempt, lastError);
      continue;
    }

    const output = validation.value;
    if (enforceTests && !output.hasTests) {
      throw new Error("Generated subtask output must include tests when enforceTests=true");
    }

    return output;
  }

  const errorMessage = lastError ? ` ${lastError}` : "";
  throw new Error(`Failed to generate valid subtask output after ${maxAttempts} attempts.${errorMessage}`.trim());
}
