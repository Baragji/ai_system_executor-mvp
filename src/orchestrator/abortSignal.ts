import { PausedError } from "./errors.js";
import type { CheckpointRecord } from "./checkpoints.js";

interface SessionAbortEntry {
  controller: AbortController;
  checkpoint?: CheckpointRecord;
  reason?: string;
}

const abortRegistry = new Map<string, SessionAbortEntry>();

function createEntry(): SessionAbortEntry {
  return { controller: new AbortController() };
}

export function ensureAbortController(sessionId: string): AbortSignal {
  const existing = abortRegistry.get(sessionId);
  if (existing) {
    if (existing.controller.signal.aborted) {
      const next = createEntry();
      next.checkpoint = existing.checkpoint;
      abortRegistry.set(sessionId, next);
      return next.controller.signal;
    }
    return existing.controller.signal;
  }
  const entry = createEntry();
  abortRegistry.set(sessionId, entry);
  return entry.controller.signal;
}

export function getAbortSignal(sessionId: string): AbortSignal | undefined {
  return abortRegistry.get(sessionId)?.controller.signal;
}

export function setAbortCheckpoint(sessionId: string, checkpoint: CheckpointRecord): void {
  const entry = abortRegistry.get(sessionId);
  if (entry) {
    entry.checkpoint = checkpoint;
  } else {
    const next = createEntry();
    next.checkpoint = checkpoint;
    abortRegistry.set(sessionId, next);
  }
}

export function abortSessionExecution(sessionId: string, reason?: string): boolean {
  const entry = abortRegistry.get(sessionId);
  if (!entry) {
    const created = createEntry();
    created.reason = reason;
    created.controller.abort();
    abortRegistry.set(sessionId, created);
    return true;
  }
  if (entry.controller.signal.aborted) {
    return false;
  }
  entry.reason = reason ?? entry.reason;
  entry.controller.abort();
  return true;
}

export function clearAbortController(sessionId: string): void {
  abortRegistry.delete(sessionId);
}

export function isSessionAborted(sessionId: string): boolean {
  return abortRegistry.get(sessionId)?.controller.signal.aborted ?? false;
}

export function getAbortCheckpoint(sessionId: string): CheckpointRecord | undefined {
  return abortRegistry.get(sessionId)?.checkpoint;
}

export function throwIfAborted(sessionId: string, message?: string): void {
  const entry = abortRegistry.get(sessionId);
  if (!entry) {
    return;
  }
  if (entry.controller.signal.aborted) {
    throw new PausedError(sessionId, entry.checkpoint, message ?? entry.reason ?? "Execution paused");
  }
}

export function resetAbortState(sessionId: string): void {
  const entry = abortRegistry.get(sessionId);
  if (!entry) {
    return;
  }
  abortRegistry.set(sessionId, { controller: new AbortController() });
}

export function __abortRegistryForTest(): Map<string, SessionAbortEntry> {
  return abortRegistry;
}
