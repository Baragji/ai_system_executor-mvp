import { Router, type Request, type Response } from "express";

import {
  ClarificationRequiredError,
  SimplePromptBypassError,
  TaskPlanValidationError,
  decomposeTask,
  type ClarificationResponse,
  type TaskPlan,
} from "../domain/planning.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

function parsePrompt(body: Request["body"]): string | null {
  if (typeof body?.prompt !== "string") {
    return null;
  }

  const prompt = body.prompt.trim();
  return prompt.length > 0 ? prompt : null;
}

function parseClarifications(body: Request["body"]): ClarificationResponse | undefined {
  const value = body?.clarifications;
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object") {
    throw new Error("clarifications must be an object when provided");
  }

  return value as ClarificationResponse;
}

export function createDecomposeRouter(): Router {
  const router = Router();

  router.post("/decompose", async (req: Request, res: Response) => {
    let prompt: string | null;
    try {
      prompt = parsePrompt(req.body);
      if (!prompt) {
        respondWithProblem(
          res,
          400,
          "Bad Request",
          "prompt is required",
          req.originalUrl || req.url || "/decompose",
        );
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request";
      respondWithProblem(
        res,
        400,
        "Bad Request",
        message,
        req.originalUrl || req.url || "/decompose",
      );
      return;
    }

    let clarifications: ClarificationResponse | undefined;
    try {
      clarifications = parseClarifications(req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid clarifications payload";
      respondWithProblem(
        res,
        400,
        "Bad Request",
        message,
        req.originalUrl || req.url || "/decompose",
      );
      return;
    }

    try {
      const plan: TaskPlan = await decomposeTask(prompt, clarifications);
      res.json({ plan });
    } catch (error) {
      const instance = req.originalUrl || req.url || "/decompose";
      if (error instanceof ClarificationRequiredError) {
        respondWithProblem(res, 400, "Clarification Required", error.message, instance, {
          code: error.code,
        });
        return;
      }

      if (error instanceof SimplePromptBypassError) {
        respondWithProblem(res, 409, "Simple Prompt", error.message, instance, {
          code: error.code,
        });
        return;
      }

      if (error instanceof TaskPlanValidationError) {
        respondWithProblem(res, 422, "Plan Validation Failed", error.message, instance, {
          code: "plan_validation_failed",
          issues: error.issues,
        });
        return;
      }

      console.error("[/decompose] unexpected error", error);
      respondWithProblem(res, 500, "Internal Server Error", "Failed to decompose prompt", instance);
    }
  });

  return router;
}
