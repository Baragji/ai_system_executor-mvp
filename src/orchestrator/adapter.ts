/**
 * Feature-flagged orchestrator adapter (ESM, no external deps).
 *
 * Notes
 * - This is a stub compatible with our stack (TS/ESM).
 * - It intentionally avoids adding new dependencies (no zod).
 * - Not wired into server by default; safe to keep until LangGraph graph lands.
 */

import type { Request, Response } from "express";

type RunResult = {
  executionId: string;
  status: "started" | "completed" | "failed";
  location?: string;
  result?: unknown;
};

const FLAG = (process.env.AGENTS_RUNTIME || "stepqueue").toLowerCase();

function problem(status: number, title: string, detail: string, instance: string, type = "about:blank") {
  return {
    type,
    title,
    status,
    detail,
    instance,
    "urn:ts": new Date().toISOString()
  } as const;
}

async function tryRunGraph(args: { prompt: string; sessionId?: string; deterministic?: boolean; seed?: string }): Promise<RunResult> {
  try {
    // Dynamic import via variable to avoid type resolution when file is absent
    const modPath = "./graph.js";
    const mod = await import(modPath as string);
    if (typeof mod.runGraph !== "function") {
      return { executionId: "unavailable", status: "failed", result: { error: "runGraph not implemented" } };
    }
    return await mod.runGraph(args);
  } catch {
    return { executionId: "unavailable", status: "failed", result: { error: "graph.js not present" } };
  }
}

/**
 * Placeholder for a StepQueue fallback.
 * We do not call internal server pipeline from here to avoid coupling.
 */
async function runWithStepQueueSim(prompt: string): Promise<RunResult> {
  return {
    executionId: `stepqueue-sim-${Date.now()}`,
    status: "completed",
    result: { message: "StepQueue fallback executed (simulated)", prompt }
  };
}

/**
 * Express-compatible handler (not registered by default).
 * Kept here so wiring can be one-line when feature flag rollout begins.
 */
export async function executeAdapter(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const promptRaw = body.prompt;
  const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
  const sessionId = typeof body.sessionId === "string" && body.sessionId ? body.sessionId : undefined;
  const deterministic = body.deterministic === true;
  const seed = typeof body.seed === "string" && body.seed ? body.seed : undefined;
  const instance = "/api/execute";

  if (!prompt) {
    res.status(400).json(problem(400, "BadRequest", "prompt is required", instance));
    return;
  }

  if (FLAG === "langgraph") {
    const result = await tryRunGraph({ prompt, sessionId, deterministic, seed });
    if (result.status === "failed") {
      res.status(500).json(problem(500, "GraphStartFailed", "LangGraph failed to start/execute", instance));
      return;
    }
    res
      .status(202)
      .setHeader("Location", result.location || `/api/executions/${result.executionId}`)
      .json({ executionId: result.executionId, status: result.status });
    return;
  }

  const result = await runWithStepQueueSim(prompt);
  res.status(200).json({ executionId: result.executionId, status: result.status, result: result.result });
}

export type { RunResult };
