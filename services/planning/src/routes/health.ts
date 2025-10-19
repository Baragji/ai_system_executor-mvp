import { Router, type Request, type Response } from "express";

/**
 * Minimal health endpoint used by smoke tests and readiness probes.
 */
export function createHealthRouter(): Router {
  const router = Router();

  router.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  return router;
}
