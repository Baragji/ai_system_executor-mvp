import type { Application, Request, Response } from "express";
import path from "node:path";

import { PausedError } from "../../orchestrator/abortSignal.js";
import type { CheckpointPayload, CheckpointRecord } from "../../orchestrator/checkpoints.js";
import type { InterruptQuestionInput } from "../../orchestrator/interrupts.js";
import {
  ResumeStateError,
  ResumeValidationError,
  type ResumeAnswer,
  type ResolvedQuestion
} from "../../orchestrator/resume.js";
import type { OrchestratorState, OrchestratorStateMachine } from "../../orchestrator/stateMachine.js";
import type { StepDescriptor, StepQueue } from "../../orchestrator/stepQueue.js";
import type {
  ResumeContextFixture,
  SingleExecutionOptions
} from "../../orchestrator/executionTypes.js";
import type { WorkspaceManifest } from "../../orchestrator/workspaceManifest.js";
import type { ResumePromptOptions } from "../../orchestrator/resumePrompt.js";
import type { OrchestrationSession, ProgressSnapshot } from "../../orchestrator/sessionStore.js";

interface PauseRequestBody {
  reason?: unknown;
  questions?: unknown;
  context?: unknown;
  payload?: unknown;
}

interface ResumeRequestBody {
  answers?: unknown;
  reason?: unknown;
  adjustment?: unknown;
}

