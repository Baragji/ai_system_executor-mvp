import type { Application } from "express";

import { respondWithProblem } from "../../middleware/problemDetails.js";
import type { ExecutionRecord } from "../../orchestrator/executionsStore.js";

export type StatusDeps = {
  getExecution: (id: string) => ExecutionRecord | null;
};

export function mountStatusRoutes(app: Application, deps: StatusDeps): void {
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

  app.get("/api/executions/:id", (req, res) => {
    const { id } = req.params as { id: string };
    const record = deps.getExecution(id);
    if (!record) {
      respondWithProblem(
        res,
        404,
        "NotFound",
        "execution not found",
        req.originalUrl || req.url || "/api/executions"
      );
      return;
    }

    res.json(record);
  });
}
