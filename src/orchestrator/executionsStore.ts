export type ExecutionStatus = "started" | "running" | "completed" | "failed";

export interface ExecutionRecord {
  id: string;
  status: ExecutionStatus;
  createdAt: string;
  updatedAt: string;
  route?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  logs?: unknown[];
  error?: string;
}

type TimestampLike = string | Date | undefined;

type ExecutionInit = {
  status?: ExecutionStatus;
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
  route?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  logs?: unknown[];
  error?: string;
};

type ExecutionPatch = Partial<Omit<ExecutionRecord, "id" | "createdAt">> & {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

const executions = new Map<string, ExecutionRecord>();

function now(): string {
  return new Date().toISOString();
}

function normalizeTimestamp(value: TimestampLike): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function createExecution(id: string, initial?: ExecutionInit): ExecutionRecord {
  const createdAt = normalizeTimestamp(initial?.createdAt) ?? now();
  const updatedAt = normalizeTimestamp(initial?.updatedAt) ?? createdAt;

  const record: ExecutionRecord = {
    id,
    status: initial?.status ?? "started",
    createdAt,
    updatedAt,
    ...(initial?.route ? { route: initial.route } : {}),
    ...(initial?.input !== undefined ? { input: initial.input } : {}),
    ...(initial?.output !== undefined ? { output: initial.output } : {}),
    ...(initial?.result !== undefined ? { result: initial.result } : {}),
    ...(initial?.logs !== undefined ? { logs: initial.logs } : {}),
    ...(initial?.error !== undefined ? { error: initial.error } : {}),
  };

  executions.set(id, record);
  return record;
}

export function getExecution(id: string): ExecutionRecord | null {
  return executions.get(id) ?? null;
}

export function updateExecution(id: string, patch: ExecutionPatch): ExecutionRecord | null {
  const current = executions.get(id);
  if (!current) return null;

  const updatedAt = normalizeTimestamp(patch.updatedAt) ?? now();
  const createdAt = normalizeTimestamp(patch.createdAt) ?? current.createdAt;

  const updated: ExecutionRecord = {
    ...current,
    ...patch,
    createdAt,
    updatedAt,
  };

  executions.set(id, updated);
  return updated;
}

interface ExecutionCompletionPayload {
  output?: unknown;
  logs?: unknown[];
  result?: unknown;
}

function isCompletionPayload(value: unknown): value is ExecutionCompletionPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    ("output" in value || "logs" in value || "result" in value)
  );
}

export function completeExecution(id: string, payload?: unknown): ExecutionRecord | null {
  const patch: ExecutionPatch = { status: "completed" };

  if (payload !== undefined) {
    if (isCompletionPayload(payload)) {
      if (payload.output !== undefined) {
        patch.output = payload.output;
        patch.result = payload.output;
      } else if (payload.result !== undefined) {
        patch.output = payload.result;
        patch.result = payload.result;
      }
      if (payload.logs !== undefined) {
        patch.logs = payload.logs;
      }
    } else {
      patch.output = payload;
      patch.result = payload;
    }
  }

  return updateExecution(id, patch);
}

export function failExecution(id: string, error?: unknown): ExecutionRecord | null {
  const message = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined;
  const patch: ExecutionPatch = {
    status: "failed",
    ...(message ? { error: message } : {}),
  };
  return updateExecution(id, patch);
}

export function listExecutions(): ExecutionRecord[] {
  return Array.from(executions.values());
}

export const __test = {
  clear(): void {
    executions.clear();
  },
  size(): number {
    return executions.size;
  },
};
