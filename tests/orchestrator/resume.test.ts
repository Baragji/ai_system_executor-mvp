import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadCheckpoint } from "../../src/orchestrator/checkpoints.js";
import { raiseInterrupt } from "../../src/orchestrator/interrupts.js";
import { OrchestratorStateMachine } from "../../src/orchestrator/stateMachine.js";
import {
  resumeFromCheckpoint,
  ResumeValidationError,
  ResumeStateError
} from "../../src/orchestrator/resume.js";

const CHECKPOINT_DIR = path.resolve(".automation", "checkpoints");

async function clearCheckpoints(): Promise<void> {
  await fs.rm(CHECKPOINT_DIR, { recursive: true, force: true });
}

describe("resumeFromCheckpoint", () => {
  beforeEach(async () => {
    await clearCheckpoints();
  });

  afterEach(async () => {
    await clearCheckpoints();
  });

  it("rehydrates machine, validates answers, and clears pending questions", async () => {
    const machine = new OrchestratorStateMachine("CLARIFYING");
    machine.transition("PLANNING", { reason: "plan ready" });
    machine.transition("GENERATING", { reason: "start" });

    const record = await raiseInterrupt({
      sessionId: "resume-session",
      machine,
      reason: "Need confirmation",
      questions: [
        { id: "framework", question: "Which UI library should we prefer?", type: "AMBIGUITY" },
        { id: "budget", question: "Is the extended QA cycle approved?", type: "BUDGET_RISK" }
      ],
      machineContext: { prompt: "Build dashboard" },
      checkpointPayload: {
        executor: {
          projectSlug: "dashboard-app",
          repairAttempt: { step: "initial", attempt: 0 }
        }
      }
    });

    expect(record.state).toBe("PAUSED");

    const result = await resumeFromCheckpoint(
      "resume-session",
      [
        { questionId: "framework", value: "Use vanilla JS" },
        { questionId: "budget", value: true }
      ],
      { reason: "Provided answers" }
    );

    expect(result.machine.state).toBe("GENERATING");
    expect(result.answeredQuestions).toHaveLength(2);
    expect(result.answeredQuestions[0]).toMatchObject({
      id: "framework",
      answer: "Use vanilla JS"
    });

    const updated = await loadCheckpoint("resume-session");
    expect(updated).not.toBeNull();
    expect(updated?.state).toBe("GENERATING");
    expect(updated?.payload?.pendingQuestions).toBeUndefined();
    expect(updated?.payload?.metadata?.resolvedQuestions).toHaveLength(2);
  });

  it("throws when answers missing for pending questions", async () => {
    const machine = new OrchestratorStateMachine("CLARIFYING");
    machine.transition("PLANNING");

    await raiseInterrupt({
      sessionId: "missing-answers",
      machine,
      questions: [{ id: "q1", question: "Need more info?", type: "AMBIGUITY" }]
    });

    await expect(resumeFromCheckpoint("missing-answers", [])).rejects.toBeInstanceOf(ResumeValidationError);
  });

  it("throws when checkpoint is not paused", async () => {
    const machine = new OrchestratorStateMachine("CLARIFYING");
    machine.transition("PLANNING");

    await expect(
      resumeFromCheckpoint("no-checkpoint", [
        { questionId: "q1", value: "value" }
      ])
    ).rejects.toBeInstanceOf(ResumeStateError);
  });
});
