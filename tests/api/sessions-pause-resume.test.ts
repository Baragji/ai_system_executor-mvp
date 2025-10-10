import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { app, __orchestratorTest, __progressTest } from "../../src/server.js";

const CHECKPOINT_DIR = path.resolve(".automation", "checkpoints");

async function resetCheckpoints(): Promise<void> {
  await fs.rm(CHECKPOINT_DIR, { recursive: true, force: true });
}

describe("session pause/resume APIs", () => {
  beforeEach(async () => {
    await resetCheckpoints();
    __progressTest.clear();
    __orchestratorTest.clear();
  });

  afterEach(async () => {
    await resetCheckpoints();
    __progressTest.clear();
    __orchestratorTest.clear();
  });

  it("pauses a session and persists pending questions", async () => {
    const sessionId = "session-001";
    const machine = __orchestratorTest.ensure(sessionId);
    machine.transition("PLANNING");
    machine.transition("GENERATING");

    __progressTest.set(sessionId, {
      stage: "generating",
      progress: 42,
      updatedAt: Date.now(),
      done: false,
      state: machine.state,
      paused: false
    });

    const pauseResponse = await request(app)
      .post(`/api/sessions/${sessionId}/pause`)
      .send({
        reason: "Need clarification",
        questions: [
          { id: "tech", question: "Which tech stack should we target?", type: "AMBIGUITY" }
        ]
      });

    expect(pauseResponse.status).toBe(201);
    expect(pauseResponse.body?.checkpoint?.state).toBe("PAUSED");
    expect(pauseResponse.body?.checkpoint?.payload?.pendingQuestions).toHaveLength(1);

    const snapshot = await request(app).get(`/api/progress/snapshot/${sessionId}`);
    expect(snapshot.status).toBe(200);
    expect(snapshot.body.paused).toBe(true);
    expect(snapshot.body.state).toBe("PAUSED");
    expect(snapshot.body.questions).toHaveLength(1);
  });

  it("resumes a paused session when answers provided", async () => {
    const sessionId = "session-002";
    const machine = __orchestratorTest.ensure(sessionId);
    machine.transition("PLANNING");
    machine.transition("GENERATING");

    __progressTest.set(sessionId, {
      stage: "generating",
      progress: 55,
      updatedAt: Date.now(),
      done: false,
      state: machine.state,
      paused: false
    });

    const pauseResponse = await request(app)
      .post(`/api/sessions/${sessionId}/pause`)
      .send({
        questions: [{ question: "Provide API contract", type: "AMBIGUITY" }]
      });

    expect(pauseResponse.status).toBe(201);
    const questions = pauseResponse.body?.checkpoint?.payload?.pendingQuestions ?? [];
    expect(Array.isArray(questions)).toBe(true);
    const questionId = questions[0]?.id;
    expect(questionId).toBeTruthy();

    const resumeResponse = await request(app)
      .post(`/api/sessions/${sessionId}/resume`)
      .send({
        answers: [{ questionId, value: "Use REST with JSON responses" }]
      });

    expect(resumeResponse.status).toBe(200);
    expect(resumeResponse.body?.answeredQuestions).toHaveLength(1);
    expect(resumeResponse.body?.checkpoint?.state).toBe("GENERATING");

    const snapshot = await request(app).get(`/api/progress/snapshot/${sessionId}`);
    expect(snapshot.status).toBe(200);
    expect(snapshot.body.paused).toBe(false);
    expect(snapshot.body.questions).toHaveLength(0);
    expect(snapshot.body.state).toBe("GENERATING");
  });

  it("rejects resume when missing answers", async () => {
    const sessionId = "session-003";
    const machine = __orchestratorTest.ensure(sessionId);
    machine.transition("PLANNING");
    machine.transition("GENERATING");

    __progressTest.set(sessionId, {
      stage: "generating",
      progress: 10,
      updatedAt: Date.now(),
      done: false,
      state: machine.state,
      paused: false
    });

    const pauseResponse = await request(app)
      .post(`/api/sessions/${sessionId}/pause`)
      .send({ questions: [{ question: "Need budget approval", type: "BUDGET_RISK" }] });

    expect(pauseResponse.status).toBe(201);

    const resumeResponse = await request(app)
      .post(`/api/sessions/${sessionId}/resume`)
      .send({ answers: [] });

    expect(resumeResponse.status).toBe(400);
    expect(resumeResponse.body?.error).toBeDefined();
  });

  it("returns 409 when pausing an already paused session", async () => {
    const sessionId = "session-004";
    const machine = __orchestratorTest.ensure(sessionId);
    machine.transition("PLANNING");
    machine.transition("GENERATING");

    __progressTest.set(sessionId, {
      stage: "generating",
      progress: 70,
      updatedAt: Date.now(),
      done: false,
      state: machine.state,
      paused: false
    });

    const firstPause = await request(app)
      .post(`/api/sessions/${sessionId}/pause`)
      .send({ questions: [{ question: "First question", type: "AMBIGUITY" }] });

    expect(firstPause.status).toBe(201);

    const secondPause = await request(app)
      .post(`/api/sessions/${sessionId}/pause`)
      .send({ questions: [{ question: "Second question", type: "AMBIGUITY" }] });

    expect(secondPause.status).toBe(409);
  });
});
