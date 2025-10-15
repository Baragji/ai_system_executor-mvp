import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { app, __progressTest } from "../../src/server.js";

describe("progress payloads", () => {
  const sessionId = "wf-test-session";

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    __progressTest.clear();
  });

  afterEach(() => {
    __progressTest.clear();
  });

  it("omits workflowMetadata in snapshot responses", async () => {
    const seeded = {
      ...__progressTest.snapshot(sessionId),
      stage: "planning" as const,
      progress: 42,
      updatedAt: Date.now()
    };
    __progressTest.set(sessionId, seeded);

    const res = await request(app).get(`/api/progress/snapshot/${sessionId}`).expect(200);
    expect(res.body).not.toHaveProperty("workflowMetadata");
  });

  it("does not include workflow metadata in orchestration snapshots", async () => {
    const snapshot = __progressTest.snapshot(sessionId);
    expect(snapshot).not.toHaveProperty("workflowMetadata");
  });
});
