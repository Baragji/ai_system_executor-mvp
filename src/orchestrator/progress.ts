import type { Request, Response } from "express";

import {
  type ProgressSnapshot,
  ensureOrchestrationSession,
  getOrchestrationSession,
  getProgressSnapshot,
  removeOrchestrationSession,
  setProgressSnapshot
} from "./sessionStore.js";
import { mapStageToState, stateToStage } from "./stateMapper.js";
import { purgeExpiredProgressSessions } from "./ttl.js";

export function setProgress(
  sessionId: string | undefined,
  stage: string,
  progress: number,
  data?: Record<string, unknown>,
  done?: boolean
): void {
  if (!sessionId) return;
  purgeExpiredProgressSessions(Date.now());
  const session = ensureOrchestrationSession(sessionId);

  if (!session.paused) {
    const target = mapStageToState(stage, done);
    if (done === true) {
      const current = session.machine.state;
      if (current !== "DONE") {
        if (current !== "GENERATING") {
          try {
            session.machine.transition("GENERATING", { reason: `progress:${stage}:pre_done` });
          } catch (err) {
            console.warn(`Failed pre-done GENERATING transition for ${sessionId}:`, err);
          }
        }
        try {
          session.machine.transition("DONE", { reason: `progress:${stage}:done` });
        } catch (err) {
          console.warn(`Failed to transition orchestrator for ${sessionId}:`, err);
        }
      }
    } else if (target && target !== session.machine.state && target !== "PAUSED") {
      try {
        session.machine.transition(target, { reason: `progress:${stage}` });
      } catch (err) {
        console.warn(`Failed to transition orchestrator for ${sessionId}:`, err);
      }
    }
    if (done) {
      session.paused = false;
      session.questions = [];
      removeOrchestrationSession(sessionId);
    }
  }

  setProgressSnapshot(sessionId, {
    stage,
    progress,
    data,
    updatedAt: Date.now(),
    done,
    state: session.machine.state,
    paused: session.paused,
    questions: session.questions,
    checkpointUpdatedAt: session.checkpointUpdatedAt
  });
}

export function getProgress(sessionId: string): ProgressSnapshot | null {
  const snap = getProgressSnapshot(sessionId) ?? null;
  if (!snap) {
    const session = getOrchestrationSession(sessionId);
    if (!session) {
      return null;
    }
    return {
      stage: stateToStage(session.machine.state),
      progress: 0,
      updatedAt: Date.now(),
      done: false,
      state: session.machine.state,
      paused: session.paused,
      questions: session.questions,
      checkpointUpdatedAt: session.checkpointUpdatedAt
    };
  }
  return snap;
}

export function snapshotFromSession(sessionId: string, fallback?: ReturnType<typeof getProgressSnapshot> | null) {
  const session = ensureOrchestrationSession(sessionId);
  const existing = fallback ?? getProgressSnapshot(sessionId) ?? null;
  const baseStage = existing?.stage ?? stateToStage(session.machine.state);
  return {
    stage: baseStage,
    progress: existing?.progress ?? 0,
    data: existing?.data,
    updatedAt: Date.now(),
    done: existing?.done ?? false,
    state: session.machine.state,
    paused: session.paused,
    questions: session.questions,
    checkpointUpdatedAt: session.checkpointUpdatedAt
  };
}

export function openProgressStream(req: Request, res: Response, sessionId: string): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = () => {
    const snap = getProgress(sessionId);
    if (snap) {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify(snap)}\n\n`);
      if (snap.done) {
        clearInterval(timer);
        res.end();
      }
    }
  };

  const timer = setInterval(send, 1000);
  send();

  const close = () => {
    clearInterval(timer);
    res.end();
  };

  req.on("close", close);
  req.on("error", close);
}
