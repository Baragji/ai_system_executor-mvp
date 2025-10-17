/* eslint-disable */
/**
 * Phase 19 — Orchestrator Adapter
 * Wires POST /api/execute → LangGraph runtime when AGENTS_RUNTIME=langgraph,
 * otherwise falls back to the existing StepQueue/StateMachine path.
 *
 * Integration (Express):
 *   import { execute as executeHandler } from "./orchestrator/adapter";
 *   app.post("/api/execute", executeHandler);
 */

import type { Request, Response } from "express";
import { z } from "zod";

// Optional: OTel tracing (initialized elsewhere)
let tracer: any = null;
try {
  // Lazy import so this compiles without OTel during bootstrap
  tracer = require("@opentelemetry/api").trace.getTracer("phase19-orchestrator");
} catch { /* noop */ }

// Feature flag: default to existing runtime unless explicitly set
const FLAG = (process.env.AGENTS_RUNTIME || "stepqueue").toLowerCase();

// We expect these modules to exist in your repo (graph.ts to be created in Phase 19, StepQueue already exists)
type RunResult = { executionId: string; status: "started" | "completed" | "failed"; location?: string; result?: unknown };

// LangGraph entry
const runGraph: (args: { prompt: string; sessionId?: string; deterministic?: boolean; seed?: string }) => Promise<RunResult> =
  // Defer binding so this file can land before graph.ts exists
  (() => {
    try {
      return require("./graph").runGraph;
    } catch {
      return async () => ({
        executionId: "unavailable",
        status: "failed",
        result: { error: "graph.ts not yet implemented" }
      });
    }
  })();

// StepQueue/stateMachine fallback (expected to exist)
const runWithStepQueue: (args: { prompt: string; sessionId?: string }) => Promise<RunResult> =
  (() => {
    try {
      return require("./stateMachine").runWithStepQueue;
    } catch {
      return async ({ prompt }) => ({
        executionId: "stepqueue-simulated",
        status: "completed",
        result: { message: "StepQueue fallback executed (simulated)", prompt }
      });
    }
  })();

// Input schema (strict)
const ExecuteSchema = z.object({
  prompt: z.string().min(1, "prompt is required"),
  sessionId: z.string().optional(),
  deterministic: z.boolean().optional().default(false),
  seed: z.string().optional()
}).strict();

// RFC 9457 error envelope
function rfc9457(status: number, title: string, detail: string, instance: string, type = "about:blank") {
  return {
    type, title, status, detail, instance,
    "urn:trace_id": process.env.OTEL_TRACE_ID || "",
    "urn:ts": new Date().toISOString()
  };
}

/**
 * Express handler — POST /api/execute
 *  - 202 Accepted for async graph start (langgraph)
 *  - 200 OK for synchronous fallback (stepqueue)
 */
export async function execute(req: Request, res: Response) {
  const span = tracer?.startSpan?.("orchestrator.execute");

  try {
    const { prompt, sessionId, deterministic, seed } = ExecuteSchema.parse(req.body || {});
    const instance = `/api/execute`;

    if (FLAG === "langgraph") {
      const result = await runGraph({ prompt, sessionId, deterministic, seed });
      if (result.status === "failed") {
        res.status(500).json(rfc9457(500, "GraphStartFailed", "LangGraph failed to start/execute", instance));
        return;
      }
      // Asynchronous contract: 202 + Location header for polling (future)
      res
        .status(202)
        .setHeader("Location", result.location || `/api/executions/${result.executionId}`)
        .json({ executionId: result.executionId, status: result.status });
      return;
    }

    // Fallback — retain current behavior (synchronous or queued)
    const result = await runWithStepQueue({ prompt, sessionId });
    res.status(200).json({ executionId: result.executionId, status: result.status, result: result.result });
  } catch (e: any) {
    const msg = e?.message || "Invalid request";
    const instance = `/api/execute`;
    res.status(400).json(rfc9457(400, "BadRequest", msg, instance));
  } finally {
    span?.end?.();
  }
}
