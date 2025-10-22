import { OrchestratorStateMachine, type OrchestratorState, type StateTransition } from "./stateMachine.js";
import {
  loadCheckpoint,
  saveCheckpoint,
  type CheckpointMachineState,
  type CheckpointPayload,
  type CheckpointRecord,
  type PendingQuestion
} from "./checkpoints.js";

export interface ResumeAnswer {
  questionId: string;
  value: unknown;
}

export interface ResumeOptions {
  /** Override the state to transition into after resuming. Defaults to the state prior to pause. */
  targetState?: OrchestratorState;
  /** Optional human readable reason to include in the transition history. */
  reason?: string;
  /** Timestamp to record for the resume transition. Defaults to `new Date()`. */
  timestamp?: Date;
  /** Existing machine instance to reuse instead of rebuilding from checkpoint history. */
  machine?: OrchestratorStateMachine;
}

export interface ResolvedQuestion {
  id: string;
  question: string;
  type: string;
  answer: unknown;
  metadata?: Record<string, unknown>;
}

export interface ResumeResult {
  checkpoint: CheckpointRecord;
  machine: OrchestratorStateMachine;
  answeredQuestions: ResolvedQuestion[];
}

export class ResumeValidationError extends Error {
  constructor(message: string, readonly issues: string[]) {
    super(message);
    this.name = "ResumeValidationError";
  }
}

export class ResumeStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeStateError";
  }
}

interface QuestionLookup {
  question: PendingQuestion;
  answer: ResumeAnswer;
}

function ensureAnswers(
  pending: PendingQuestion[] | undefined,
  answers: ResumeAnswer[]
): { resolved: QuestionLookup[]; warnings: string[] } {
  if (!pending || pending.length === 0) {
    return { resolved: [], warnings: [] };
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    throw new ResumeValidationError("Answers are required to resume the session", [
      "answers must include at least one entry"
    ]);
  }

  const normalizedAnswers = new Map<string, ResumeAnswer>();
  for (const answer of answers) {
    if (!answer || typeof answer.questionId !== "string") {
      throw new ResumeValidationError("Each answer must include a questionId", ["answers.questionId missing"]);
    }
    const trimmedId = answer.questionId.trim();
    if (!trimmedId) {
      throw new ResumeValidationError("Answer questionId cannot be empty", ["answers.questionId empty"]);
    }
    if (normalizedAnswers.has(trimmedId)) {
      throw new ResumeValidationError("Duplicate answers detected", [
        `duplicate answer for questionId ${trimmedId}`
      ]);
    }

    const value = answer.value;
    if (value === undefined) {
      throw new ResumeValidationError("Answer value cannot be undefined", [`answers[${trimmedId}] undefined`]);
    }
    if (typeof value === "string" && value.trim() === "") {
      throw new ResumeValidationError("Answer value cannot be blank", [`answers[${trimmedId}] blank string`]);
    }

    normalizedAnswers.set(trimmedId, { questionId: trimmedId, value });
  }

  const resolved: QuestionLookup[] = [];
  const warnings: string[] = [];
  for (const question of pending) {
    const answer = normalizedAnswers.get(question.id);
    if (!answer) {
      throw new ResumeValidationError("Missing answer for pending question", [
        `question ${question.id} requires an answer`
      ]);
    }
    resolved.push({ question, answer });
  }

  for (const [answerId] of normalizedAnswers) {
    if (!pending.some(question => question.id === answerId)) {
      warnings.push(`Answer provided for unknown questionId ${answerId}`);
    }
  }

  return { resolved, warnings };
}

function rehydrateMachine(history: CheckpointMachineState["history"]): OrchestratorStateMachine {
  if (!Array.isArray(history) || history.length === 0) {
    throw new ResumeStateError("Checkpoint history is empty; cannot resume");
  }

  const firstEntry = history[0];
  if (!firstEntry) {
    throw new ResumeStateError("Checkpoint history is empty; cannot resume");
  }
  const rest = history.slice(1);
  const machine = new OrchestratorStateMachine(firstEntry.state);
  for (const entry of rest) {
    if (!entry || typeof entry.state !== "string") {
      continue;
    }
    const at = entry.enteredAt ? new Date(entry.enteredAt) : undefined;
    const reason = entry.reason;
    if (machine.state === entry.state) {
      continue;
    }
    if (!machine.canTransition(entry.state)) {
      throw new ResumeStateError(
        `Checkpoint history contains illegal transition ${machine.state} -> ${entry.state}`
      );
    }
    machine.transition(entry.state, {
      reason,
      at
    });
  }
  return machine;
}

