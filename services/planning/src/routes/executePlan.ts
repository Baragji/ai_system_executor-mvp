import { Router, type Request, type Response } from "express";

import {
  estimateCompletion,
  executeTaskPlan,
  type ClarificationResponse,
  type PlanExecutionResult,
  type TaskPlan,
} from "../domain/planning.js";
import { createPlanExecutionContext } from "../domain/context.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

interface ExecutePlanRequestBody {
  plan?: TaskPlan;
  targetRoot?: string;
  slug?: string;
  effectivePrompt?: string;
  clarifications?: ClarificationResponse;
  systemPrompt?: string;
  sessionId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStringField(body: ExecutePlanRequestBody, key: keyof ExecutePlanRequestBody): string | null {
  const raw = body[key];
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertPlan(value: unknown): asserts value is TaskPlan {
  if (!isRecord(value)) {
    throw new Error("plan must be an object");
  }

  if (!Array.isArray(value.subtasks)) {
    throw new Error("plan.subtasks must be an array");
  }
}

export function createExecutePlanRouter(): Router {
  const router = Router();

  router.post("/execute-plan", async (req: Request<unknown, unknown, ExecutePlanRequestBody>, res: Response) => {
    const instance = req.originalUrl || req.url || "/execute-plan";
    const body = req.body ?? {};

    try {
      assertPlan(body.plan);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid plan";
      respondWithProblem(res, 400, "Bad Request", message, instance);
      return;
    }

    const targetRoot = parseStringField(body, "targetRoot");
    if (!targetRoot) {
      respondWithProblem(res, 400, "Bad Request", "targetRoot is required", instance);
      return;
    }

    const slug = parseStringField(body, "slug");
    if (!slug) {
      respondWithProblem(res, 400, "Bad Request", "slug is required", instance);
      return;
    }

    const effectivePrompt = parseStringField(body, "effectivePrompt");
    if (!effectivePrompt) {
      respondWithProblem(res, 400, "Bad Request", "effectivePrompt is required", instance);
      return;
    }

    const systemPrompt = parseStringField(body, "systemPrompt");
    if (!systemPrompt) {
      respondWithProblem(res, 400, "Bad Request", "systemPrompt is required", instance);
      return;
    }

    const clarifications = body.clarifications;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;

    const context = createPlanExecutionContext({
      targetRoot,
      slug,
      effectivePrompt,
      clarifications,
      systemPrompt,
      sessionId,
    });

    try {
      const result: PlanExecutionResult = await executeTaskPlan(body.plan, context);
      const estimate = estimateCompletion(result.progress, body.plan);
      res.json({ result, estimate });
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "ABORT_ERR") {
        respondWithProblem(res, 409, "Plan Aborted", (error as Error).message, instance, {
          code,
        });
        return;
      }

      console.error("[/execute-plan] unexpected error", error);
      respondWithProblem(res, 500, "Internal Server Error", "Failed to execute plan", instance);
    }
  });

  return router;
}
