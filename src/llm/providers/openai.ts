import OpenAI from "openai";
import type {
  LLMRequestMessage,
  ProviderGenerateOptions,
  ProviderGenerateResult
} from "../types.js";
import { logEvent } from "../../telemetry/events.js";

type MessageContent = OpenAI.ChatCompletionMessage["content"];

type ToolCall = OpenAI.ChatCompletionMessageToolCall;

type AssistantMessage = OpenAI.ChatCompletionAssistantMessageParam;

type ToolMessage = OpenAI.ChatCompletionToolMessageParam;

type SystemMessage = OpenAI.ChatCompletionSystemMessageParam;

type UserMessage = OpenAI.ChatCompletionUserMessageParam;

function toOpenAIMessage(message: LLMRequestMessage): OpenAI.ChatCompletionMessageParam {
  if (message.role === "assistant") {
    const base: AssistantMessage = {
      role: "assistant",
      content: message.content ?? ""
    };
    if (message.toolCalls && message.toolCalls.length > 0) {
      base.tool_calls = message.toolCalls.map(call => ({
        id: call.id,
        type: "function",
        function: {
          name: call.name,
          arguments: call.arguments ?? "{}"
        }
      } satisfies ToolCall));
    }
    return base;
  }
  if (message.role === "tool") {
    return {
      role: "tool",
      content: message.content,
      tool_call_id: message.toolCallId
    } satisfies ToolMessage;
  }
  return {
    role: message.role,
    content: message.content
  } satisfies SystemMessage | UserMessage;
}

function extractTextFromPart(part: unknown): string {
  if (typeof part === "string") {
    return part;
  }
  if (!part || typeof part !== "object") {
    return "";
  }

  const record = part as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : undefined;

  if (type === "reasoning" || type === "tool_call" || type === "tool_result") {
    return "";
  }

  const directText = record.text;
  if (typeof directText === "string") {
    return directText;
  }
  if (directText && typeof directText === "object" && "value" in (directText as Record<string, unknown>)) {
    const value = (directText as Record<string, unknown>).value;
    if (typeof value === "string") {
      return value;
    }
  }

  if (typeof record.value === "string") {
    return record.value;
  }

  if (typeof record.content === "string") {
    return record.content;
  }

  if (Array.isArray(record.content)) {
    return (record.content as unknown[]).map(extractTextFromPart).join("");
  }

  return "";
}

