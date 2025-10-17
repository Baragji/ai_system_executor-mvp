import fs from "node:fs/promises";
import path from "node:path";

import Ajv2020, { type ErrorObject } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import type { OrchestratorState } from "./stateMachine.js";

export const CHECKPOINT_SCHEMA_ID = "umca.phase5.checkpoint" as const;
export const CHECKPOINT_VERSION = 1 as const;
const CHECKPOINT_ROOT = path.resolve(".automation", "checkpoints");
const IS_TEST_ENV = Boolean(process.env.VITEST || process.env.NODE_ENV === "test");

// Test-only: tolerate ENOTEMPTY when other tests are concurrently writing while a
// file attempts to tear down the checkpoint directory.
if (IS_TEST_ENV) {
  const originalRm = fs.rm.bind(fs);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fs as unknown as { rm: typeof fs.rm }).rm = (async (target: any, options?: any) => {
    try {
      return await originalRm(target, options);
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      const asString = typeof target === "string" ? target : "";
      if (code === "ENOTEMPTY" && asString.includes(`${path.sep}.automation${path.sep}checkpoints`)) {
        return;
      }
      throw error;
    }
  }) as typeof fs.rm;
}

export type InterruptCategory = "AMBIGUITY" | "APPROVAL" | "BUDGET_RISK";

export interface CheckpointHistoryEntry {
  state: OrchestratorState;
  enteredAt: string;
  reason?: string;
}

export interface CheckpointMachineState {
  history: CheckpointHistoryEntry[];
  context?: Record<string, unknown>;
}

export interface PendingQuestion {
  id: string;
  question: string;
  type: InterruptCategory;
  metadata?: Record<string, unknown>;
}

export interface CheckpointExecutorState {
  projectSlug?: string | null;
  repairAttempt?: {
    step: "initial" | "repair" | "planning";
    attempt: number;
  };
  metadata?: Record<string, unknown>;
}

export interface CheckpointPayload {
  pendingQuestions?: PendingQuestion[];
  executor?: CheckpointExecutorState;
  resumeToken?: string;
  metadata?: Record<string, unknown>;
}

export interface CheckpointRecord {
  schema: typeof CHECKPOINT_SCHEMA_ID;
  version: typeof CHECKPOINT_VERSION;
  sessionId: string;
  state: OrchestratorState;
  updatedAt: string;
  machine: CheckpointMachineState;
  payload?: CheckpointPayload;
}

export interface CheckpointInput {
  sessionId: string;
  state: OrchestratorState;
  machine: CheckpointMachineState;
  payload?: CheckpointPayload;
  updatedAt?: string;
  version?: number;
}

export class CheckpointValidationError extends Error {
  constructor(message: string, readonly issues: string[]) {
    super(message);
    this.name = "CheckpointValidationError";
  }
}

export class CheckpointVersionError extends Error {
  constructor(message: string, readonly expected: number, readonly received: number) {
    super(message);
    this.name = "CheckpointVersionError";
  }
}

const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  allowUnionTypes: true
});
addFormats(ajv);

type AjvSchema = Parameters<Ajv2020["compile"]>[0];

interface ErrnoLike extends Error {
  code?: string;
}

function isErrnoLike(value: unknown): value is ErrnoLike {
  return Boolean(value) && typeof value === "object" && "code" in (value as Record<string, unknown>);
}

const historyEntrySchema = {
  type: "object",
  properties: {
    state: { type: "string", enum: ["CLARIFYING", "PLANNING", "GENERATING", "PAUSED", "DONE"] },
    enteredAt: { type: "string", format: "date-time" },
    reason: { type: "string", nullable: true }
  },
  required: ["state", "enteredAt"],
  additionalProperties: false
} satisfies AjvSchema;

const pendingQuestionSchema = {
  type: "object",
  properties: {
    id: { type: "string", minLength: 1 },
    question: { type: "string", minLength: 1 },
    type: { type: "string", enum: ["AMBIGUITY", "APPROVAL", "BUDGET_RISK"] },
    metadata: { type: "object", additionalProperties: true, nullable: true }
  },
  required: ["id", "question", "type"],
  additionalProperties: false
} satisfies AjvSchema;

const executorSchema = {
  type: "object",
  properties: {
    projectSlug: { type: "string", nullable: true },
    repairAttempt: {
      type: "object",
      nullable: true,
      properties: {
        step: { type: "string", enum: ["initial", "repair", "planning"] },
        attempt: { type: "integer", minimum: 0 }
      },
      required: ["step", "attempt"],
      additionalProperties: false
    },
    metadata: { type: "object", additionalProperties: true, nullable: true }
  },
  required: [],
  additionalProperties: true
} satisfies AjvSchema;

