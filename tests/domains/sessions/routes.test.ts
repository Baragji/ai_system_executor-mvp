import express from "express";
import type { Application } from "express";
import request from "supertest";
import path from "node:path";

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { OrchestratorStateMachine } from "../../../src/orchestrator/stateMachine.js";
import { PausedError } from "../../../src/orchestrator/abortSignal.js";
import {
  ResumeStateError,
  ResumeValidationError
} from "../../../src/orchestrator/resume.js";
import type { CheckpointPayload } from "../../../src/orchestrator/checkpoints.js";
import type { SessionsDeps, OrchestrationSession, ProgressSnapshot } from "../../../src/domains/sessions/routes.ts";
import { mountSessionsRoutes } from "../../../src/domains/sessions/routes.ts";

function createSession(): OrchestrationSession {
  return {
    machine: new OrchestratorStateMachine(),
    paused: false,
    questions: [],
    projectSlug: undefined,
    checkpointUpdatedAt: undefined,
    originalPrompt: "orig",
    effectivePrompt: "eff",
    projectName: "proj"
  } satisfies OrchestrationSession;
}

function createProgress(): ProgressSnapshot {
  return {
    stage: "generating",
    progress: 42,
    updatedAt: Date.now(),
    done: false,
    state: "GENERATING",
    paused: false,
    questions: []
  } satisfies ProgressSnapshot;
}

function createStepQueue(mode: "inline" | "bullmq" = "inline") {
  const queue = {
    mode,
    getPlannedSteps: vi.fn().mockResolvedValue(undefined),
    runWorkflow: vi.fn().mockResolvedValue(undefined)
  };
  return queue as unknown as SessionsDeps["stepQueue"];
}

