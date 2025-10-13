type ExecutionStatus = "started" | "completed" | "failed";

export interface ExecutionRecord {
  id: string;
  status: ExecutionStatus;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
}

const executions = new Map<string, ExecutionRecord>();

function now(): string {
  return new Date().toISOString();
}

export function createExecution(id: string, initial?: Partial<Omit<ExecutionRecord, "id">>): ExecutionRecord {
  const ts = now();
  const record: ExecutionRecord = {
    id,
    status: initial?.status ?? "started",
    createdAt: initial?.createdAt ?? ts,
    updatedAt: initial?.updatedAt ?? ts,
    ...(initial?.result !== undefined ? { result: initial.result } : {}),
    ...(initial?.error !== undefined ? { error: initial.error } : {})
  };
  executions.set(id, record);
  return record;
}

export function getExecution(id: string): ExecutionRecord | null {
  return executions.get(id) ?? null;
}

export function updateExecution(id: string, patch: Partial<Omit<ExecutionRecord, "id">>): ExecutionRecord | null {
  const current = executions.get(id);
  if (!current) return null;
  const updated: ExecutionRecord = {
    ...current,
    ...patch,
    updatedAt: now()
  };
  executions.set(id, updated);
  return updated;
}

export function completeExecution(id: string, result?: unknown): ExecutionRecord | null {
  return updateExecution(id, { status: "completed", ...(result !== undefined ? { result } : {}) });
}

export function failExecution(id: string, error?: unknown): ExecutionRecord | null {
  const message = error instanceof Error ? error.message : error !== undefined ? String(error) : undefined;
  return updateExecution(id, { status: "failed", ...(message ? { error: message } : {}) });
}

export function listExecutions(): ExecutionRecord[] {
  return Array.from(executions.values());
}

export const __test = {
  clear() { executions.clear(); },
  size() { return executions.size; }
};

