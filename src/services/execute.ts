import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import slugify from "slugify";

import { respondWithProblem } from "../middleware/problemDetails.js";
import { buildExecutionId, runWithLangGraph } from "../orchestrator/graph.js";
import { createExecution, failExecution } from "../orchestrator/executionsStore.js";
import { deriveDeterministicSessionId, hashToSeedInt } from "../orchestrator/replay.js";
import { createAbortSignal, cleanupAbortSignal, PausedError } from "../orchestrator/abortSignal.js";
import type { ClarificationResponse, ClarificationQuestion } from "../clarification/types.js";
import { validateClarificationResponse } from "../contracts/validators.js";
import { augmentPrompt } from "../clarification/augmentPrompt.js";
import { detectMissing } from "../clarification/detectMissing.js";
import { generateQuestions } from "../clarification/generateQuestions.js";
import type { StepDescriptor } from "../orchestrator/stepQueue.js";
import type { SingleExecutionOptions, ExecutorSuccessResponse } from "../orchestrator/executionTypes.js";
import type { StepQueue } from "../orchestrator/stepQueue.js";

// Local copy of payload types to avoid circular deps
type PlanStepPayload = {
  systemPrompt: string;
  effectivePrompt: string;
  originalPrompt: string;
  clarifications?: ClarificationResponse;
  clarificationsUsed: boolean;
  clarificationQuestions: ClarificationQuestion[];
  clarificationAsked: boolean;
  projectNameInput: string;
  queueMetadata?: Record<string, unknown>;
};

type SingleStepPayload = {
  singleOptions: SingleExecutionOptions;
};

function isComplexPrompt(prompt: string, clarifications?: ClarificationResponse): boolean {
  const normalized = prompt.toLowerCase();
  const featureIndicators = [
    " and ",
    " with ",
    "feature",
    "module",
    "api",
    "database",
    "auth",
    "dashboard",
    "workflow"
  ];
  const bulletLike = /\n-\s|\n\d+\./.test(prompt);
  const multipleSentences = prompt.split(/[.!?]/).filter(chunk => chunk.trim().length > 0).length >= 2;
  if (clarifications && clarifications.answers.length > 0) return true;
  if (prompt.length > 180 || bulletLike || multipleSentences) return true;
  return featureIndicators.some(ind => normalized.includes(ind));
}

export type ExecuteDeps = {
  setProgress: (sessionId: string, stage: string, progress: number, data?: Record<string, unknown>, done?: boolean) => void;
  ensureOrchestrationSession: (sessionId: string) => { originalPrompt?: string; effectivePrompt?: string; projectName?: string };
  consumeClarificationQuestions: (prompt: string) => ClarificationQuestion[] | undefined;
  captureFixture: (sessionId: string | undefined, slug: string, relPath: string, data: unknown) => Promise<void>;
  stepQueue: StepQueue;
};

