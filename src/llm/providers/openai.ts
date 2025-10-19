import type {
  LLMRequestMessage,
  ProviderGenerateOptions,
  ProviderGenerateResult,
  ProviderToolSchema,
} from "../types.js";

interface GatewayRequestBody {
  messages: LLMRequestMessage[];
  tools?: ProviderToolSchema[];
}

// Avoid relying on DOM lib types so ESLint/TS do not require lib.dom
type FetchImpl = (input: string, init?: unknown) => Promise<Response>;

interface StreamParseResult {
  event?: string;
  data?: string;
}

export class OpenAIProvider {
  private readonly baseUrl: string;

  private readonly fetchImpl: FetchImpl;

  constructor(options: { baseUrl?: string; fetchImpl?: FetchImpl } = {}) {
    const configured = options.baseUrl ?? process.env.LLM_GATEWAY_URL ?? "http://localhost:3006";
    this.baseUrl = configured.replace(/\/+$/, "");

    const impl = options.fetchImpl ?? globalThis.fetch;
    if (!impl) {
      throw new Error("fetch is not available in this runtime");
    }
    this.fetchImpl = ((input: string, init?: unknown) => impl(input as string, init as never)) as FetchImpl;
  }

  async generate(messages: LLMRequestMessage[], options: ProviderGenerateOptions = {}): Promise<ProviderGenerateResult> {
    const payload: GatewayRequestBody = {
      messages: this.normalizeMessages(messages),
    };

    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
    }

    if (typeof options.onToken === "function") {
      return this.streamCompletion(payload, options);
    }

    return this.requestCompletion(payload, options.signal);
  }

  private normalizeMessages(messages: LLMRequestMessage[]): LLMRequestMessage[] {
    return messages.map(message => {
      if (message.role === "assistant") {
        return {
          role: "assistant" as const,
          content: message.content ?? null,
          toolCalls: message.toolCalls?.map(call => ({
            id: call.id,
            name: call.name,
            arguments: call.arguments,
          })),
        };
      }
      if (message.role === "tool") {
        return {
          role: "tool" as const,
          content: message.content,
          name: message.name,
          toolCallId: message.toolCallId,
        };
      }
      return { role: message.role, content: message.content } as LLMRequestMessage;
    });
  }

  private async requestCompletion(
    payload: GatewayRequestBody,
    signal?: AbortSignal,
  ): Promise<ProviderGenerateResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      throw await this.buildGatewayError(response);
    }

    const data = (await response.json()) as ProviderGenerateResult;
    return {
      content: data.content ?? null,
      toolCalls: data.toolCalls,
    };
  }

  private async streamCompletion(
    payload: GatewayRequestBody,
    options: ProviderGenerateOptions,
  ): Promise<ProviderGenerateResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    if (!response.ok) {
      throw await this.buildGatewayError(response);
    }

    if (!response.body) {
      throw new Error("Gateway stream response missing body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: ProviderGenerateResult | null = null;
    const onToken = options.onToken;

    const flushBuffer = () => {
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        this.handleStreamEvent(rawEvent, chunk => {
          if (onToken && typeof chunk === "string" && chunk.length > 0) {
            onToken(chunk);
          }
        }, result => {
          finalResult = result;
        });
        separatorIndex = buffer.indexOf("\n\n");
      }
    };

    const abortSignal = options.signal;
    if (abortSignal) {
      const abortHandler = () => {
        reader.cancel(abortSignal.reason ?? new Error("aborted"));
      };
      if (abortSignal.aborted) {
        abortHandler();
      } else {
        abortSignal.addEventListener("abort", abortHandler, { once: true });
      }
    }

    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      flushBuffer();
    }

    flushBuffer();

    if (!finalResult) {
      throw new Error("Gateway stream ended without result");
    }

    const result = finalResult as ProviderGenerateResult;
    return {
      content: result.content ?? null,
      toolCalls: result.toolCalls,
    };
  }

  private handleStreamEvent(
    rawEvent: string,
    onChunk: (token: string | undefined) => void,
    onResult: (result: ProviderGenerateResult) => void,
  ) {
    const { event, data } = this.parseStreamEvent(rawEvent);
    if (!event || !data) {
      return;
    }

    try {
      if (event === "chunk") {
        const parsed = JSON.parse(data) as { token?: string };
        onChunk(parsed.token);
        return;
      }
      if (event === "result") {
        const parsed = JSON.parse(data) as ProviderGenerateResult;
        onResult({
          content: parsed.content ?? null,
          toolCalls: parsed.toolCalls,
        });
        return;
      }
      if (event === "error") {
        const parsed = JSON.parse(data) as { message?: string };
        throw new Error(parsed.message ?? "Gateway stream error");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }

  private parseStreamEvent(eventPayload: string): StreamParseResult {
    const lines = eventPayload.split("\n");
    let event: string | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(":")) {
        continue;
      }
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    return { event, data: dataLines.length > 0 ? dataLines.join("\n") : undefined };
  }

  private async buildGatewayError(response: Response): Promise<Error> {
    const contentType = response.headers.get("content-type") ?? "";
    let detail: string | undefined;
    let rawBody: string | undefined;

    try {
      rawBody = await response.text();
    } catch {
      rawBody = undefined;
    }

    if (rawBody) {
      if (contentType.includes("application/json")) {
        try {
          const json = JSON.parse(rawBody) as Record<string, unknown>;
          detail = typeof json.detail === "string" ? json.detail : undefined;
          if (!detail) {
            detail = JSON.stringify(json);
          }
        } catch {
          detail = rawBody;
        }
      } else {
        detail = rawBody;
      }
    }

    const message = detail || `Gateway request failed with status ${response.status}`;
    const error = new Error(message);
    (error as { status?: number }).status = response.status;
    return error;
  }
}

export default OpenAIProvider;
