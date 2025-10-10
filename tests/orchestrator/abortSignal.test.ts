import { describe, expect, it, beforeEach } from "vitest";

import {
  ensureAbortController,
  setAbortCheckpoint,
  abortSessionExecution,
  throwIfAborted,
  clearAbortController,
  __abortRegistryForTest
} from "../../src/orchestrator/abortSignal.js";
import { PausedError } from "../../src/orchestrator/errors.js";
import {
  CHECKPOINT_SCHEMA_ID,
  CHECKPOINT_VERSION,
  type CheckpointRecord
} from "../../src/orchestrator/checkpoints.js";

function createCheckpoint(sessionId: string): CheckpointRecord {
  const pausedAt = new Date().toISOString();
  return {
    schema: CHECKPOINT_SCHEMA_ID,
    version: CHECKPOINT_VERSION,
    sessionId,
    state: "PAUSED",
    updatedAt: pausedAt,
    machine: {
      history: [
        { state: "GENERATING", enteredAt: new Date(Date.now() - 1000).toISOString() },
        { state: "PAUSED", enteredAt: pausedAt, reason: "manual" }
      ]
    },
    payload: { pendingQuestions: [] }
  };
}

describe("orchestrator abortSignal registry", () => {
  beforeEach(() => {
    __abortRegistryForTest().clear();
  });

  it("stores checkpoint metadata and throws PausedError when aborted", () => {
    const sessionId = "session-test";
    const signal = ensureAbortController(sessionId);
    expect(signal.aborted).toBe(false);

    const checkpoint = createCheckpoint(sessionId);
    setAbortCheckpoint(sessionId, checkpoint);
    const firstAbort = abortSessionExecution(sessionId, "manual pause");
    expect(firstAbort).toBe(true);
    const secondAbort = abortSessionExecution(sessionId, "manual pause");
    expect(secondAbort).toBe(false);

    expect(() => throwIfAborted(sessionId)).toThrowError(PausedError);

    const freshSignal = ensureAbortController(sessionId);
    expect(freshSignal.aborted).toBe(false);
    clearAbortController(sessionId);
    expect(__abortRegistryForTest().has(sessionId)).toBe(false);
  });
});
