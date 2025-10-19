import { Router, type Request, type Response } from "express";

import { multiTurnRepair, type MultiTurnContext } from "../../../../src/repair/multiTurnRepair.js";
import { repairOnce, type RepairOnceArgs, type RepairOutcome } from "../../../../src/repair/repairOnce.js";
import type { RunResult } from "../../../../src/contracts/validators.js";
import type { RepairHistory } from "../../../../src/contracts/repairHistoryValidator.js";
import type { ExecutorFile } from "../../../../src/executor/types.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

interface MultiTurnRequestBody {
  mode?: "multi";
  context?: unknown;
}

interface SingleAttemptRequestBody {
  mode: "single";
  args?: unknown;
}

type RepairRequestBody = MultiTurnRequestBody | SingleAttemptRequestBody;

type ValidationError = { pointer: string; detail: string };

const RUN_STATUSES = new Set<RunResult["status"]>(["pass", "fail", "error"]);

function getInstance(req: Request): string {
  return req.originalUrl || req.url || "/repair";
}

function isRunResult(value: unknown): value is RunResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const status = candidate.status;
  return (
    typeof status === "string" &&
    RUN_STATUSES.has(status as RunResult["status"]) &&
    typeof candidate.passCount === "number" &&
    typeof candidate.failCount === "number" &&
    typeof candidate.durationMs === "number" &&
    typeof candidate.logsPath === "string" &&
    typeof candidate.timestamp === "string"
  );
}

function isExecutorFile(value: unknown): value is ExecutorFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.path === "string" && typeof candidate.contents === "string";
}

function isMultiTurnContext(value: unknown): value is MultiTurnContext {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const generatedFiles = candidate.generatedFiles;
  return (
    typeof candidate.projectPath === "string" &&
    typeof candidate.originalPrompt === "string" &&
    Array.isArray(generatedFiles) &&
    generatedFiles.every(file => typeof file === "string") &&
    isRunResult(candidate.initialTestResult) &&
    (candidate.projectSlug === undefined || typeof candidate.projectSlug === "string") &&
    (candidate.sessionId === undefined || typeof candidate.sessionId === "string")
  );
}

function isRepairOnceArgs(value: unknown): value is RepairOnceArgs {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const originalFiles = candidate.originalFiles;
  return (
    typeof candidate.projectRoot === "string" &&
    typeof candidate.projectSlug === "string" &&
    typeof candidate.prompt === "string" &&
    isRunResult(candidate.failure) &&
    Array.isArray(originalFiles) &&
    originalFiles.every(isExecutorFile) &&
    (candidate.sessionId === undefined || typeof candidate.sessionId === "string")
  );
}

function isSingleAttemptRequest(body: RepairRequestBody): body is SingleAttemptRequestBody {
  return (body as SingleAttemptRequestBody).mode === "single";
}

function respondValidationError(res: Response, instance: string, detail: string, errors: ValidationError[]): void {
  respondWithProblem(res, 400, "Bad Request", detail, instance, { errors });
}

export function createRepairRouter(): Router {
  const router = Router();

  router.post("/repair", async (req: Request, res: Response) => {
    const instance = getInstance(req);
    const body = (req.body ?? {}) as RepairRequestBody;

    if (isSingleAttemptRequest(body)) {
      if (!isRepairOnceArgs(body.args)) {
        respondValidationError(res, instance, "Invalid repairOnce payload", [
          { pointer: "/args", detail: "Expected repairOnce arguments" },
        ]);
        return;
      }

      try {
        const outcome: RepairOutcome = await repairOnce(body.args);
        res.json({ outcome });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "repairOnce failed";
        respondWithProblem(res, 500, "Internal Server Error", message, instance);
        return;
      }
    }

    if (!isMultiTurnContext((body as MultiTurnRequestBody).context)) {
      respondValidationError(res, instance, "Invalid multi-turn repair payload", [
        { pointer: "/context", detail: "Expected multi-turn repair context" },
      ]);
      return;
    }

    try {
      const history: RepairHistory = await multiTurnRepair((body as MultiTurnRequestBody).context as MultiTurnContext);
      res.json({ history });
    } catch (error) {
      const message = error instanceof Error ? error.message : "multiTurnRepair failed";
      respondWithProblem(res, 500, "Internal Server Error", message, instance);
    }
  });

  return router;
}
