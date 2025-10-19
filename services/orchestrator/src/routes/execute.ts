import { randomUUID } from "crypto";
import { Router } from "express";

import {
  createExecution,
  completeExecution,
  failExecution,
  updateExecution,
} from "../domain/executionsStore.js";
import type {
  StepQueueAdapter,
  StepQueueStepDescriptor,
  StepQueueStepResult,
  StepQueueWorkflowResult,
} from "../domain/stepQueueAdapter.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

interface ExecuteRouterDeps {
  stepQueue: StepQueueAdapter;
}

interface SerializedStepLog {
  stepId: string;
  stepType: string;
  status: StepQueueStepResult["status"];
  sequence: number;
  stop: boolean;
  data: unknown;
}

function serializeStep(step: StepQueueStepResult): SerializedStepLog {
  return {
    stepId: step.stepId,
    stepType: step.stepType,
    status: step.status,
    sequence: step.sequence,
    stop: step.stop ?? false,
    data: step.data ?? null,
  };
}

function extractResponse(workflow: StepQueueWorkflowResult): unknown {
  const final = workflow.last;
  if (!final) {
    return undefined;
  }

  const payload = final.data;
  if (payload && typeof payload === "object" && "response" in payload) {
    return (payload as Record<string, unknown>).response;
  }

  return undefined;
}

function normalizeSteps(value: unknown): StepQueueStepDescriptor[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized: StepQueueStepDescriptor[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const descriptor = raw as Record<string, unknown>;
    const typeRaw = descriptor.type;
    if (typeof typeRaw !== "string" || !typeRaw.trim()) {
      return null;
    }

    const payloadRaw = descriptor.payload;
    if (payloadRaw !== undefined && (typeof payloadRaw !== "object" || payloadRaw === null)) {
      return null;
    }

    normalized.push({
      type: typeRaw,
      payload: payloadRaw as Record<string, unknown> | undefined,
      stopOnSuccess: typeof descriptor.stopOnSuccess === "boolean" ? descriptor.stopOnSuccess : undefined,
      optional: typeof descriptor.optional === "boolean" ? descriptor.optional : undefined,
    });
  }

  return normalized;
}

export function createExecuteRouter({ stepQueue }: ExecuteRouterDeps): Router {
  const router = Router();

  router.post("/execute", async (req, res) => {
    const executionId = randomUUID();
    const instance = req.originalUrl || req.url || "/execute";
    const steps = normalizeSteps((req.body as { steps?: unknown })?.steps);
    if (!steps || steps.length === 0) {
      respondWithProblem(res, 400, "BadRequest", "steps array with at least one entry is required", instance);
      return;
    }

    const sessionIdRaw = (req.body as { sessionId?: unknown })?.sessionId;
    const sessionId = typeof sessionIdRaw === "string" && sessionIdRaw.trim() ? sessionIdRaw.trim() : executionId;

    const record = createExecution(executionId, {
      status: "running",
      route: "POST /execute",
      input: req.body,
      logs: [],
    });

    const serializedSteps: SerializedStepLog[] = [];

    let workflow: Promise<StepQueueWorkflowResult>;
    try {
      workflow = stepQueue.runWorkflow(sessionId, steps, {
        onStep(step) {
          serializedSteps.push(serializeStep(step));
          updateExecution(executionId, { status: "running", logs: serializedSteps.slice() });
        },
      });
    } catch (error) {
      failExecution(executionId, error);
      respondWithProblem(res, 502, "StepQueueUnavailable", "Failed to start execution", instance, {
        executionId,
      });
      return;
    }

    void workflow
      .then(result => {
        try {
          const responsePayload = extractResponse(result);
          if (responsePayload === undefined) {
            throw new Error("Execution pipeline did not produce a response payload");
          }
          completeExecution(executionId, { output: responsePayload, logs: serializedSteps.slice() });
        } catch (error) {
          failExecution(executionId, error);
        }
      })
      .catch(error => {
        failExecution(executionId, error);
      });

    const location = `/executions/${executionId}`;

    res
      .status(202)
      .setHeader("Location", location)
      .json({
        executionId,
        status: record.status,
        location,
      });
  });

  return router;
}
