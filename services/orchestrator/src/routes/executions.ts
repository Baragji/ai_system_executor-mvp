import { Router } from "express";

import { getExecution } from "../domain/executionsStore.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

export function createExecutionsRouter(): Router {
  const router = Router();

  router.get("/executions/:id", (req, res) => {
    const { id } = req.params as { id: string };
    const record = getExecution(id);

    if (!record) {
      const instance = req.originalUrl || req.url || "/executions";
      respondWithProblem(res, 404, "NotFound", "execution not found", instance);
      return;
    }

    res.json(record);
  });

  return router;
}