function createDeps(overrides: Partial<SessionsDeps> = {}) {
  const session = createSession();
  const progress = createProgress();

  const getProgress = vi.fn<Parameters<SessionsDeps["getProgress"]>, ReturnType<SessionsDeps["getProgress"]>>()
    .mockReturnValue(progress);
  const snapshotFromSession = vi.fn<Parameters<SessionsDeps["snapshotFromSession"]>, ReturnType<SessionsDeps["snapshotFromSession"]>>()
    .mockImplementation((_, fallback) => fallback ?? { ...progress });
  const stateToStage = vi.fn<SessionsDeps["stateToStage"]>().mockImplementation(state => state.toLowerCase());
  const setProgress = vi.fn<SessionsDeps["setProgress"]>();
  const abortSession = vi.fn<SessionsDeps["abortSession"]>().mockReturnValue(true);
  const checkpointPayload: CheckpointPayload = {
    pendingQuestions: [
      { id: "pq1", question: "Question?", type: "AMBIGUITY" }
    ]
  };
  const interruptResult = {
    state: "PAUSED",
    updatedAt: "2024-01-01T00:00:00.000Z",
    payload: checkpointPayload
  };
  const raiseInterrupt = vi.fn<SessionsDeps["raiseInterrupt"]>().mockResolvedValue(interruptResult);
  const resumeResult = {
    checkpoint: {
      state: "PAUSED",
      updatedAt: "2024-01-02T00:00:00.000Z",
      payload: { executor: { projectSlug: "from-checkpoint" } }
    },
    answeredQuestions: [
      { id: "a1", question: "Q1", answer: "A1" }
    ],
    machine: session.machine
  };
  const resumeFromCheckpoint = vi.fn<SessionsDeps["resumeFromCheckpoint"]>().mockResolvedValue(resumeResult);
  const captureManifest = vi.fn<SessionsDeps["captureManifest"]>().mockResolvedValue(undefined);
  const getManifest = vi.fn<SessionsDeps["getManifest"]>().mockResolvedValue(null);
  const buildResumePrompts = vi.fn<SessionsDeps["buildResumePrompts"]>().mockReturnValue({
    systemPrompt: "sys",
    userPrompt: "user"
  });
  const normalizeInterruptQuestions = vi.fn<SessionsDeps["normalizeInterruptQuestions"]>().mockReturnValue([]);
  const normalizeResumeAnswers = vi.fn<SessionsDeps["normalizeResumeAnswers"]>().mockReturnValue([
    { questionId: "a1", value: "value" }
  ]);
  const captureFixture = vi.fn<SessionsDeps["captureFixture"]>().mockResolvedValue(undefined);
  const slugify = vi.fn<SessionsDeps["slugify"]>().mockImplementation((value: string) => value);
  const stepQueue = createStepQueue();
  const createAbortSignal = vi.fn<SessionsDeps["createAbortSignal"]>();
  const cleanupAbortSignal = vi.fn<SessionsDeps["cleanupAbortSignal"]>();
  const readSystemPrompt = vi.fn<SessionsDeps["readSystemPrompt"]>().mockResolvedValue("system prompt");
  const resolveSessionPrompts = vi.fn<SessionsDeps["resolveSessionPrompts"]>().mockResolvedValue({
    original: "orig",
    effective: "eff"
  });

  const deps: SessionsDeps = {
    getProgress,
    ensureOrchestrationSession: vi.fn().mockReturnValue(session),
    getOrchestrationSession: vi.fn().mockReturnValue(session),
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
  } satisfies SessionsDeps;

  Object.assign(deps, overrides);

  return {
    deps,
    session,
    progress,
    mocks: {
      getProgress: deps.getProgress as ReturnType<typeof vi.fn>,
      snapshotFromSession: deps.snapshotFromSession as ReturnType<typeof vi.fn>,
      stateToStage: deps.stateToStage as ReturnType<typeof vi.fn>,
      setProgress: deps.setProgress as ReturnType<typeof vi.fn>,
      abortSession: deps.abortSession as ReturnType<typeof vi.fn>,
      raiseInterrupt: deps.raiseInterrupt as ReturnType<typeof vi.fn>,
      resumeFromCheckpoint: deps.resumeFromCheckpoint as ReturnType<typeof vi.fn>,
      captureManifest: deps.captureManifest as ReturnType<typeof vi.fn>,
      getManifest: deps.getManifest as ReturnType<typeof vi.fn>,
      buildResumePrompts: deps.buildResumePrompts as ReturnType<typeof vi.fn>,
      normalizeInterruptQuestions: deps.normalizeInterruptQuestions as ReturnType<typeof vi.fn>,
      normalizeResumeAnswers: deps.normalizeResumeAnswers as ReturnType<typeof vi.fn>,
      captureFixture: deps.captureFixture as ReturnType<typeof vi.fn>,
      slugify: deps.slugify as ReturnType<typeof vi.fn>,
      stepQueue: deps.stepQueue as unknown,
      createAbortSignal: deps.createAbortSignal as ReturnType<typeof vi.fn>,
      cleanupAbortSignal: deps.cleanupAbortSignal as ReturnType<typeof vi.fn>,
      readSystemPrompt: deps.readSystemPrompt as ReturnType<typeof vi.fn>,
      resolveSessionPrompts: deps.resolveSessionPrompts as ReturnType<typeof vi.fn>,
      interruptResult,
      resumeResult
    }
  };
}