function previousActiveState(history: CheckpointMachineState["history"]): OrchestratorState {
  if (!Array.isArray(history) || history.length < 2) {
    throw new ResumeStateError("Checkpoint history does not contain enough entries to resume");
  }
  const last = history.at(-1);
  if (!last || last.state !== "PAUSED") {
    throw new ResumeStateError("Checkpoint is not paused; cannot resume");
  }
  for (let index = history.length - 2; index >= 0; index -= 1) {
    const candidate = history[index];
    if (candidate && candidate.state !== "PAUSED") {
      return candidate.state;
    }
  }
  throw new ResumeStateError("Unable to determine previous active state before pause");
}

function toCheckpointHistory(history: StateTransition[]): CheckpointMachineState["history"] {
  return history.map(entry => ({
    state: entry.current,
    enteredAt: entry.timestamp,
    ...(entry.reason ? { reason: entry.reason } : {})
  }));
}

function buildPayload(
  checkpoint: CheckpointRecord,
  resolved: ResolvedQuestion[],
  resumedAt: Date
): CheckpointPayload | undefined {
  const source = checkpoint.payload ?? undefined;
  const rest: Partial<CheckpointPayload> = source ? { ...source } : {};
  if ("pendingQuestions" in rest) {
    delete (rest as Record<string, unknown>).pendingQuestions;
  }

  const base: CheckpointPayload = {
    ...(rest.executor ? { executor: rest.executor } : {}),
    ...(rest.resumeToken ? { resumeToken: rest.resumeToken } : {}),
    ...(rest.metadata ? { metadata: { ...rest.metadata } } : {})
  };

  const metadata = base.metadata ?? {};
  if (resolved.length > 0) {
    metadata.resolvedQuestions = resolved.map(item => ({
      id: item.id,
      question: item.question,
      type: item.type,
      answer: item.answer
    }));
  }
  metadata.resumedAt = resumedAt.toISOString();
  base.metadata = metadata;

  return Object.keys(base).length > 0 ? base : undefined;
}

export async function resumeFromCheckpoint(
  sessionId: string,
  answers: ResumeAnswer[],
  options: ResumeOptions = {}
): Promise<ResumeResult> {
  const checkpoint = await loadCheckpoint(sessionId);
  if (!checkpoint) {
    throw new ResumeStateError(`No checkpoint found for session ${sessionId}`);
  }

  const { resolved } = ensureAnswers(checkpoint.payload?.pendingQuestions, answers);

  const machine = options.machine ?? rehydrateMachine(checkpoint.machine.history);
  if (machine.state !== "PAUSED") {
    throw new ResumeStateError(`Machine is not paused (current state: ${machine.state})`);
  }

  const target = options.targetState ?? previousActiveState(checkpoint.machine.history);
  if (!machine.canTransition(target)) {
    throw new ResumeStateError(`Cannot resume from ${machine.state} to ${target}`);
  }

  const resumeAt = options.timestamp ?? new Date();
  machine.transition(target, {
    reason: options.reason ?? "Resume from checkpoint",
    at: resumeAt
  });

  const answeredQuestions: ResolvedQuestion[] = resolved.map(item => ({
    id: item.question.id,
    question: item.question.question,
    type: item.question.type,
    answer: item.answer.value,
    ...(item.question.metadata ? { metadata: item.question.metadata } : {})
  }));

  const record = await saveCheckpoint({
    sessionId: checkpoint.sessionId,
    state: machine.state,
    machine: {
      history: toCheckpointHistory(machine.history),
      ...(checkpoint.machine.context ? { context: checkpoint.machine.context } : {})
    },
    payload: buildPayload(checkpoint, answeredQuestions, resumeAt),
    updatedAt: resumeAt.toISOString()
  });

  return {
    checkpoint: record,
    machine,
    answeredQuestions
  };
}
