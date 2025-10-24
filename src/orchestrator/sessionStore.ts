import { OrchestratorStateMachine, type OrchestratorState } from "./stateMachine.js";
import type { PendingQuestion } from "./checkpoints.js";

export type ProgressSnapshot = {
  stage: string;
  progress: number;
  data?: Record<string, unknown>;
  updatedAt: number;
  done?: boolean;
  state?: OrchestratorState;
  paused?: boolean;
  questions?: PendingQuestion[];
  checkpointUpdatedAt?: string;
};

export interface OrchestrationSession {
  machine: OrchestratorStateMachine;
  paused: boolean;
  questions: PendingQuestion[];
  checkpointUpdatedAt?: string;
  projectSlug?: string;
  originalPrompt?: string;
  effectivePrompt?: string;
  projectName?: string;
}

const progressSessions = new Map<string, ProgressSnapshot>();
const orchestrationSessions = new Map<string, OrchestrationSession>();

export const PROGRESS_SESSION_TTL_MS = Number(process.env.PROGRESS_SESSION_TTL_MS ?? 15 * 60 * 1000);

export function ensureOrchestrationSession(sessionId: string): OrchestrationSession {
  let session = orchestrationSessions.get(sessionId);
  if (!session) {
    session = { machine: new OrchestratorStateMachine(), paused: false, questions: [] };
    orchestrationSessions.set(sessionId, session);
  }
  return session;
}

export function getOrchestrationSession(sessionId: string): OrchestrationSession | undefined {
  return orchestrationSessions.get(sessionId);
}

export function removeOrchestrationSession(sessionId: string): void {
  orchestrationSessions.delete(sessionId);
}

export function setProgressSnapshot(sessionId: string, snapshot: ProgressSnapshot): void {
  progressSessions.set(sessionId, snapshot);
}

export function getProgressSnapshot(sessionId: string): ProgressSnapshot | undefined {
  return progressSessions.get(sessionId);
}

export function deleteProgressSnapshot(sessionId: string): void {
  progressSessions.delete(sessionId);
}

export function forEachProgressSnapshot(cb: (sessionId: string, snapshot: ProgressSnapshot) => void): void {
  for (const [sessionId, snapshot] of progressSessions.entries()) {
    cb(sessionId, snapshot);
  }
}

export function clearProgressSnapshots(): void {
  progressSessions.clear();
}

export function clearOrchestrationSessions(): void {
  orchestrationSessions.clear();
}