function createApp(deps: SessionsDeps): Application {
  const app = express();
  app.use(express.json());
  mountSessionsRoutes(app, deps);
  return app;
}

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("POST /api/sessions/:id/pause", () => {
  it("pauses a session and persists checkpoint", async () => {
    const { deps, session, mocks, progress } = createDeps();
    mocks.getManifest.mockResolvedValueOnce({
      summary: {
        totalFiles: 11,
        totalSize: 256,
        topFiles: Array.from({ length: 12 }, (_, index) => `file${index}`)
      }
    });
    session.projectSlug = "proj";
    const app = createApp(deps);

    const response = await request(app)
      .post("/api/sessions/abc/pause")
      .send({ reason: "Need pause" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ checkpoint: mocks.interruptResult });
    expect(mocks.abortSession).toHaveBeenCalledWith("abc");
    expect(mocks.raiseInterrupt).toHaveBeenCalledTimes(1);
    const interruptArgs = mocks.raiseInterrupt.mock.calls[0][0];
    expect(interruptArgs.machine).toBe(session.machine);
    expect(interruptArgs.checkpointPayload?.executor?.projectSlug).toBe("proj");
    expect(interruptArgs.questions).toEqual([
      {
        question: "Please provide guidance to continue execution.",
        type: "AMBIGUITY"
      }
    ]);
    expect(session.paused).toBe(true);
    expect(session.questions).toEqual(mocks.interruptResult.payload?.pendingQuestions ?? []);
    expect(session.checkpointUpdatedAt).toBe(mocks.interruptResult.updatedAt);
    expect(mocks.captureManifest).toHaveBeenCalledWith("abc", "proj");
    expect(mocks.snapshotFromSession).toHaveBeenCalledWith("abc", progress);
    expect(mocks.stateToStage).toHaveBeenCalledWith(session.machine.state);
    const pauseStage = (mocks.stateToStage.mock.results.at(-1)?.value ?? "") as string;
    expect(mocks.setProgress).toHaveBeenCalledWith("abc", pauseStage, progress.progress, progress.data, false);
  });

  it("returns 400 when session id missing", async () => {
    const { deps } = createDeps();
    const app = createApp(deps);

    const res = await request(app).post("/api/sessions/ %20/pause").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "session id required" });
  });

  it("returns 404 when progress is absent", async () => {
    const { deps, mocks } = createDeps();
    mocks.getProgress.mockReturnValue(null);
    const app = createApp(deps);

    const res = await request(app).post("/api/sessions/abc/pause").send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "session not found" });
  });

  it("rejects when session already paused", async () => {
    const { deps, session } = createDeps();
    session.paused = true;
    const app = createApp(deps);

    const res = await request(app).post("/api/sessions/abc/pause").send({});
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "session already paused" });
  });

  it("validates context shape", async () => {
    const { deps } = createDeps();
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/pause")
      .send({ context: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "context must be a plain object" });
  });

  it("validates payload shape", async () => {
    const { deps } = createDeps();
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/pause")
      .send({ payload: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "payload must be a plain object" });
  });

  it("handles cannot raise interrupt conflict", async () => {
    const { deps, mocks } = createDeps();
    mocks.raiseInterrupt.mockRejectedValueOnce(new Error("Cannot raise interrupt: already paused"));
    const app = createApp(deps);

    const res = await request(app).post("/api/sessions/abc/pause").send({});
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Cannot raise interrupt: already paused" });
  });

  it("uses provided questions and payload when supplied", async () => {
    const { deps, mocks } = createDeps();
    const customQuestion = {
      id: "q1",
      question: "Need approval?",
      type: "APPROVAL" as const,
      metadata: { reason: "verify" }
    };
    mocks.normalizeInterruptQuestions.mockReturnValueOnce([customQuestion]);
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/pause")
      .send({ payload: { executor: { metadata: { foo: "bar" } } } });

    expect(res.status).toBe(201);
    const args = mocks.raiseInterrupt.mock.calls[0][0];
    expect(args.questions).toEqual([customQuestion]);
    expect(args.checkpointPayload).toMatchObject({ executor: { metadata: { foo: "bar" } } });
  });

  it("handles unexpected errors as bad request", async () => {
    const { deps, mocks } = createDeps();
    mocks.raiseInterrupt.mockRejectedValueOnce(new Error("boom"));
    const app = createApp(deps);

    const res = await request(app).post("/api/sessions/abc/pause").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "boom" });
  });
});