function normalizeContent(content: MessageContent): string | null {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const combined = (content as unknown[]).map(extractTextFromPart).join("");
    return combined.length > 0 ? combined : "";
  }
  if (content && typeof content === "object") {
    return extractTextFromPart(content);
  }
  return null;
}

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    // Use default fetch provided by the runtime; the curl-backed shim can
    // cause incomplete bodies in some environments.
    this.client = new OpenAI({ apiKey: key });
    // Default to GPT-5 family unless explicitly overridden
    this.model = process.env.LLM_MODEL || "gpt-5";
  }

  async generate(messages: LLMRequestMessage[], options: ProviderGenerateOptions = {}): Promise<ProviderGenerateResult> {
    const isReasoningModel = this.model.startsWith("o1") || this.model.startsWith("gpt-5");

    const requestMessages = messages.map(toOpenAIMessage);

    const requestParams: OpenAI.ChatCompletionCreateParams = {
      model: this.model,
      messages: requestMessages
    };

    if (options.tools && options.tools.length > 0) {
      requestParams.tools = options.tools.map(tool => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      requestParams.tool_choice = "auto";
    } else {
      requestParams.response_format = { type: "json_object" };
    }

    if (!isReasoningModel) {
      requestParams.temperature = 0.2;
    }

    const resp = await this.client.chat.completions.create(requestParams, {
      signal: options.signal
    });

    // Optional: emit response metadata for diagnostics (behind flag)

    // Emit metadata to aid diagnosis of shape variants across models/SDKs
    if (process.env.LLM_PROVIDER_DEBUG) {
      try {
        await logEvent("llm_provider_debug_response_meta", {
          provider: "openai",
          model: this.model,
          type: typeof resp,
          keys: resp && typeof resp === 'object' ? Object.keys(resp as unknown as Record<string, unknown>) : null,
          hasChoices: resp && typeof resp === 'object' && Array.isArray((resp as unknown as { choices?: unknown[] }).choices),
          id: (resp as unknown as { id?: string }).id ?? null,
          modelField: (resp as unknown as { model?: string }).model ?? null
        });
      } catch {
        // best-effort only
      }
    }

    let message = resp.choices?.[0]?.message;
    // Fallback: some newer models may not populate `message` reliably on chat.completions
    // Try the Responses API as a secondary path to recover a usable output.
    if (!message) {
      await logEvent("llm_provider_empty_message", {
        provider: "openai",
        model: this.model,
        reason: "missing_message",
        finish_reason: resp.choices?.[0]?.finish_reason ?? null
      });
      try {
        // Attach request context for diagnostics (roles + content only)
        await logEvent("llm_provider_request_context", {
          provider: "openai",
          model: this.model,
          messages: requestMessages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          })),
          tools: requestParams.tools ? (requestParams.tools as Array<{ function?: { name?: string } }>).map(t => (t?.function?.name ?? 'unknown')) : []
        });
        const joined = requestMessages
          .map(m => `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
          .join("\n\n");
        // Broad compatibility across SDK versions: access Responses API via a narrowed shape
        type ResponsesAPI = {
          responses: {
            create: (args: { model: string; input: string }, opts?: { signal?: AbortSignal }) => Promise<unknown>;
          };
        };
        const resp2: unknown = await (this.client as unknown as ResponsesAPI).responses.create(
          { model: this.model, input: joined },
          { signal: options.signal }
        );
        // Prefer `output_text` if present; otherwise dig into first content block
        const fallbackText: string | undefined = (() => {
          if (typeof resp2 === 'string') return resp2;
          if (resp2 && typeof resp2 === 'object') {
            const r2 = resp2 as Record<string, unknown>;
            if (typeof r2.output_text === 'string') return r2.output_text as string;
            const out = r2.output as unknown;
            if (Array.isArray(out) && out.length > 0) {
              const first = out[0] as { content?: unknown } | undefined;
              const content = first?.content as unknown;
              if (Array.isArray(content)) {
                return content.map((p: unknown) => {
                  if (p && typeof p === 'object') {
                    const text = (p as Record<string, unknown>).text as unknown;
                    if (typeof text === 'string') return text;
                    if (text && typeof text === 'object' && typeof (text as Record<string, unknown>).value === 'string') {
                      return (text as Record<string, unknown>).value as string;
                    }
                  }
                  return '';
                }).join('');
              }
            }
          }
          return undefined;
        })();
        if (typeof fallbackText === 'string' && fallbackText.length > 0) {
          await logEvent("llm_provider_empty_message_recovered", {
            provider: "openai",
            model: this.model,
            path: "responses_api"
          });
          return { content: fallbackText, toolCalls: undefined };
        }
      } catch (fallbackErr) {
        await logEvent("llm_provider_empty_message_fallback_failed", {
          provider: "openai",
          model: this.model,
          reason: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        });
      }
      const err = new Error("OpenAI returned empty message");
      (err as { code?: string }).code = "EMPTY_MESSAGE";
      throw err;
    }

    const toolCalls = message.tool_calls?.map(call => ({
      id: call.id,
      name: call.function.name,
      arguments: call.function.arguments ?? "{}"
    })) ?? undefined;

    let content = normalizeContent(message.content);

    const outputText = (message && typeof message === 'object' ? (message as unknown as Record<string, unknown>).output_text : undefined);
    if ((content === null || content === "") && outputText) {
      if (typeof outputText === "string") {
        content = outputText;
      } else if (Array.isArray(outputText)) {
        content = outputText.map(extractTextFromPart).join("");
      }
    }

    if ((content === null || content === "") && (!toolCalls || toolCalls.length === 0)) {
      await logEvent("llm_provider_empty_message", {
        provider: "openai",
        model: this.model,
        reason: "empty_content",
        finish_reason: resp.choices?.[0]?.finish_reason ?? null
      });
      const err = new Error("OpenAI returned empty message");
      (err as { code?: string }).code = "EMPTY_MESSAGE";
      throw err;
    }

    if (typeof content === "string" && options.onToken) {
      options.onToken(content);
    }

    return { content, toolCalls };
  }
}
