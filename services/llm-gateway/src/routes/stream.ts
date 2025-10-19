import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";

import { ProviderNotConfiguredError, type LLMGatewayDriver } from "../domain/index.js";
import { respondWithProblem } from "../middleware/problemDetails.js";
import { buildRequestOptions, parseMessages } from "./requestValidation.js";

function writeEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function createStreamRouter(driver: LLMGatewayDriver): Router {
  const router = createRouter();

  router.post("/stream", async (req: Request, res: Response) => {
    const messages = parseMessages(req.body?.messages);

    if (!messages) {
      respondWithProblem(res, 400, "Bad Request", "messages must be an array of LLM messages", req.originalUrl || req.url);
      return;
    }

    let started = false;
    let closed = false;

    const startStream = () => {
      if (started) {
        return;
      }
      started = true;
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
    };

    const endStream = () => {
      if (closed) {
        return;
      }
      closed = true;
      if (!res.writableEnded) {
        res.end();
      }
    };

    res.once("close", () => {
      closed = true;
    });

    let options;
    try {
      options = buildRequestOptions(req.body ?? {});
    } catch {
      endStream();
      respondWithProblem(res, 400, "Bad Request", "tools must contain valid schema definitions", req.originalUrl || req.url);
      return;
    }

    try {
      const result = await driver.complete(messages, {
        ...options,
        onToken(chunk) {
          if (closed) {
            return;
          }
          startStream();
          writeEvent(res, "chunk", { token: chunk });
        },
      });

      if (!closed) {
        startStream();
        writeEvent(res, "result", result);
        endStream();
      }
    } catch (error) {
      if (error instanceof ProviderNotConfiguredError) {
        respondWithProblem(res, error.status, "Service Unavailable", error.message, req.originalUrl || req.url);
        return;
      }
      if (!started) {
        respondWithProblem(
          res,
          502,
          "Bad Gateway",
          error instanceof Error ? error.message : "upstream failure",
          req.originalUrl || req.url,
        );
        return;
      }
      if (!closed) {
        writeEvent(res, "error", {
          message: error instanceof Error ? error.message : "upstream failure",
        });
        endStream();
      }
    }
  });

  return router;
}
