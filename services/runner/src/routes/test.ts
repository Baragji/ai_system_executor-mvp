import fs from "node:fs/promises";
import path from "node:path";

import { Router, type Request, type Response } from "express";
import slugify from "slugify";

import { logEvent, runInSandbox, type RunInSandboxOptions } from "../domain/runner.js";

const OUTPUT_DIR = path.resolve("output");

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

async function ensureProjectExists(projectRoot: string): Promise<boolean> {
  try {
    await fs.access(projectRoot);
    return true;
  } catch {
    return false;
  }
}

function buildRunOptions(projectRoot: string, projectSlug: string, body: Request["body"]): RunInSandboxOptions {
  const command = body?.command === undefined ? undefined : String(body.command);
  const timeoutMs = parseTimeout(body?.timeoutMs);
  const env = normalizeEnv(body?.env);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;

  const options: RunInSandboxOptions = { projectRoot, projectSlug };
  if (command) options.command = command;
  if (timeoutMs !== undefined) options.timeoutMs = timeoutMs;
  if (env !== undefined) options.env = env;
  if (sessionId) options.sessionId = sessionId;
  return options;
}

export function createTestRouter(): Router {
  const router = Router();

  router.post("/test", async (req: Request, res: Response) => {
    const projectRaw = typeof req.body?.project === "string" ? req.body.project.trim() : "";
    if (!projectRaw) {
      res.status(400).json({ error: "project required" });
      return;
    }

    let options: RunInSandboxOptions;
    const slug = slugify(projectRaw, { lower: true, strict: true });
    const projectRoot = path.join(OUTPUT_DIR, slug);

    if (!(await ensureProjectExists(projectRoot))) {
      res.status(404).json({ error: "project not found" });
      return;
    }

    try {
      options = buildRunOptions(projectRoot, slug, req.body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid request";
      res.status(400).json({ error: message });
      return;
    }

    try {
      const result = await runInSandbox(options);
      await logEvent("test_run", { project: slug, stage: "manual", status: result.status });
      res.json(result);
    } catch (err) {
      console.error("[/test] runInSandbox failed", err);
      const message = err instanceof Error ? err.message : "internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
