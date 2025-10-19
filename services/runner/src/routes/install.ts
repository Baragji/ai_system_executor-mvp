import { Router, type Request, type Response } from "express";

import { ensureDependencies } from "../domain/runner.js";

function parseTimeout(raw: unknown): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    throw new Error("timeoutMs must be a positive number");
  }

  return raw;
}

export function createInstallRouter(): Router {
  const router = Router();

  router.post("/install", async (req: Request, res: Response) => {
    const projectRoot = typeof req.body?.projectRoot === "string" ? req.body.projectRoot.trim() : "";
    if (!projectRoot) {
      res.status(400).json({ error: "projectRoot required" });
      return;
    }

    let timeoutMs: number | undefined;
    try {
      timeoutMs = parseTimeout(req.body?.timeoutMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid request";
      res.status(400).json({ error: message });
      return;
    }

    try {
      const result = await ensureDependencies(projectRoot, timeoutMs);
      res.json(result);
    } catch (err) {
      console.error("[/install] ensureDependencies failed", err);
      const message = err instanceof Error ? err.message : "internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