export function makeExecuteHandler(deps: ExecuteDeps) {
  const { setProgress, ensureOrchestrationSession, consumeClarificationQuestions, captureFixture, stepQueue } = deps;

  return async function executeHandler(req: Request, res: Response): Promise<void> {
    const instance = req.originalUrl || req.url || "/api/execute";
    const runtime = (process.env.AGENTS_RUNTIME || "").toLowerCase();
    const useLangGraph = runtime === "langgraph";

    // DIAGNOSTIC: Log which runtime path is chosen
    console.log(`[/api/execute] runtime=${useLangGraph ? "langgraph" : "stepqueue"}`);

    const providedSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const deterministic = req.body?.deterministic === true;
    const seedRaw = typeof req.body?.seed === "string" ? req.body.seed.trim() : "";
    const seed = seedRaw || (deterministic ? "default" : "");
    const sessionId = providedSessionId || (deterministic ? deriveDeterministicSessionId(String(req.body?.prompt ?? ""), seed) : randomUUID());
    const numericSeed = deterministic
      ? hashToSeedInt(String(req.body?.prompt ?? ""), seed)
      : Math.floor((Date.now() % 100000) / 10);
    const wantsSse = !useLangGraph && typeof req.headers.accept === "string" && req.headers.accept.includes("text/event-stream");
    let sseStarted = false;
    let executionId: string | null = null;
    let delegatedToLangGraph = false;

    res.setHeader("x-executor-session", sessionId);

    // Best-effort: ensure checkpoint root exists to avoid rare ENOENT under concurrency in tests
    try {
      await fs.mkdir(path.resolve(".automation", "checkpoints", "step-workflows"), { recursive: true });
    } catch {
      // ignore
    }

    const ensureSse = () => {
      if (!wantsSse || sseStarted) {
        return;
      }
      sseStarted = true;
      res.status(202);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
    };

    const sendSse = (event: string, data: unknown) => {
      if (!wantsSse) {
        return;
      }
      ensureSse();
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const closeSse = () => {
      if (!wantsSse) {
        return;
      }
      ensureSse();
      res.end();
    };

    try {
      createAbortSignal(sessionId);

      setProgress(sessionId, "analyzing", 10);

      const promptRaw = req.body?.prompt;
      const originalPrompt: string = promptRaw === undefined ? "" : promptRaw.toString();
      const promptForValidation = originalPrompt.trim();
      const projectNameRaw: string | undefined = req.body?.projectName;
      if (!promptForValidation || promptForValidation.length < 3) {
        respondWithProblem(res, 400, "BadRequest", "prompt required", instance);
        return;
      }

      if (useLangGraph) {
        executionId = buildExecutionId(sessionId || undefined);
      }

      let clarificationsUsed = false;
      let clarifications: ClarificationResponse | undefined;
      if (req.body?.clarifications !== undefined) {
        const validation = validateClarificationResponse(req.body.clarifications);
        if (!validation.ok) {
          respondWithProblem(res, 400, "BadRequest", "invalid clarifications", instance, {
            details: validation.errors
          });
          return;
        }
        clarifications = validation.value;
      }

      let effectivePrompt = originalPrompt;
      if (clarifications) {
        const augmented = augmentPrompt(originalPrompt, clarifications);
        if (augmented !== originalPrompt) {
          clarificationsUsed = true;
          effectivePrompt = augmented;
        }
      }

      await captureFixture(
        sessionId,
        slugify(projectNameRaw || "session", { lower: true, strict: true }) || "session",
        "clarify.json",
        {
          originalPrompt,
          effectivePrompt,
          clarifications,
          deterministic: Boolean(deterministic),
          seed: seed || undefined
        }
      );

      const systemPrompt = await fs.readFile("src/executor/systemPrompt.md", "utf-8");
      const projectNameInput = typeof projectNameRaw === "string" ? projectNameRaw.trim() : "";

      const session = sessionId ? ensureOrchestrationSession(sessionId) : undefined;
      if (session) {
        session.originalPrompt = originalPrompt;
        session.effectivePrompt = effectivePrompt;
        session.projectName = projectNameInput || session.projectName;
      }

      const storedQuestions = consumeClarificationQuestions(originalPrompt) ?? [];
      let clarificationQuestions = storedQuestions;
      let clarificationAsked = clarificationQuestions.length > 0;
      if (!clarificationAsked && clarifications && clarifications.answers.length > 0) {
        const missingAgain = detectMissing(originalPrompt);
        clarificationQuestions = generateQuestions(missingAgain, originalPrompt);
        clarificationAsked = clarificationQuestions.length > 0;
      }

      const queueMetadata = stepQueue.mode === "bullmq" ? { queued: true, mode: "queue" } : undefined;
      const steps: StepDescriptor[] = [];

      if (isComplexPrompt(effectivePrompt, clarifications)) {
        const planPayload: PlanStepPayload = {
          systemPrompt,
          effectivePrompt,
          originalPrompt,
          clarifications,
          clarificationsUsed,
          clarificationQuestions,
          clarificationAsked,
          projectNameInput,
          queueMetadata
        };
        steps.push({ type: "plan", payload: planPayload, stopOnSuccess: true, optional: true });
      }

      const singleOptions: SingleExecutionOptions = {
        sessionId,
        systemPrompt,
        executorPrompt: effectivePrompt,
        originalPrompt,
        projectNameHint: projectNameInput,
        clarifications,
        clarificationsUsed,
        clarificationQuestions,
        clarificationAsked,
        preserveWorkspace: false,
        tracePhase: "single"
      };
      if (queueMetadata) {
        singleOptions.progressMetadata = { ...queueMetadata };
      }
      const singlePayload: SingleStepPayload = { singleOptions };
      steps.push({ type: "single", payload: singlePayload, stopOnSuccess: true });

      if (useLangGraph && executionId) {
        const createdAt = new Date();
        const location = `/api/executions/${executionId}`;
        createExecution(executionId, {
          status: "started",
          route: "execute",
          input: {
            prompt: originalPrompt,
            effectivePrompt,
            sessionId,
            deterministic,
            seed,
            numericSeed,
            clarificationsUsed
          },
          logs: [],
          createdAt,
          updatedAt: createdAt
        });
        res
          .status(202)
          .setHeader("Location", location)
          .json({ executionId, status: "started" });
        delegatedToLangGraph = true;

        (async () => {
          try {
            await runWithLangGraph({
              executionId,
              sessionId,
              steps,
              stepQueue,
              deterministic,
              seed: numericSeed
            });
          } catch (err) {
            console.error("[/api/execute] LangGraph failure:", err);
          }
        })();
        return;
      }

      console.log(`[/api/execute] Executing via StepQueue workflow (${steps.length} steps)`);
      const workflow = await stepQueue.runWorkflow(sessionId, steps, {
        onStep: step => {
          sendSse("step", {
            sessionId,
            stepId: step.stepId,
            stepType: step.stepType,
            status: step.status,
            sequence: step.sequence,
            stop: Boolean(step.stop),
            timestamp: new Date().toISOString()
          });
        }
      });

      const finalStep = workflow.last;
      const responsePayload = finalStep?.data?.response as ExecutorSuccessResponse | undefined;
      if (!responsePayload) {
        throw new Error("Execution pipeline did not produce a response payload");
      }
      if (wantsSse) {
        sendSse("completed", { sessionId, response: responsePayload });
        closeSse();
        return;
      }
      res.json(responsePayload);
      return;
      } catch (err: unknown) {
        if (useLangGraph && executionId && !delegatedToLangGraph) {
          failExecution(executionId, err);
        }
        if (err instanceof PausedError) {
          console.log(`Execution paused for session ${err.sessionId} during ${err.phase}`);
          const workflowSteps = sessionId ? await stepQueue.getWorkflow(sessionId) : null;
          const pausedRecord = workflowSteps?.slice().reverse().find(step => step.status === "paused");
          const pausedError = err as PausedError & {
            stepId?: string;
            stepType?: string;
            sequence?: number;
          };
          const stepMeta = pausedRecord
            ? { stepId: pausedRecord.stepId, stepType: pausedRecord.stepType, sequence: pausedRecord.sequence }
            : {
                stepId: pausedError.stepId,
                stepType: pausedError.stepType,
                sequence: pausedError.sequence
              };
          const payload = {
            paused: true,
            sessionId: pausedError.sessionId,
            phase: pausedError.phase,
            message: pausedError.message,
            ...stepMeta
          };
          if (wantsSse) {
            res.status(202);
            sendSse("paused", payload);
            closeSse();
            return;
          }
          res.status(202).json(payload);
          return;
        }
      console.error(err);
      const message = err instanceof Error ? err.message : "internal error";
      if (wantsSse) {
        sendSse("error", { sessionId, message });
        closeSse();
        return;
      }
      respondWithProblem(res, 500, "InternalServerError", message, instance);
      return;
    } finally {
      if (sessionId && !delegatedToLangGraph) {
        cleanupAbortSignal(sessionId);
      }
    }
  };
}
