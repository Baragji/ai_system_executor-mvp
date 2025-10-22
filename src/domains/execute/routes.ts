import type { Application } from "express";
import { makeExecuteHandler } from "../../services/execute.js";
import type { ExecuteDeps } from "../../services/execute.js";

// Mounts the /api/execute route via DI without changing behavior
export function mountExecuteRoutes(app: Application, deps: ExecuteDeps): void {
  const handler = makeExecuteHandler(deps);
  app.post("/api/execute", handler);
}
