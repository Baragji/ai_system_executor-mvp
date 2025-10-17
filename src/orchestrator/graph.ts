import { randomUUID } from "node:crypto";

import { logEvent } from "../telemetry/events.js";
import { deriveDeterministicSessionId, hashToSeedInt, mulberry32 } from "./replay.js";
import { createExecution, completeExecution } from "./executionsStore.js";

export type GraphRunArgs = {
  prompt: string;
  sessionId?: string;
  deterministic?: boolean;
  seed?: string;
};

export type GraphRunResult = {
  executionId: string;
  status: "started" | "completed" | "failed";
  location?: string;
  result?: unknown;
};

export function buildExecutionId(sessionId?: string): string {
  if (sessionId && sessionId.trim()) {
    return `graph-${sessionId.trim()}`;
  }
  return `graph-${randomUUID()}`;
}

export async function runGraph(args: GraphRunArgs): Promise<GraphRunResult> {
  const sessionStable = args.deterministic ? deriveDeterministicSessionId(args.prompt, args.seed || "default") : args.sessionId;
  const executionId = buildExecutionId(sessionStable);
  const location = `/api/executions/${executionId}`;

  await logEvent("langgraph_execution_started", {
    executionId,
    sessionId: args.sessionId ?? null,
    deterministic: Boolean(args.deterministic),
    seed: args.seed ?? null
  });

  // Record execution start in store and auto-complete shortly with stub payload
  createExecution(executionId, { status: "started" });
  // Provide a small deterministic field if deterministic mode is on
  let deterministicSample: number | undefined;
  if (args.deterministic) {
    const seedInt = hashToSeedInt(args.prompt, args.seed || "default");
    const rng = mulberry32(seedInt);
    deterministicSample = Number(rng().toFixed(6));
  }
  const stubResult = {
    message: "LangGraph runtime stub invoked. Replace with real graph implementation.",
    prompt: args.prompt,
    ...(deterministicSample !== undefined ? { deterministicSample } : {})
  };
  // Simulate async progression to completed for polling clients
  setTimeout(async () => {
    completeExecution(executionId, stubResult);
    await logEvent("langgraph_execution_completed", { executionId });
  }, 10);

  return {
    executionId,
    status: "started",
    location,
    result: stubResult
  };
}
