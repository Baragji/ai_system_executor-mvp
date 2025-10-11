/**
 * Abort signal management for graceful execution cancellation.
 * Allows pausing in-flight LLM calls, tests, and repair loops.
 */

import { EventEmitter } from "node:events";

/**
 * Error thrown when execution is paused via abort signal.
 */
export class PausedError extends Error {
  constructor(
    public readonly sessionId: string,
    public readonly phase: string,
    message?: string
  ) {
    super(message || `Execution paused during ${phase}`);
    this.name = "PausedError";
  }
}

interface AbortEntry {
  controller: AbortController;
  emitter: EventEmitter;
  createdAt: Date;
}

const abortSignals = new Map<string, AbortEntry>();

/**
 * Create an abort signal for a session.
 * Should be called at the start of /api/execute.
 */
export function createAbortSignal(sessionId: string): AbortSignal {
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("sessionId is required to create abort signal");
  }

  // Clean up existing signal if present
  if (abortSignals.has(sessionId)) {
    const existing = abortSignals.get(sessionId)!;
    existing.controller.abort();
    abortSignals.delete(sessionId);
  }

  const controller = new AbortController();
  const emitter = new EventEmitter();

  controller.signal.addEventListener("abort", () => {
    emitter.emit("aborted", sessionId);
  });

  abortSignals.set(sessionId, {
    controller,
    emitter,
    createdAt: new Date()
  });

  return controller.signal;
}

/**
 * Check if a session has been aborted.
 * Returns true if pause was requested.
 */
export function checkAborted(sessionId: string | undefined): boolean {
  if (!sessionId) return false;
  const entry = abortSignals.get(sessionId);
  return entry?.controller.signal.aborted ?? false;
}

/**
 * Abort a session's execution.
 * Returns true if session was found and aborted, false otherwise.
 */
export function abortSession(sessionId: string): boolean {
  const entry = abortSignals.get(sessionId);
  if (!entry) return false;

  if (!entry.controller.signal.aborted) {
    entry.controller.abort();
  }

  return true;
}

/**
 * Clean up abort signal for a session.
 * Should be called when execution completes or errors out.
 */
export function cleanupAbortSignal(sessionId: string): void {
  abortSignals.delete(sessionId);
}

/**
 * Get the abort signal for a session (if it exists).
 * Used for checking signal state without creating new one.
 */
export function getAbortSignal(sessionId: string): AbortSignal | undefined {
  return abortSignals.get(sessionId)?.controller.signal;
}

/**
 * Listen for abort events on a session.
 * Useful for cleanup or logging when abort happens.
 */
export function onAbort(sessionId: string, callback: (sessionId: string) => void): void {
  const entry = abortSignals.get(sessionId);
  if (entry) {
    entry.emitter.once("aborted", callback);
  }
}

/**
 * Check if session should pause, and throw PausedError if so.
 * Convenience helper to reduce boilerplate in execution flow.
 */
export function throwIfAborted(sessionId: string | undefined, phase: string): void {
  if (sessionId && checkAborted(sessionId)) {
    throw new PausedError(sessionId, phase);
  }
}

/**
 * Get all active abort signals (for debugging/monitoring).
 */
export function getActiveAbortSignals(): string[] {
  return Array.from(abortSignals.keys());
}
