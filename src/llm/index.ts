import { chooseProvider } from "./providers/choose.js";
import { logEvent } from "../telemetry/events.js";
import { getTraceContext } from "./trace.js";
import { writeFixture } from "../fixtures/index.js";
import { DEFAULT_FS_TOOLS } from "./tools/fsTools.js";
import type {
  GenerateJSONOptions,
  LLMMessage,
  LLMRequestMessage,
  LLMToolCall,
  ProviderGenerateResult,
  ToolDefinition,
  ToolExecutionContext
} from "./types.js";

export type { LLMMessage } from "./types.js";

function normalizeToolContext(options: GenerateJSONOptions, traceContext?: ReturnType<typeof getTraceContext>) {
  const projectSlug = options.toolContext?.projectSlug ?? traceContext?.projectSlug;
  const sessionId = options.toolContext?.sessionId ?? options.sessionId ?? traceContext?.sessionId;
  return { projectSlug, sessionId } satisfies ToolExecutionContext;
}

function resolveTools(
  options: GenerateJSONOptions,
  traceContext?: ReturnType<typeof getTraceContext>
): ToolDefinition[] {
  if (options.tools && options.tools.length > 0) {
    return options.tools;
  }
  const projectSlug = options.toolContext?.projectSlug ?? traceContext?.projectSlug;
  if (projectSlug) {
    return DEFAULT_FS_TOOLS;
  }
  return [];
}

function toProviderMessages(messages: LLMMessage[]): LLMRequestMessage[] {
  return messages.map(message => ({ role: message.role, content: message.content }));
}

function mapToolSchemas(tools: ToolDefinition[]): ToolDefinition[] {
  return tools;
}

async function executeToolCall(
  tool: ToolDefinition,
  call: LLMToolCall,
  context: ToolExecutionContext
): Promise<{ result: unknown; parsedArgs: unknown }> {
  let parsedArgs: unknown = {};
  if (call.arguments) {
    try {
      parsedArgs = JSON.parse(call.arguments);
    } catch (error) {
      throw new Error(`Tool ${tool.name} arguments must be JSON: ${(error as Error).message}`);
    }
  }
  const result = await tool.execute(parsedArgs, context);
  return { result, parsedArgs };
}

export async function generateJSON(messages: LLMMessage[], options: GenerateJSONOptions = {}): Promise<string> {
  const provider = chooseProvider();
  const maxRetries = Number(process.env.LLM_MAX_RETRIES ?? 3);
  const initialBackoff = Number(process.env.LLM_INITIAL_BACKOFF_MS ?? 1000);
  const maxBackoff = Number(process.env.LLM_MAX_BACKOFF_MS ?? 10000);
  const callTimeout = Number(process.env.LLM_CALL_TIMEOUT_MS ?? 60000);
  const maxToolIterations = options.maxToolIterations ?? 4;

  let attempt = 0;
  for (;;) {
    const traceContext = getTraceContext();
    const tools = resolveTools(options, traceContext);
    const toolContext = normalizeToolContext(options, traceContext);
    const providerTools = tools.length
      ? mapToolSchemas(tools).map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }))
      : undefined;

    const executedTools: Array<{ name: string; arguments: unknown; result: unknown; callId: string }> = [];
    const conversation = toProviderMessages(messages);

    const runProviderCall = async (inputMessages: LLMRequestMessage[]): Promise<ProviderGenerateResult> =>
      Promise.race([
        provider.generate(inputMessages, { tools: providerTools, signal: options.signal }),
        new Promise<ProviderGenerateResult>((_, rej) =>
          setTimeout(() => rej(new Error(`LLM call timed out after ${callTimeout}ms`)), callTimeout)
        )
      ]);

    try {
      let response: ProviderGenerateResult | null = null;
      for (let depth = 0; depth <= maxToolIterations; depth += 1) {
        response = await runProviderCall(conversation);
        if (response.toolCalls && response.toolCalls.length > 0 && tools.length > 0) {
          const toolMessage: LLMRequestMessage = {
            role: "assistant",
            content: response.content,
            toolCalls: response.toolCalls
          };
          conversation.push(toolMessage);
          for (const call of response.toolCalls) {
            const tool = tools.find(candidate => candidate.name === call.name);
            if (!tool) {
              throw new Error(`Unknown tool requested: ${call.name}`);
            }
            const { result, parsedArgs } = await executeToolCall(tool, call, toolContext);
            executedTools.push({ name: tool.name, arguments: parsedArgs, result, callId: call.id });
            conversation.push({
              role: "tool",
              name: tool.name,
              toolCallId: call.id,
              content: JSON.stringify(result)
            });
          }
          continue;
        }
        break;
      }

      if (!response) {
        throw new Error("LLM did not return a response");
      }

      const content = response.content;
      if (content === null || content === undefined) {
        throw new Error("LLM returned empty content");
      }

      try {
        if (traceContext?.sessionId && traceContext.projectSlug) {
          const ts = new Date().toISOString().replace(/[:.]/g, "-");
          const nameParts = [ts, traceContext.phase || "llm", traceContext.subtaskId || ""].filter(Boolean).join("_");
          const relPath = ["llm", `${nameParts}.json`].join("/");
          const payload = {
            provider: (process.env.LLM_PROVIDER || "openai").toLowerCase(),
            model: process.env.LLM_MODEL || null,
            attempt: attempt + 1,
            messages,
            response: content,
            tools: executedTools.length ? executedTools : undefined
          };
          await writeFixture(traceContext.projectSlug, traceContext.sessionId, relPath, payload);
        }
      } catch {
        // best-effort only
      }

      return content;
    } catch (err: unknown) {
      const e = err as { status?: number; code?: string; message?: string };
      const status = e?.status ?? 0;
      const code = e?.code ?? "";
      const message = e?.message ?? String(err);

      const isTimeout = message.includes("LLM call timed out");

      if (!isTimeout && (status === 400 || status === 401 || status === 403)) {
        throw err;
      }

      const retryable =
        isTimeout ||
        status === 429 ||
        status >= 500 ||
        code === "ECONNRESET" ||
        code === "ETIMEDOUT" ||
        code === "ENOTFOUND" ||
        code === "ECONNABORTED";
      if (!retryable || attempt >= maxRetries) {
        throw err;
      }

      const base = Math.min(initialBackoff * Math.pow(2, attempt), maxBackoff);
      const jitter = 0.8 + Math.random() * 0.4; // 20% jitter
      const backoff = Math.floor(base * jitter);
      await logEvent("llm_retry", { attempt: attempt + 1, maxRetries, backoffMs: backoff, status, code, message, isTimeout });
      await new Promise(res => setTimeout(res, backoff));
      attempt += 1;
    }
  }
}
