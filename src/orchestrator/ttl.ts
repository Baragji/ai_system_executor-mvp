import { deleteProgressSnapshot, forEachProgressSnapshot, PROGRESS_SESSION_TTL_MS, removeOrchestrationSession } from "./sessionStore.js";

export function purgeExpiredProgressSessions(now: number): void {
  const expired: string[] = [];
  forEachProgressSnapshot((sessionId, snapshot) => {
    if (snapshot.done && now - snapshot.updatedAt > PROGRESS_SESSION_TTL_MS) {
      expired.push(sessionId);
    }
  });

  for (const sessionId of expired) {
    deleteProgressSnapshot(sessionId);
    removeOrchestrationSession(sessionId);
  }
}
