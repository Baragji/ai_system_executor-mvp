import type { CompleteRequestOptions, LLMMessage, ToolSchema, LLMToolCall } from "../domain/index.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function parseMessages(payload: unknown): LLMMessage[] | null {
  if (!Array.isArray(payload)) {
    return null;
  }

  const result: LLMMessage[] = [];

  for (const entry of payload) {
    if (!isRecord(entry) || !isString(entry.role)) {
      return null;
    }

    if (entry.role === "system" || entry.role === "user") {
      if (!isString(entry.content)) {
        return null;
      }
      result.push({ role: entry.role, content: entry.content });
      continue;
    }

    if (entry.role === "assistant") {
      const content = entry.content === null || isString(entry.content) ? entry.content : null;
      if (content === null && entry.content !== null) {
        return null;
      }

      let toolCalls: LLMToolCall[] | undefined;
      if (Array.isArray(entry.toolCalls)) {
        const mapped: LLMToolCall[] = [];
        for (const call of entry.toolCalls) {
          if (!isRecord(call) || !isString(call.id) || !isString(call.name) || !isString(call.arguments)) {
            return null;
          }
          mapped.push({ id: call.id, name: call.name, arguments: call.arguments });
        }
        toolCalls = mapped;
      }

      result.push({ role: "assistant", content, toolCalls });
      continue;
    }

    if (entry.role === "tool") {
      if (!isString(entry.content) || !isString(entry.toolCallId) || !isString(entry.name)) {
        return null;
      }
      result.push({ role: "tool", content: entry.content, name: entry.name, toolCallId: entry.toolCallId });
      continue;
    }

    return null;
  }

  return result;
}

export function parseTools(payload: unknown): ToolSchema[] | undefined {
  if (payload === undefined) {
    return undefined;
  }

  if (!Array.isArray(payload)) {
    throw new Error("invalid tools payload");
  }

  const schemas: ToolSchema[] = [];
  for (const entry of payload) {
    if (!isRecord(entry)) {
      throw new Error("invalid tool schema");
    }
    if (!isString(entry.name) || !isString(entry.description)) {
      throw new Error("invalid tool schema");
    }
    if (!isRecord(entry.parameters)) {
      throw new Error("invalid tool schema");
    }
    schemas.push({
      name: entry.name,
      description: entry.description,
      parameters: entry.parameters,
    });
  }
  return schemas;
}

export function buildRequestOptions(body: Record<string, unknown>): CompleteRequestOptions {
  const tools = parseTools(body.tools);
  return { tools };
}
