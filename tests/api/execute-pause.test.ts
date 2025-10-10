import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { app } from "../../src/server.js";
import {
  ensureAbortController,
  setAbortCheckpoint,
  abortSessionExecution,
  __abortRegistryForTest
} from "../../src/orchestrator/abortSignal.js";
import {
  CHECKPOINT_SCHEMA_ID,
  CHECKPOINT_VERSION,
  type CheckpointRecord
} from "../../src/orchestrator/checkpoints.js";

function buildCheckpoint(sessionId: string): CheckpointRecord {
  const pausedAt = new Date().toISOString();
  const previous = new Date(Date.now() - 250).toISOString();
  return {
    schema: CHECKPOINT_SCHEMA_ID,
    version: CHECKPOINT_VERSION,
    sessionId,
    state: "PAUSED",
    updatedAt: pausedAt,
    machine: {
      history: [
        { state: "GENERATING", enteredAt: previous },
        { state: "PAUSED", enteredAt: pausedAt, reason: "Manual pause" }
      ]
    },
    payload: { pendingQuestions: [] }
  };
}

describe("/api/execute pause handling", () => {
  beforeEach(() => {
    __abortRegistryForTest().clear();
  });

  afterEach(() => {
    __abortRegistryForTest().clear();
  });

  it("returns 202 Accepted when execution is already aborted", async () => {
    const sessionId = "pause-run-001";
    ensureAbortController(sessionId);
    setAbortCheckpoint(sessionId, buildCheckpoint(sessionId));
    abortSessionExecution(sessionId, "Manual pause");

    const response = await request(app)
      .post("/api/execute")
      .send({ prompt: "build a todo list", sessionId })
      .expect(202);

    expect(response.body?.paused).toBe(true);
    expect(response.body?.sessionId).toBe(sessionId);
    expect(response.body?.checkpoint?.sessionId).toBe(sessionId);
  });
});
