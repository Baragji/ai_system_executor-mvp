export type LLMRole = "system" | "user" | "assistant" | "tool";

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type LLMMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: LLMToolCall[] }
  | { role: "tool"; content: string; name: string; toolCallId: string };

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ProviderToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ProviderGenerateOptions {
  tools?: ProviderToolSchema[];
  signal?: AbortSignal;
  onToken?: (chunk: string) => void;
}

export interface ProviderGenerateResult {
  content: string | null;
  toolCalls?: LLMToolCall[];
}

export interface LLMProvider {
  generate(messages: LLMMessage[], options?: ProviderGenerateOptions): Promise<ProviderGenerateResult>;
}

export interface CompleteRequestOptions {
  tools?: ToolSchema[];
  signal?: AbortSignal;
  onToken?: (chunk: string) => void;
}

export interface LLMGatewayDriver {
  complete(messages: LLMMessage[], options?: CompleteRequestOptions): Promise<ProviderGenerateResult>;
}

export class ProviderNotConfiguredError extends Error {
  status: number;

  constructor(message = "LLM provider driver is not configured") {
    super(message);
    this.name = "ProviderNotConfiguredError";
    this.status = 503;
  }
}

export function mapToolSchemas(tools: ToolSchema[]): ProviderToolSchema[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export function createLLMGatewayDriver(provider: LLMProvider): LLMGatewayDriver {
  return {
    async complete(messages, options = {}) {
      const providerTools = options.tools && options.tools.length > 0 ? mapToolSchemas(options.tools) : undefined;
      return provider.generate(messages, {
        tools: providerTools,
        signal: options.signal,
        onToken: options.onToken,
      });
    },
  };
}

export function createUnconfiguredDriver(): LLMGatewayDriver {
  return {
    async complete() {
      throw new ProviderNotConfiguredError();
    },
  };
}

export { OpenAIProvider } from "./providers/openai.js";
