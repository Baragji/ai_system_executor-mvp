import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { app, __progressTest } from "../../src/server.js";

describe("progress workflow metadata", () => {
  const sessionId = "wf-test-session";

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    __progressTest.clear();
    await __progressTest.ensureMetadata(sessionId);
  });

  afterEach(() => {
    __progressTest.clear();
  });

  it("includes workflowMetadata in snapshot responses", async () => {
    const cached = await __progressTest.ensureMetadata(sessionId);
    const seeded = {
      ...__progressTest.snapshot(sessionId),
      stage: "planning" as const,
      progress: 42,
      updatedAt: Date.now(),
      workflowMetadata: cached
    };
    __progressTest.set(sessionId, seeded);

    const res = await request(app).get(`/api/progress/snapshot/${sessionId}`).expect(200);
    expect(res.body).toHaveProperty("workflowMetadata");
    const payload = res.body.workflowMetadata;
    expect(payload).toMatchObject({
      phase: expect.objectContaining({ id: cached.phase.id }),
      humanSummary: expect.any(String),
      suggestedNextAction: expect.objectContaining({ action: cached.suggestedNextAction.action })
    });
    expect(Array.isArray(payload.pendingTasks)).toBe(true);
    expect(Array.isArray(payload.uncommittedChanges)).toBe(true);
  });

  it("hydrates workflow metadata when deriving orchestration snapshots", async () => {
    const snapshot = __progressTest.snapshot(sessionId);
    expect(snapshot.workflowMetadata).toBeTruthy();
    expect(snapshot.workflowMetadata?.phase.id).toBeDefined();
  });
});
