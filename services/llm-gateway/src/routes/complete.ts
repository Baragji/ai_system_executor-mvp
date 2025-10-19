import { Router, type Request, type Response } from "express";

import {
  ProviderNotConfiguredError,
  type CompleteRequestOptions,
  type LLMGatewayDriver,
  type LLMMessage,
  type ToolSchema,
} from "../domain/index.js";
import { respondWithProblem } from "../middleware/problemDetails.js";
import { buildRequestOptions, parseMessages } from "./requestValidation.js";

export function createCompleteRouter(driver: LLMGatewayDriver): Router {
  const router = Router();

  router.post("/complete", async (req: Request, res: Response) => {
    const messages = parseMessages(req.body?.messages);

    if (!messages) {
      respondWithProblem(res, 400, "Bad Request", "messages must be an array of LLM messages", req.originalUrl || req.url);
      return;
    }

    let options: CompleteRequestOptions;
    try {
      options = buildRequestOptions(req.body ?? {});
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

export type { CompleteRequestOptions, LLMMessage, ToolSchema };
