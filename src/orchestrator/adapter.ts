/**
 * Feature-flagged orchestrator adapter (ESM, no external deps).
 *
 * Notes
 * - This is a stub compatible with our stack (TS/ESM).
 * - It intentionally avoids adding new dependencies (no zod).
 * - Not wired into server by default; safe to keep until LangGraph graph lands.
 */

import type { Request, Response } from "express";

import { respondWithProblem } from "../middleware/problemDetails.js";
import type { GraphRunArgs, GraphRunResult } from "./graph.js";

type RunResult = {
  executionId: string;
  status: "started" | "completed" | "failed";
  location?: string;
  result?: unknown;
};

function isLangGraphRuntime(): boolean {
  return (process.env.AGENTS_RUNTIME || "").toLowerCase() === "langgraph";
}

async function tryRunGraph(args: GraphRunArgs): Promise<RunResult> {
  try {
    // Dynamic import via variable to avoid type resolution when file is absent
    const modPath = "./graph.js";
    const mod = (await import(modPath as string)) as { runGraph?: (input: GraphRunArgs) => Promise<GraphRunResult> };
    if (typeof mod.runGraph !== "function") {
      return { executionId: "unavailable", status: "failed", result: { error: "runGraph not implemented" } };
    }
    const result = await mod.runGraph(args);
    return {
      executionId: result.executionId,
      status: result.status,
      location: result.location,
      result: result.result
    } satisfies RunResult;
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
  const instance = req.originalUrl || req.url || "/api/execute";

  if (!prompt) {
    respondWithProblem(res, 400, "BadRequest", "prompt is required", instance);
    return;
  }

  if (isLangGraphRuntime()) {
    const result = await tryRunGraph({ prompt, sessionId, deterministic, seed });
    if (result.status === "failed") {
      respondWithProblem(
        res,
        500,
        "GraphStartFailed",
        "LangGraph failed to start/execute",
        instance,
        typeof result.result === "object" && result.result !== null ? { details: result.result } : undefined
      );
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
