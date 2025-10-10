import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadCheckpoint } from "../../src/orchestrator/checkpoints.js";
import { OrchestratorStateMachine } from "../../src/orchestrator/stateMachine.js";
import {
  raiseInterrupt,
  type InterruptQuestionInput
} from "../../src/orchestrator/interrupts.js";

const CHECKPOINT_DIR = path.resolve(".automation", "checkpoints");

async function clearCheckpoints(): Promise<void> {
  await fs.rm(CHECKPOINT_DIR, { recursive: true, force: true });
}

describe("interrupts", () => {
  beforeEach(async () => {
    await clearCheckpoints();
  });

  afterEach(async () => {
    await clearCheckpoints();
  });

  it("pauses the machine, persists checkpoint, and normalizes questions", async () => {
    const machine = new OrchestratorStateMachine("CLARIFYING");
    machine.transition("PLANNING", { reason: "ready" });
    machine.transition("GENERATING", { reason: "begin" });

    const timestamp = new Date("2025-01-01T00:00:00.000Z");

    const record = await raiseInterrupt({
      sessionId: " session-42 ",
      machine,
      timestamp,
      reason: "Need clarification",
      machineContext: { prompt: "Build a quiz app" },
      checkpointPayload: {
        executor: {
          projectSlug: "quiz-app",
          repairAttempt: { step: "initial", attempt: 0 }
        },
        resumeToken: "resume-123"
      },
      questions: [
        { question: "Which framework should we use?", type: "AMBIGUITY" },
        { id: "approval-1", question: "Is the proposed budget approved?", type: "APPROVAL", metadata: { severity: "high" } }
      ]
    });

    expect(machine.state).toBe("PAUSED");
    expect(record.state).toBe("PAUSED");
    expect(record.updatedAt).toBe(timestamp.toISOString());
    expect(record.payload?.pendingQuestions).toHaveLength(2);
    const autoId = record.payload?.pendingQuestions?.[0]?.id ?? "";
    expect(autoId).toMatch(/[0-9a-f-]{36}/i);
    expect(record.payload?.pendingQuestions?.[1]?.id).toBe("approval-1");

    const stored = await loadCheckpoint("session-42");
    expect(stored).not.toBeNull();
    expect(stored?.machine.history.at(-1)?.state).toBe("PAUSED");
    expect(stored?.machine.history.at(-1)?.reason).toBe("Need clarification");
    expect(stored?.payload?.executor?.projectSlug).toBe("quiz-app");
    expect(stored?.payload?.pendingQuestions?.[0]?.question).toContain("framework");
  });

  it("rejects invalid question categories", async () => {
    const machine = new OrchestratorStateMachine("PLANNING");

    const badQuestion = { question: "invalid", type: "OTHER" } as unknown as InterruptQuestionInput;

    await expect(
      raiseInterrupt({
        sessionId: "bad",
        machine,
        questions: [badQuestion]
      })
    ).rejects.toThrow(/Unsupported interrupt category/);
  });

  it("rejects duplicate question ids", async () => {
    const machine = new OrchestratorStateMachine("GENERATING");

    await expect(
      raiseInterrupt({
        sessionId: "dup",
        machine,
        questions: [
          { id: "q1", question: "First?", type: "AMBIGUITY" },
          { id: "q1", question: "Second?", type: "APPROVAL" }
        ]
      })
    ).rejects.toThrow(/Duplicate question id/);
  });

  it("rejects pause requests from terminal states", async () => {
    const machine = new OrchestratorStateMachine("CLARIFYING");
    machine.transition("GENERATING");
    machine.transition("DONE");

    await expect(
      raiseInterrupt({
        sessionId: "done",
        machine,
        questions: [{ question: "Anything left?", type: "AMBIGUITY" }]
      })
    ).rejects.toThrow(/Cannot raise interrupt/);
  });

  it("rejects non-object metadata", async () => {
    const machine = new OrchestratorStateMachine("CLARIFYING");

    await expect(
      raiseInterrupt({
        sessionId: "meta",
        machine,
        questions: [
          { question: "Provide details", type: "AMBIGUITY", metadata: "nope" as unknown as Record<string, unknown> }
        ]
      })
    ).rejects.toThrow(/metadata/);
  });
});