describe("POST /api/sessions/:id/resume", () => {
  it("resumes execution without provider", async () => {
    const { deps, session, mocks, progress } = createDeps();
    const capturedAt = new Date().toISOString();
    const topFiles = Array.from({ length: 12 }, (_, index) => ({
      path: `file${index}`,
      size: index + 1,
      hash: `hash-${index}`,
      modified: capturedAt
    }));
    mocks.getManifest.mockResolvedValueOnce({
      sessionId: "abc",
      projectSlug: "from-checkpoint",
      capturedAt,
      files: topFiles,
      summary: {
        totalFiles: 11,
        totalSize: 256,
        topFiles
      }
    });
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }], reason: "done" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      checkpoint: mocks.resumeResult.checkpoint,
      answeredQuestions: mocks.resumeResult.answeredQuestions,
      resumed: true
    });
    expect(session.paused).toBe(false);
    expect(session.questions).toEqual([]);
    expect(session.projectSlug).toBe("from-checkpoint");
    expect(session.effectivePrompt).toBe("user");
    expect(mocks.getManifest).toHaveBeenCalledWith("abc");
    expect(mocks.readSystemPrompt).toHaveBeenCalled();
    expect(mocks.resolveSessionPrompts).toHaveBeenCalledWith("abc", session, "from-checkpoint");
    expect(mocks.buildResumePrompts).toHaveBeenCalledWith(
      "system prompt",
      expect.objectContaining({ projectSlug: "from-checkpoint" })
    );
    const resumeStage = (mocks.stateToStage.mock.results.at(-1)?.value ?? "") as string;
    expect(mocks.setProgress).toHaveBeenCalledWith(
      "abc",
      resumeStage,
      progress.progress,
      { ...(progress.data ?? {}), resume: true },
      false
    );
    expect(mocks.captureFixture).toHaveBeenCalledWith(
      "abc",
      "from-checkpoint",
      path.join("resume", "context.json"),
      expect.objectContaining({
        prompt: { system: "sys", user: "user" },
        manifestSummary: {
          totalFiles: 11,
          totalSize: 256,
          topFiles: topFiles.slice(0, 10)
        }
      })
    );
  });

  it("uses fallback slug when checkpoint lacks slug", async () => {
    const { deps, session, mocks } = createDeps();
    mocks.resumeFromCheckpoint.mockResolvedValueOnce({
      checkpoint: {
        state: "PAUSED",
        updatedAt: "2024-01-02T00:00:00.000Z",
        payload: {}
      },
      answeredQuestions: [],
      machine: session.machine
    });
    mocks.normalizeResumeAnswers.mockReturnValueOnce([{ questionId: "x", value: "y" }]);
    mocks.slugify.mockReturnValueOnce("abc-slug");
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "x", value: "y" }], adjustment: "tweak" });

    expect(res.status).toBe(200);
    expect(session.projectSlug).toBe("abc-slug");
    const stage = (mocks.stateToStage.mock.results.at(-1)?.value ?? "") as string;
    expect(mocks.setProgress).toHaveBeenLastCalledWith(
      "abc",
      stage,
      expect.any(Number),
      expect.objectContaining({ resume: true, adjustment: "tweak" }),
      false
    );
  });

  it("handles provider configured workflow with planned steps", async () => {
    process.env.OPENAI_API_KEY = "key";
    const { deps, mocks } = createDeps({ stepQueue: createStepQueue("bullmq") });
    const stepQueue = deps.stepQueue as unknown as {
      mode: string;
      getPlannedSteps: ReturnType<typeof vi.fn>;
      runWorkflow: ReturnType<typeof vi.fn>;
    };
    stepQueue.getPlannedSteps.mockResolvedValueOnce([
      { order: 2, stepType: "single", optional: false, stopOnSuccess: true, payload: { foo: "bar" } },
      { order: 1, stepType: "custom", optional: true, stopOnSuccess: false, payload: { value: 1 } }
    ]);
    const runWorkflow = stepQueue.runWorkflow;
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }] });

    expect(res.status).toBe(200);
    expect(mocks.createAbortSignal).toHaveBeenCalledWith("abc");
    expect(stepQueue.getPlannedSteps).toHaveBeenCalledWith("abc");
    expect(runWorkflow).toHaveBeenCalledWith(
      "abc",
      [
        expect.objectContaining({ type: "custom", optional: true, stopOnSuccess: false }),
        expect.objectContaining({ type: "single", optional: false, stopOnSuccess: true })
      ],
      { resume: true }
    );
    const descriptors = runWorkflow.mock.calls[0][1] as Array<{ type: string; payload?: Record<string, unknown> }>;
    const singleDescriptor = descriptors.find(item => item.type === "single");
    expect(singleDescriptor?.payload?.singleOptions?.progressMetadata).toEqual({
      resume: true,
      queued: true,
      mode: "queue"
    });
    await new Promise(resolve => setImmediate(resolve));
    expect(mocks.cleanupAbortSignal).toHaveBeenCalledWith("abc");
  });

  it("falls back to a single step when no plan exists", async () => {
    process.env.OPENAI_API_KEY = "key";
    const { deps, mocks } = createDeps();
    const stepQueue = deps.stepQueue as unknown as {
      mode: string;
      getPlannedSteps: ReturnType<typeof vi.fn>;
      runWorkflow: ReturnType<typeof vi.fn>;
    };
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }] });

    expect(res.status).toBe(200);
    const call = stepQueue.runWorkflow.mock.calls[0];
    expect(call[0]).toBe("abc");
    const descriptors = call[1] as Array<{ type: string; payload?: Record<string, unknown> }>;
    expect(descriptors).toHaveLength(1);
    const [descriptor] = descriptors;
    expect(descriptor.type).toBe("single");
    expect(descriptor.payload?.singleOptions?.resumeFixture?.prompt.user).toBe("user");
    expect(descriptor.payload?.singleOptions?.progressMetadata).toEqual({ resume: true });
    expect(mocks.createAbortSignal).toHaveBeenCalledWith("abc");
    await new Promise(resolve => setImmediate(resolve));
    expect(mocks.cleanupAbortSignal).toHaveBeenCalledWith("abc");
  });

  it("logs and sets progress when workflow fails", async () => {
    process.env.OPENAI_API_KEY = "key";
    const error = new Error("failure");
    const { deps, mocks } = createDeps({ stepQueue: createStepQueue("inline") });
    const stepQueue = deps.stepQueue as unknown as {
      mode: string;
      getPlannedSteps: ReturnType<typeof vi.fn>;
      runWorkflow: ReturnType<typeof vi.fn>;
    };
    stepQueue.runWorkflow.mockRejectedValueOnce(error);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }] });

    expect(res.status).toBe(200);
    await new Promise(resolve => setImmediate(resolve));
    expect(errorSpy).toHaveBeenCalledWith("[Resume] Execution failed for session abc:", error);
    expect(mocks.setProgress).toHaveBeenCalledWith("abc", "finalizing", 100, { resume: true, error: "failure" }, true);
  });

  it("ignores paused errors from workflow", async () => {
    process.env.OPENAI_API_KEY = "key";
    const pausedError = new PausedError("paused");
    const { deps, mocks } = createDeps({ stepQueue: createStepQueue("inline") });
    const stepQueue = deps.stepQueue as unknown as {
      mode: string;
      getPlannedSteps: ReturnType<typeof vi.fn>;
      runWorkflow: ReturnType<typeof vi.fn>;
    };
    stepQueue.runWorkflow.mockRejectedValueOnce(pausedError);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }] });

    expect(res.status).toBe(200);
    await new Promise(resolve => setImmediate(resolve));
    expect(errorSpy).not.toHaveBeenCalled();
    expect(mocks.setProgress).not.toHaveBeenCalledWith("abc", "finalizing", 100, expect.anything(), true);
  });

  it("returns 400 when session id missing", async () => {
    const { deps } = createDeps();
    const app = createApp(deps);

    const res = await request(app).post("/api/sessions/ %20/resume").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "session id required" });
  });

  it("returns 404 when session missing", async () => {
    const { deps } = createDeps({ getOrchestrationSession: vi.fn().mockReturnValue(undefined) });
    const app = createApp(deps);

    const res = await request(app).post("/api/sessions/abc/resume").send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "session not found" });
  });

  it("requires answers", async () => {
    const { deps, mocks } = createDeps();
    mocks.normalizeResumeAnswers.mockReturnValueOnce([]);
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "answers must include at least one entry" });
  });

  it("maps validation errors", async () => {
    const { deps, mocks } = createDeps();
    mocks.resumeFromCheckpoint.mockRejectedValueOnce(new ResumeValidationError("invalid", ["issue"]));
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }] });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid", issues: ["issue"] });
  });

  it("maps resume state errors", async () => {
    const { deps, mocks } = createDeps();
    mocks.resumeFromCheckpoint.mockRejectedValueOnce(new ResumeStateError("bad state"));
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }] });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "bad state" });
  });

  it("handles generic errors", async () => {
    const { deps, mocks } = createDeps();
    mocks.resumeFromCheckpoint.mockRejectedValueOnce(new Error("boom"));
    const app = createApp(deps);

    const res = await request(app)
      .post("/api/sessions/abc/resume")
      .send({ answers: [{ questionId: "a1", value: "value" }] });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "boom" });
  });
});
