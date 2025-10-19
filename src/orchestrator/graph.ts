import { randomUUID } from "node:crypto";

import { StateGraph, START, END, Annotation } from "@langchain/langgraph";

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

// Defer state annotation construction until runtime to avoid import-time crashes
// in test environments where langgraph annotations might not be initialized.
function buildGraphState() {
  return Annotation.Root({
    executionId: Annotation<string>(),
    result: Annotation<unknown | undefined>(),
    logs: Annotation<unknown[]>({
      reducer: (a = [], b = []) => (Array.isArray(a) ? a : []).concat(b ?? [])
    }),
  });
}

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

  let latestLogs: unknown[] = [];

  try {
    // Primary path: use LangGraph StateGraph when available
    const GraphState = buildGraphState();
    const builder = new StateGraph(GraphState);

  (builder as unknown as { addNode: (name: string, handler: (state: { executionId: string; logs?: unknown[]; result?: unknown }) => Promise<{ executionId: string; result?: unknown; logs: unknown[] }>) => unknown }).addNode("runWorkflow", async (state: { executionId: string; logs?: unknown[]; result?: unknown }) => {
      latestLogs = [];
      updateExecution(executionId, { status: "running", logs: latestLogs });

      const capturedLogs: unknown[] = [];
      const workflow = await stepQueue.runWorkflow(sessionId, steps, {
        onStep(step) {
          capturedLogs.push(serializeStep(step));
          latestLogs = capturedLogs.slice();
          updateExecution(executionId, { logs: latestLogs });
        },
      });

      const response = extractResponse(workflow);

      latestLogs = capturedLogs.slice();

      return {
        executionId: state.executionId,
        result: response,
        logs: capturedLogs,
      } as { executionId: string; result?: unknown; logs: unknown[] };
    });

    (builder as unknown as { addEdge: (from: unknown, to: unknown) => unknown }).addEdge(START as unknown, "runWorkflow");
    (builder as unknown as { addEdge: (from: unknown, to: unknown) => unknown }).addEdge("runWorkflow", END as unknown);

    const app = builder.compile();

    logEvent("langgraph.started", { executionId, deterministic, seed });
    const final = await app.invoke({ executionId, logs: [] });

    latestLogs = Array.isArray(final.logs) ? final.logs.slice() : latestLogs;

    completeExecution(executionId, {
      output: final.result,
      logs: final.logs,
    });
    logEvent("langgraph.completed", { executionId });

    return { output: final.result, logs: final.logs } satisfies GraphOutput;
  } catch (err) {
    // Fallback path: if LangGraph annotations are unavailable in this environment,
    // run the workflow directly and update the executions store.
    if (err && typeof err === "object" && (err as Error).message?.includes("Root")) {
      try {
        logEvent("langgraph.fallback", { executionId, reason: (err as Error).message });
        updateExecution(executionId, { status: "running", logs: [] });
        const capturedLogs: unknown[] = [];
        const workflow = await stepQueue.runWorkflow(sessionId, steps, {
          onStep(step) {
            capturedLogs.push(serializeStep(step));
            latestLogs = capturedLogs.slice();
            updateExecution(executionId, { logs: latestLogs });
          },
        });
        const response = extractResponse(workflow);
        completeExecution(executionId, { output: response, logs: capturedLogs });
        return { output: response, logs: capturedLogs };
      } catch (inner) {
        if (latestLogs.length > 0) {
          updateExecution(executionId, { logs: latestLogs });
        }
        failExecution(executionId, inner);
        logEvent("langgraph.failed", {
          executionId,
          deterministic,
          seed,
          error: inner instanceof Error ? inner.message : String(inner),
        });
        throw inner;
      } finally {
        if (sessionId) {
          cleanupAbortSignal(sessionId);
        }
      }
    }

    if (latestLogs.length > 0) {
      updateExecution(executionId, { logs: latestLogs });
    }
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
