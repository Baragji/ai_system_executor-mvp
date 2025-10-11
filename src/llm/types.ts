export type LLMMessage = { role: "system" | "user"; content: string };

export interface ToolExecutionContext {
  projectSlug?: string;
  sessionId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: unknown, context: ToolExecutionContext) => Promise<unknown>;
}

export interface ProviderToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type LLMRequestMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: LLMToolCall[] }
  | { role: "tool"; content: string; name: string; toolCallId: string };

export interface ProviderGenerateOptions {
  tools?: ProviderToolSchema[];
  signal?: AbortSignal;
}

export interface ProviderGenerateResult {
  content: string | null;
  toolCalls?: LLMToolCall[];
}

export interface GenerateJSONOptions {
  sessionId?: string;
  tools?: ToolDefinition[];
  toolContext?: ToolExecutionContext;
  maxToolIterations?: number;
  signal?: AbortSignal;
}
