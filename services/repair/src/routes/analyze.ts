import { Router, type Request, type Response } from "express";

import { analyzeFailure } from "../../../../src/repair/analyzeFailure.js";
import { respondWithProblem } from "../middleware/problemDetails.js";
import type { FailureAnalysis } from "../../../../src/contracts/repairHistoryValidator.js";

function getInstance(req: Request): string {
  return req.originalUrl || req.url || "/analyze";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function createAnalyzeRouter(): Router {
  const router = Router();

  router.post("/analyze", (req: Request, res: Response) => {
    const { testOutput } = (req.body ?? {}) as { testOutput?: unknown };

    if (!isNonEmptyString(testOutput)) {
      const instance = getInstance(req);
      respondWithProblem(
        res,
        400,
        "Bad Request",
        "Request body must include a non-empty string 'testOutput'",
        instance,
        {
          errors: [
            {
              pointer: "/testOutput",
              detail: "testOutput must be a non-empty string",
            },
          ],
        }
      );
      return;
    }

    const analysis: FailureAnalysis = analyzeFailure(testOutput);
    res.json({ analysis });
  });

  return router;
}