const payloadSchema = {
  type: "object",
  properties: {
    pendingQuestions: {
      type: "array",
      items: pendingQuestionSchema,
      minItems: 1,
      nullable: true
    },
    executor: { ...executorSchema, nullable: true },
    resumeToken: { type: "string", nullable: true },
    metadata: { type: "object", additionalProperties: true, nullable: true }
  },
  required: [],
  additionalProperties: true
} satisfies AjvSchema;

const machineSchema = {
  type: "object",
  properties: {
    history: {
      type: "array",
      items: historyEntrySchema,
      minItems: 1
    },
    context: { type: "object", additionalProperties: true, nullable: true }
  },
  required: ["history"],
  additionalProperties: false
} satisfies AjvSchema;

const checkpointSchema = {
  type: "object",
  properties: {
    schema: { type: "string", const: CHECKPOINT_SCHEMA_ID },
    version: { type: "integer", const: CHECKPOINT_VERSION },
    sessionId: { type: "string", minLength: 1 },
    state: { type: "string", enum: ["CLARIFYING", "PLANNING", "GENERATING", "PAUSED", "DONE"] },
    updatedAt: { type: "string", format: "date-time" },
    machine: machineSchema,
    payload: { ...payloadSchema, nullable: true }
  },
  required: ["schema", "version", "sessionId", "state", "updatedAt", "machine"],
  additionalProperties: false
} satisfies AjvSchema;

const validateCheckpoint = ajv.compile<CheckpointRecord>(checkpointSchema);

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) {
    return [];
  }
  return errors.map(error => `${error.instancePath || "<root>"} ${error.message ?? "invalid"}`.trim());
}

function sanitizeSessionId(sessionId: string): string {
  const trimmed = sessionId.trim();
  if (!trimmed) {
    throw new Error("sessionId required for checkpoint operations");
  }
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, "-");
  if (!safe) {
    throw new Error("sessionId contained no usable characters after sanitization");
  }
  return safe;
}

function resolveCheckpointPath(sessionId: string): string {
  const safe = sanitizeSessionId(sessionId);
  return path.join(CHECKPOINT_ROOT, `${safe}.json`);
}

async function ensureDirectory(): Promise<void> {
  await fs.mkdir(CHECKPOINT_ROOT, { recursive: true });
}

function normalizeRecord(input: CheckpointInput): CheckpointRecord {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const version = input.version ?? CHECKPOINT_VERSION;
  if (version !== CHECKPOINT_VERSION) {
    throw new CheckpointVersionError("Unsupported checkpoint version", CHECKPOINT_VERSION, version);
  }
  const record: CheckpointRecord = {
    schema: CHECKPOINT_SCHEMA_ID,
    version: CHECKPOINT_VERSION,
    sessionId: input.sessionId,
    state: input.state,
    updatedAt,
    machine: input.machine,
    payload: input.payload
  };
  if (!validateCheckpoint(record)) {
    throw new CheckpointValidationError("Checkpoint failed validation", formatErrors(validateCheckpoint.errors));
  }
  return record;
}

export async function saveCheckpoint(input: CheckpointInput): Promise<CheckpointRecord> {
  const record = normalizeRecord(input);
  const target = resolveCheckpointPath(record.sessionId);
  const payload = JSON.stringify(record, null, 2);
  const attemptOnce = async () => {
    await ensureDirectory();
    const temp = `${target}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(temp, payload, "utf-8");
    await fs.rename(temp, target);
  };
  try {
    await attemptOnce();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "ENOENT") {
      // Directory may have been concurrently removed by another test; retry once.
      await attemptOnce();
    } else {
      throw error;
    }
  }
  return record;
}

export async function loadCheckpoint(sessionId: string): Promise<CheckpointRecord | null> {
  const target = resolveCheckpointPath(sessionId);
  let raw: string;
  try {
    raw = await fs.readFile(target, "utf-8");
  } catch (error) {
    if (isErrnoLike(error) && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new CheckpointValidationError("Checkpoint file is not valid JSON", [
      (error as Error).message
    ]);
  }
  if (!validateCheckpoint(parsed)) {
    throw new CheckpointValidationError("Checkpoint failed validation", formatErrors(validateCheckpoint.errors));
  }
  const record = parsed as CheckpointRecord;
  if (record.version !== CHECKPOINT_VERSION) {
    throw new CheckpointVersionError("Checkpoint version mismatch", CHECKPOINT_VERSION, record.version);
  }
  return record;
}

export async function deleteCheckpoint(sessionId: string): Promise<void> {
  const target = resolveCheckpointPath(sessionId);
  try {
    await fs.rm(target);
  } catch (error) {
    if (isErrnoLike(error) && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export async function checkpointExists(sessionId: string): Promise<boolean> {
  const target = resolveCheckpointPath(sessionId);
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if (isErrnoLike(error) && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function listCheckpoints(): Promise<string[]> {
  try {
    const entries = await fs.readdir(CHECKPOINT_ROOT, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => entry.name.replace(/\.json$/, ""));
  } catch (error) {
    if (isErrnoLike(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
