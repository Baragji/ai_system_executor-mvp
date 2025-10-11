import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const logEventMock = vi.fn();

vi.mock("../../src/telemetry/events.js", () => ({
  logEvent: logEventMock
}));

import { logAbortEvent, logPauseEvent, logResumeEvent, logStepEvent } from "../../src/orchestrator/logging.js";

const originalProvider = process.env.LLM_PROVIDER;

afterAll(() => {
  if (originalProvider === undefined) {
    delete process.env.LLM_PROVIDER;
  } else {
    process.env.LLM_PROVIDER = originalProvider;
  }
});

beforeEach(() => {
  logEventMock.mockReset();
  delete process.env.LLM_PROVIDER;
});

describe("orchestrator logging", () => {
  it("records step durations for lifecycle events", async () => {
    await logStepEvent({
      sessionId: "session-123",
      stepId: "step-abc",
      stepType: "single",
      sequence: 2,
      status: "completed",
      queuedAt: "2025-01-01T00:00:00.000Z",
      startedAt: "2025-01-01T00:00:05.000Z",
      completedAt: "2025-01-01T00:00:15.000Z",
      stop: true
    });

    expect(logEventMock).toHaveBeenCalledTimes(1);
    const [eventName, payload] = logEventMock.mock.calls[0] ?? [];
    expect(eventName).toBe("orchestrator.step");
    expect(payload).toMatchObject({
      sessionId: "session-123",
      stepId: "step-abc",
      sequence: 2,
      status: "completed",
      stop: true,
      queueLatencyMs: 5000,
      runDurationMs: 10000,
      totalDurationMs: 15000,
      provider: "openai"
    });
  });

  it("logs pause events with default provider metadata", async () => {
    await logPauseEvent({ sessionId: "sess-pause", status: "requested", questions: 1 });
    expect(logEventMock).toHaveBeenCalledWith(
      "orchestrator.pause",
      expect.objectContaining({ sessionId: "sess-pause", provider: "openai", questions: 1, status: "requested" })
    );
  });

  it("logs resume events with trimmed manifest hash and mode", async () => {
    process.env.LLM_PROVIDER = "anthropic";
    await logResumeEvent({
      sessionId: "sess-resume",
      checkpointAt: "2025-01-02T00:00:00.000Z",
      manifestHash: " 1234567890abcdef ",
      questionsResolved: 3,
      mode: "queue"
    });
    expect(logEventMock).toHaveBeenCalledWith(
      "orchestrator.resume",
      expect.objectContaining({
        sessionId: "sess-resume",
        provider: "anthropic",
        manifestHash: "1234567890abcdef",
        questionsResolved: 3,
        mode: "queue"
      })
    );
  });

  it("logs abort events and preserves active flag", async () => {
    await logAbortEvent({ sessionId: "sess-abort", active: true, reason: "manual" });
    expect(logEventMock).toHaveBeenCalledWith(
      "orchestrator.abort",
      expect.objectContaining({ sessionId: "sess-abort", active: true, reason: "manual" })
    );
  });
});
