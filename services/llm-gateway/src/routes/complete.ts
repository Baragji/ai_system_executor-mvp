import { Router, type Request, type Response } from "express";

import {
  type CompleteRequestOptions,
  type LLMGatewayDriver,
  type LLMMessage,
  type ToolSchema,
  ProviderNotConfiguredError,
} from "../domain/index.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function validateMessages(payload: unknown): LLMMessage[] | null {
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

      let toolCalls;
      if (Array.isArray(entry.toolCalls)) {
        const mapped = [];
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
      if (!isString(entry.content) || !isString(entry.toolCallId)) {
        return null;
      }
      result.push({ role: "tool", content: entry.content, toolCallId: entry.toolCallId });
      continue;
    }

    return null;
  }

  return result;
}

function validateTools(payload: unknown): ToolSchema[] | undefined {
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

function buildOptions(body: Record<string, unknown>): CompleteRequestOptions {
  const tools = validateTools(body.tools);
  return { tools };
}

export function createCompleteRouter(driver: LLMGatewayDriver): Router {
  const router = Router();

  // POST /complete - Accepts LLM completion requests and forwards them to the configured driver.
  router.post("/complete", async (req: Request, res: Response) => {
    const messages = validateMessages(req.body?.messages);

    if (!messages) {
      respondWithProblem(res, 400, "Bad Request", "messages must be an array of LLM messages", req.originalUrl || req.url);
      return;
    }

    let options: CompleteRequestOptions;
    try {
      options = buildOptions(req.body ?? {});
    } catch {
      respondWithProblem(res, 400, "Bad Request", "tools must contain valid schema definitions", req.originalUrl || req.url);
      return;
    }

    try {
      const result = await driver.complete(messages, options);
      res.json(result);
    } catch (error) {
      if (error instanceof ProviderNotConfiguredError) {
        respondWithProblem(res, error.status, "Service Unavailable", error.message, req.originalUrl || req.url);
        return;
      }
      respondWithProblem(
        res,
        502,
        "Bad Gateway",
        error instanceof Error ? error.message : "upstream failure",
        req.originalUrl || req.url,
      );
    }
  });

  return router;
}
