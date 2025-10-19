import { Router, type Request, type Response } from "express";

import { runInSandbox, type RunInSandboxOptions } from "../domain/runner.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeEnv(value: unknown): Record<string, string | undefined> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new Error("env must be an object");
  }

  const env: Record<string, string | undefined> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (raw === undefined || raw === null) {
      env[key] = undefined;
      continue;
    }
    if (typeof raw !== "string") {
      throw new Error("env values must be strings or null");
    }
    env[key] = raw;
  }

  return env;
}

function parseTimeout(raw: unknown): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    throw new Error("timeoutMs must be a positive number");
  }

  return raw;
}

function buildRunOptions(body: Request["body"]): RunInSandboxOptions {
  const projectRoot = typeof body?.projectRoot === "string" ? body.projectRoot.trim() : "";
  if (!projectRoot) {
    throw new Error("projectRoot required");
  }

  const projectSlug = typeof body?.projectSlug === "string" ? body.projectSlug.trim() : "";
  if (!projectSlug) {
    throw new Error("projectSlug required");
  }

  const command = body?.command === undefined ? undefined : String(body.command);
  const timeoutMs = parseTimeout(body?.timeoutMs);
  const env = normalizeEnv(body?.env);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;

  const options: RunInSandboxOptions = {
    projectRoot,
    projectSlug,
  };

  if (command) options.command = command;
  if (timeoutMs !== undefined) options.timeoutMs = timeoutMs;
  if (env !== undefined) options.env = env;
  if (sessionId) options.sessionId = sessionId;

  return options;
}

export function createRunRouter(): Router {
  const router = Router();

  router.post("/run", async (req: Request, res: Response) => {
    let options: RunInSandboxOptions;
    try {
      options = buildRunOptions(req.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid request";
      res.status(400).json({ error: message });
      return;
    }

    try {
      const result = await runInSandbox(options);
      res.json(result);
    } catch (err) {
      console.error("[/run] runInSandbox failed", err);
      const message = err instanceof Error ? err.message : "internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
