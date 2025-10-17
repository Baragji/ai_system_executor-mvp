import { randomUUID } from "node:crypto";

import { StateGraph, START, END } from "@langchain/langgraph";

import { cleanupAbortSignal } from "./abortSignal.js";
import { logEvent } from "../telemetry/events.js";
import {
  completeExecution,
  failExecution,
  updateExecution,
} from "./executionsStore.js";
import type {
  StepDescriptor,
  StepExecutionResult,
  WorkflowRunResult,
} from "./stepQueue.js";
import { StepQueue } from "./stepQueue.js";
import type { ExecutorSuccessResponse } from "./executionTypes.js";

export type GraphRunArgs = {
  executionId: string;
  sessionId: string;
  steps: StepDescriptor[];
  stepQueue: StepQueue;
  deterministic: boolean;
  seed: number;
};

export type GraphOutput = {
  output?: unknown;
  logs?: unknown[];
};

export type GraphRunResult = GraphOutput & {
  executionId: string;
  status: "completed";
};

export function buildExecutionId(sessionId?: string): string {
  if (sessionId && sessionId.trim()) {
    return `graph-${sessionId.trim()}`;
  }
  return `graph-${randomUUID()}`;
}

type GraphState = {
  executionId: string;
  result?: unknown;
  logs: unknown[];
};

function serializeStep(step: StepExecutionResult): Record<string, unknown> {
  return {
    stepId: step.stepId,
    stepType: step.stepType,
    status: step.status,
    sequence: step.sequence,
    stop: step.stop ?? false,
    data: step.data ?? null,
  };
}

function extractResponse(run: WorkflowRunResult): ExecutorSuccessResponse | undefined {
  const final = run.last;
  if (!final) {
    return undefined;
  }
  return final.data?.response as ExecutorSuccessResponse | undefined;
}

export async function runWithLangGraph(args: GraphRunArgs): Promise<GraphOutput> {
  const { executionId, sessionId, steps, stepQueue, deterministic, seed } = args;

  const builder = new StateGraph<GraphState>({
    channels: {} as Record<string, never>,
  });

  builder.addNode("runWorkflow", async state => {
    updateExecution(executionId, { status: "running" });

    const capturedLogs: unknown[] = [];
    const workflow = await stepQueue.runWorkflow(sessionId, steps, {
      onStep(step) {
        capturedLogs.push(serializeStep(step));
      },
    });

    const response = extractResponse(workflow);

    return {
      ...state,
      result: response,
      logs: capturedLogs,
    } satisfies GraphState;
  });

  builder.addEdge(START, "runWorkflow");
  builder.addEdge("runWorkflow", END);

  const app = builder.compile();

  try {
    logEvent("langgraph.started", { executionId, deterministic, seed });
    const final = await app.invoke({ executionId, logs: [] });

    completeExecution(executionId, {
      output: final.result,
      logs: final.logs,
    });
    logEvent("langgraph.completed", { executionId });

    return { output: final.result, logs: final.logs } satisfies GraphOutput;
  } catch (err) {
    failExecution(executionId, err);
    logEvent("langgraph.failed", {
      executionId,
      deterministic,
      seed,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    if (sessionId) {
      cleanupAbortSignal(sessionId);
    }
  }
}

export async function runGraph(args: GraphRunArgs): Promise<GraphRunResult> {
  const { output, logs } = await runWithLangGraph(args);
  return {
    executionId: args.executionId,
    status: "completed",
    output,
    logs,
  } satisfies GraphRunResult;
}
