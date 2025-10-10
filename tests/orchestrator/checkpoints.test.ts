import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CHECKPOINT_VERSION,
  type CheckpointInput,
  CheckpointValidationError,
  CheckpointVersionError,
  deleteCheckpoint,
  checkpointExists,
  listCheckpoints,
  loadCheckpoint,
  saveCheckpoint
} from "../../src/orchestrator/checkpoints.js";

const CHECKPOINT_DIR = path.resolve(".automation", "checkpoints");

async function clearCheckpoints(): Promise<void> {
  await fs.rm(CHECKPOINT_DIR, { recursive: true, force: true });
}

function baseInput(overrides: Partial<CheckpointInput> = {}): CheckpointInput {
  const now = new Date().toISOString();
  return {
    sessionId: "session-123",
    state: "CLARIFYING",
    machine: {
      history: [
        {
          state: "CLARIFYING",
          enteredAt: now
        }
      ],
      context: { prompt: "Build a todo app" }
    },
    payload: {
      pendingQuestions: [
        {
          id: "q1",
          question: "Which framework?",
          type: "AMBIGUITY"
        }
      ],
      executor: {
        projectSlug: "todo-app",
        repairAttempt: { step: "initial", attempt: 0 }
      }
    },
    ...overrides
  };
}

describe("checkpoints", () => {
  beforeEach(async () => {
    await clearCheckpoints();
  });

  afterEach(async () => {
    await clearCheckpoints();
  });

  it("saves and loads checkpoints", async () => {
    const input = baseInput({ sessionId: " session id " });
    const saved = await saveCheckpoint(input);
    expect(saved.schema).toBe("umca.phase5.checkpoint");
    expect(saved.version).toBe(CHECKPOINT_VERSION);

    const loaded = await loadCheckpoint("session id");
    expect(loaded).not.toBeNull();
    expect(loaded?.sessionId).toBe(" session id ");
    expect(loaded?.machine.history).toHaveLength(1);
    expect(loaded?.payload?.pendingQuestions?.[0].question).toContain("framework");
  });

  it("returns null when checkpoint missing", async () => {
    const result = await loadCheckpoint("does-not-exist");
    expect(result).toBeNull();
  });

  it("reports existence and lists saved checkpoints", async () => {
    await saveCheckpoint(baseInput({ sessionId: "complex/session" }));
    expect(await checkpointExists("complex/session")).toBe(true);
    const entries = await listCheckpoints();
    expect(entries).toContain("complex-session");
  });

  it("deletes checkpoints", async () => {
    const id = "delete-me";
    await saveCheckpoint(baseInput({ sessionId: id }));
    await deleteCheckpoint(id);
    expect(await checkpointExists(id)).toBe(false);
  });

  it("validates data before writing", async () => {
    await expect(
      saveCheckpoint({
        ...baseInput(),
        machine: { history: [] }
      })
    ).rejects.toBeInstanceOf(CheckpointValidationError);
  });

  it("guards version mismatches", async () => {
    await expect(
      saveCheckpoint({
        ...baseInput(),
        version: 99
      })
    ).rejects.toBeInstanceOf(CheckpointVersionError);
  });

  it("fails when checkpoint file is corrupted", async () => {
    const input = baseInput({ sessionId: "corrupted" });
    await saveCheckpoint(input);
    const target = path.join(CHECKPOINT_DIR, "corrupted.json");
    await fs.writeFile(target, "not-json", "utf-8");
    await expect(loadCheckpoint("corrupted")).rejects.toBeInstanceOf(CheckpointValidationError);
  });

  it("enforces schema on read", async () => {
    const input = baseInput({ sessionId: "bad-schema" });
    await saveCheckpoint(input);
    const target = path.join(CHECKPOINT_DIR, "bad-schema.json");
    const invalid: Record<string, unknown> = {
      ...input,
      schema: "wrong"
    };
    await fs.writeFile(target, JSON.stringify(invalid), "utf-8");
    await expect(loadCheckpoint("bad-schema")).rejects.toBeInstanceOf(CheckpointValidationError);
  });
});