export type SessionsDeps = {
  getProgress: (sessionId: string) => ProgressSnapshot | null;
  ensureOrchestrationSession: (sessionId: string) => OrchestrationSession;
  getOrchestrationSession: (sessionId: string) => OrchestrationSession | undefined;
  snapshotFromSession: (sessionId: string, fallback?: ProgressSnapshot | null) => ProgressSnapshot;
  stateToStage: (state: OrchestratorState) => string;
  setProgress: (
    sessionId: string,
    stage: string,
    pct: number,
    data?: Record<string, unknown>,
    done?: boolean
  ) => void;
  abortSession: (sessionId: string) => boolean;
  raiseInterrupt: (input: {
    sessionId: string;
    machine: OrchestratorStateMachine;
    reason: string;
    questions: InterruptQuestionInput[];
    machineContext?: Record<string, unknown>;
    checkpointPayload?: Omit<CheckpointPayload, "pendingQuestions">;
  }) => Promise<CheckpointRecord>;
  resumeFromCheckpoint: (
    sessionId: string,
    answers: ResumeAnswer[],
    opts: { machine: OrchestratorStateMachine; reason?: string }
  ) => Promise<{
    checkpoint: CheckpointRecord;
    answeredQuestions: ResolvedQuestion[];
    machine: OrchestratorStateMachine;
  }>;
  captureManifest: (sessionId: string, projectSlug: string) => Promise<WorkspaceManifest>;
  getManifest: (sessionId: string) => Promise<WorkspaceManifest | null>;
  buildResumePrompts: (systemPrompt: string, params: ResumePromptOptions) => { systemPrompt: string; userPrompt: string };
  normalizeInterruptQuestions: (input: unknown) => InterruptQuestionInput[];
  normalizeResumeAnswers: (input: unknown) => ResumeAnswer[];
  captureFixture: (sessionId: string | undefined, slug: string, relPath: string, data: unknown) => Promise<void>;
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  stepQueue: StepQueue;
  createAbortSignal: (sessionId: string) => void;
  cleanupAbortSignal: (sessionId: string) => void;
  readSystemPrompt: () => Promise<string>;
  resolveSessionPrompts: (
    sessionId: string,
    session: OrchestrationSession | undefined,
    projectSlug: string
  ) => Promise<{ original: string; effective?: string }>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mountSessionsRoutes(app: Application, deps: SessionsDeps): void {
  const {
    getProgress,
    ensureOrchestrationSession,
    getOrchestrationSession,
    snapshotFromSession,
    stateToStage,
    setProgress,
    abortSession,
    raiseInterrupt,
    resumeFromCheckpoint,
    captureManifest,
    getManifest,
    buildResumePrompts,
    normalizeInterruptQuestions,
    normalizeResumeAnswers,
    captureFixture,
    slugify,
    stepQueue,
    createAbortSignal,
    cleanupAbortSignal,
    readSystemPrompt,
    resolveSessionPrompts
  } = deps;

  app.post("/api/sessions/:id/pause", async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const sessionId = id.trim();
      if (!sessionId) {
        return res.status(400).json({ error: "session id required" });
      }

      const current = getProgress(sessionId);
      if (!current) {
        return res.status(404).json({ error: "session not found" });
      }

      const session = ensureOrchestrationSession(sessionId);
      if (session.paused) {
        return res.status(409).json({ error: "session already paused" });
      }

      const body = req.body as PauseRequestBody;
      const reasonRaw = typeof body?.reason === "string" ? body.reason.trim() : "";
      const reason = reasonRaw || "Manual pause requested";

      const normalizedQuestions = normalizeInterruptQuestions(body?.questions);
      const defaultQuestion: InterruptQuestionInput = {
        question: "Please provide guidance to continue execution.",
        type: "AMBIGUITY"
      };
      const questions = normalizedQuestions.length > 0 ? normalizedQuestions : [defaultQuestion];

      let machineContext: Record<string, unknown> | undefined;
      if (body?.context !== undefined) {
        if (body.context === null || isPlainObject(body.context)) {
          machineContext = (body.context as Record<string, unknown>) ?? undefined;
        } else {
          return res.status(400).json({ error: "context must be a plain object" });
        }
      }

      let checkpointPayload: Omit<CheckpointPayload, "pendingQuestions"> | undefined;
      if (body?.payload !== undefined) {
        if (!isPlainObject(body.payload)) {
          return res.status(400).json({ error: "payload must be a plain object" });
        }
        checkpointPayload = body.payload as Omit<CheckpointPayload, "pendingQuestions">;
      }

      if (session.projectSlug) {
        checkpointPayload = {
          ...(checkpointPayload ?? {}),
          executor: {
            ...(checkpointPayload?.executor ?? {}),
            projectSlug: session.projectSlug
          }
        };
      }

      const aborted = abortSession(sessionId);
      console.log(`[Pause] Session ${sessionId} abort signal sent: ${aborted}`);

      const checkpoint = await raiseInterrupt({
        sessionId,
        machine: session.machine,
        reason,
        questions,
        machineContext,
        checkpointPayload
      });

      session.paused = true;
      session.questions = checkpoint.payload?.pendingQuestions ?? [];
      session.checkpointUpdatedAt = checkpoint.updatedAt;

      if (session.projectSlug) {
        try {
          await captureManifest(sessionId, session.projectSlug);
        } catch (error) {
          console.warn(`[Pause] Failed to capture manifest for session ${sessionId}:`, error);
        }
      }

      const snapshot = snapshotFromSession(sessionId, current);
      const stage = stateToStage(session.machine.state);
      const progress = snapshot.progress;
      const data = snapshot.data;
      setProgress(sessionId, stage, progress, data, false);

      return res.status(201).json({ checkpoint });
    } catch (error) {
      if (error instanceof Error && /Cannot raise interrupt/.test(error.message)) {
        return res.status(409).json({ error: error.message });
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: "unknown error" });
    }
  });

  app.post("/api/sessions/:id/resume", async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const sessionId = id.trim();
      if (!sessionId) {
        return res.status(400).json({ error: "session id required" });
      }

      const session = getOrchestrationSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "session not found" });
      }

      const body = req.body as ResumeRequestBody;
      const answers = normalizeResumeAnswers(body?.answers);
      if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: "answers must include at least one entry" });
      }

      const reasonRaw = typeof body?.reason === "string" ? body.reason.trim() : "";
      const adjustmentRaw = typeof body?.adjustment === "string" ? body.adjustment.trim() : "";

      const result = await resumeFromCheckpoint(sessionId, answers, {
        machine: session.machine,
        reason: reasonRaw || undefined
      });

      session.paused = false;
      session.questions = [];
      session.checkpointUpdatedAt = result.checkpoint.updatedAt;
      session.machine = result.machine;

      const resumedSlug = result.checkpoint.payload?.executor?.projectSlug;
      if (typeof resumedSlug === "string" && resumedSlug.trim()) {
        session.projectSlug = resumedSlug.trim();
      }

      const fallbackSlug = slugify(sessionId, { lower: true, strict: true }) || sessionId;
      const projectSlug = (session.projectSlug ?? resumedSlug ?? fallbackSlug).trim();
      session.projectSlug = projectSlug;

      const manifest = await getManifest(sessionId);
      const systemPrompt = await readSystemPrompt();
      const promptSnapshot = await resolveSessionPrompts(sessionId, session, projectSlug);
      const prompts = buildResumePrompts(systemPrompt, {
        projectSlug,
        originalPrompt: promptSnapshot.original,
        effectivePrompt: promptSnapshot.effective,
        adjustment: adjustmentRaw,
        checkpoint: result.checkpoint,
        answeredQuestions: result.answeredQuestions,
        manifest
      });

      session.effectivePrompt = prompts.userPrompt;

      const fallbackSnapshot = getProgress(sessionId);
      const snapshot = snapshotFromSession(sessionId, fallbackSnapshot);
      const data = {
        ...(snapshot.data ?? {}),
        resume: true,
        ...(adjustmentRaw ? { adjustment: adjustmentRaw } : {})
      };
      const stage = stateToStage(session.machine.state);
      setProgress(sessionId, stage, snapshot.progress, data, false);

      const resumeFixture: ResumeContextFixture = {
        adjustment: adjustmentRaw || undefined,
        answeredQuestions: result.answeredQuestions.map(item => ({
          id: item.id,
          question: item.question,
          answer: item.answer
        })),
        manifestSummary: manifest?.summary
          ? {
              totalFiles: manifest.summary.totalFiles,
              totalSize: manifest.summary.totalSize,
              topFiles: manifest.summary.topFiles.slice(0, 10)
            }
          : null,
        checkpoint: { state: result.checkpoint.state, updatedAt: result.checkpoint.updatedAt },
        prompt: { system: prompts.systemPrompt, user: prompts.userPrompt }
      };

      const progressMetadata: Record<string, unknown> = {
        resume: true,
        ...(adjustmentRaw ? { adjustment: adjustmentRaw } : {})
      };

      const providerConfigured = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

      if (!providerConfigured) {
        try {
          await captureFixture(sessionId, projectSlug, path.join("resume", "context.json"), resumeFixture);
        } catch (error) {
          console.warn("[Resume] Failed to persist resume context without provider:", error);
        }
        console.warn(`[Resume] No LLM provider configured; skipping automatic resume for ${sessionId}`);
      } else {
        createAbortSignal(sessionId);

        const resumeOptions: SingleExecutionOptions = {
          sessionId,
          systemPrompt: prompts.systemPrompt,
          executorPrompt: prompts.userPrompt,
          originalPrompt: promptSnapshot.original,
          projectNameHint: session.projectName ?? projectSlug,
          clarifications: undefined,
          clarificationsUsed: false,
          clarificationQuestions: [],
          clarificationAsked: false,
          preserveWorkspace: true,
          slugOverride: projectSlug,
          resumeFixture,
          tracePhase: "resume",
          progressMetadata
        };

        if (stepQueue.mode === "bullmq") {
          resumeOptions.progressMetadata = { ...progressMetadata, queued: true, mode: "queue" };
        }

        const plannedSteps = await stepQueue.getPlannedSteps(sessionId);

        type PlanEntry = {
          order: number;
          stepType: string;
          optional: boolean;
          stopOnSuccess: boolean;
          payload?: Record<string, unknown>;
        };

        const orderedPlan: PlanEntry[] = plannedSteps && plannedSteps.length > 0
          ? plannedSteps
              .slice()
              .sort((a, b) => a.order - b.order)
              .map(entry => ({
                order: entry.order,
                stepType: entry.stepType,
                optional: entry.optional,
                stopOnSuccess: entry.stopOnSuccess,
                payload: entry.payload
                  ? (JSON.parse(JSON.stringify(entry.payload)) as Record<string, unknown>)
                  : undefined
              }))
          : [
              {
                order: 0,
                stepType: "single",
                optional: false,
                stopOnSuccess: true,
                payload: { singleOptions: resumeOptions }
              }
            ];

        const descriptors: StepDescriptor[] = orderedPlan.map(entry => {
          const basePayload = entry.payload ? { ...entry.payload } : undefined;
          if (entry.stepType === "single") {
            const payload: Record<string, unknown> = basePayload ? { ...basePayload } : {};
            payload.singleOptions = resumeOptions;
            return {
              type: entry.stepType as StepDescriptor["type"],
              payload,
              optional: entry.optional,
              stopOnSuccess: entry.stopOnSuccess
            };
          }
          return {
            type: entry.stepType as StepDescriptor["type"],
            payload: basePayload,
            optional: entry.optional,
            stopOnSuccess: entry.stopOnSuccess
          };
        });

        stepQueue
          .runWorkflow(sessionId, descriptors, { resume: true })
          .catch(error => {
            if (error instanceof PausedError) {
              return;
            }
            const message = error instanceof Error ? error.message : "resume execution failed";
            console.error(`[Resume] Execution failed for session ${sessionId}:`, error);
            setProgress(sessionId, "finalizing", 100, { resume: true, error: message }, true);
          })
          .finally(() => {
            cleanupAbortSignal(sessionId);
          });
      }

      return res.json({
        checkpoint: result.checkpoint,
        answeredQuestions: result.answeredQuestions,
        resumed: true
      });
    } catch (error) {
      if (error instanceof ResumeValidationError) {
        return res.status(400).json({ error: error.message, issues: error.issues });
      }
      if (error instanceof ResumeStateError) {
        return res.status(409).json({ error: error.message });
      }
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(500).json({ error: "unknown error" });
    }
  });
}
