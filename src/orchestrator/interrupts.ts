import { randomUUID } from "node:crypto";

import { OrchestratorStateMachine, type StateTransition } from "./stateMachine.js";
import {
  type CheckpointMachineState,
  type CheckpointPayload,
  type CheckpointRecord,
  type PendingQuestion,
  type InterruptCategory,
  saveCheckpoint
} from "./checkpoints.js";

export const INTERRUPT_CATEGORIES: readonly InterruptCategory[] = [
  "AMBIGUITY",
  "APPROVAL",
  "BUDGET_RISK"
];

export interface InterruptQuestionInput {
  id?: string;
  question: string;
  type: InterruptCategory;
  metadata?: Record<string, unknown> | null;
}

export interface RaiseInterruptOptions {
  sessionId: string;
  machine: OrchestratorStateMachine;
  questions: InterruptQuestionInput[];
  reason?: string;
  machineContext?: Record<string, unknown> | null;
  checkpointPayload?: Omit<CheckpointPayload, "pendingQuestions">;
  timestamp?: Date;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeQuestion(input: InterruptQuestionInput, index: number): PendingQuestion {
  if (!input || typeof input.question !== "string") {
    throw new Error(`Question at index ${index} must include a question string`);
  }
  const question = input.question.trim();
  if (!question) {
    throw new Error(`Question at index ${index} cannot be empty`);
  }

  if (!INTERRUPT_CATEGORIES.includes(input.type)) {
    throw new Error(`Unsupported interrupt category: ${input.type}`);
  }

  if (input.metadata !== undefined && input.metadata !== null && !isPlainObject(input.metadata)) {
    throw new Error(`Question metadata at index ${index} must be a plain object if provided`);
  }

  const idSource = typeof input.id === "string" ? input.id.trim() : "";
  const id = idSource || randomUUID();

  const metadata = input.metadata === undefined || input.metadata === null ? undefined : input.metadata;

  return {
    id,
    question,
    type: input.type,
    ...(metadata !== undefined ? { metadata } : {})
  } satisfies PendingQuestion;
}

function toCheckpointHistory(history: StateTransition[]): CheckpointMachineState["history"] {
  return history.map(entry => ({
    state: entry.current,
    enteredAt: entry.timestamp,
    ...(entry.reason ? { reason: entry.reason } : {})
  }));
}

export async function raiseInterrupt(options: RaiseInterruptOptions): Promise<CheckpointRecord> {
  if (!Array.isArray(options.questions) || options.questions.length === 0) {
    throw new Error("At least one interrupt question is required");
  }

  const normalizedQuestions = options.questions.map((question, index) => normalizeQuestion(question, index));
  const ids = new Set<string>();
  for (const question of normalizedQuestions) {
    if (ids.has(question.id)) {
      throw new Error(`Duplicate question id detected: ${question.id}`);
    }
    ids.add(question.id);
  }

  if (!options.machine.canTransition("PAUSED")) {
    throw new Error(`Cannot raise interrupt while orchestrator is in ${options.machine.state}`);
  }

  const at = options.timestamp ?? new Date();
  const reason = options.reason ?? "Interrupt raised";

  options.machine.transition("PAUSED", { reason, at });

  const machineState: CheckpointMachineState = {
    history: toCheckpointHistory(options.machine.history)
  };

  if (options.machineContext !== undefined) {
    if (options.machineContext !== null && !isPlainObject(options.machineContext)) {
      throw new Error("machineContext must be a plain object or null when provided");
    }
    machineState.context = options.machineContext ?? undefined;
  }

  if (options.checkpointPayload && "pendingQuestions" in options.checkpointPayload) {
    throw new Error(
      "checkpointPayload must not include pendingQuestions; they are derived from the interrupt"
    );
  }

  const basePayload: Partial<CheckpointPayload> = options.checkpointPayload ? { ...options.checkpointPayload } : {};
  const payload: CheckpointPayload = {
    ...basePayload,
    pendingQuestions: normalizedQuestions
  };

  return saveCheckpoint({
    sessionId: options.sessionId,
    state: options.machine.state,
    machine: machineState,
    payload,
    updatedAt: at.toISOString()
  });
}

export type { InterruptCategory } from "./checkpoints.js";
