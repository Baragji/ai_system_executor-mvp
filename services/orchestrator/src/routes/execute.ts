import { randomUUID } from "crypto";
import { Router } from "express";

import {
  createExecution,
  failExecution,
} from "../domain/executionsStore.js";
import type { StepQueueAdapter } from "../lib/stepQueueAdapter.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

interface ExecuteRouterDeps {
  stepQueue: StepQueueAdapter;
}

export function createExecuteRouter({ stepQueue }: ExecuteRouterDeps): Router {
  const router = Router();

  router.post("/execute", async (req, res) => {
    const executionId = randomUUID();
    const instance = req.originalUrl || req.url || "/execute";

    const record = createExecution(executionId, {
      status: "running",
      route: "POST /execute",
      input: req.body,
      logs: [],
    });

    try {
      await stepQueue.enqueueExecution({ executionId, payload: req.body });
    } catch (error) {
      failExecution(executionId, error);
      respondWithProblem(res, 502, "StepQueueUnavailable", "Failed to enqueue execution", instance);
      return;
    }

    const location = `/executions/${executionId}`;

    res
      .status(202)
      .setHeader("Location", location)
      .json({
        executionId,
        status: record.status,
        location,
      });
  });

  return router;
}
