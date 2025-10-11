import OpenAI from "openai";
import type {
  LLMRequestMessage,
  ProviderGenerateOptions,
  ProviderGenerateResult
} from "../types.js";

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

function normalizeContent(content: MessageContent): string | null {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return (content as unknown[])
      .map(part => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type === "text") {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }
  return null;
}

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    this.client = new OpenAI({ apiKey: key });
    this.model = process.env.LLM_MODEL || "gpt-4o-mini";
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

    const message = resp.choices?.[0]?.message;
    if (!message) {
      throw new Error("OpenAI returned empty message");
    }

    const toolCalls = message.tool_calls?.map(call => ({
      id: call.id,
      name: call.function.name,
      arguments: call.function.arguments ?? "{}"
    })) ?? undefined;

    const content = normalizeContent(message.content);

    if (typeof content === "string" && options.onToken) {
      options.onToken(content);
    }

    return { content, toolCalls };
  }
}
