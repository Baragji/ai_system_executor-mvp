import { createHash } from "node:crypto";

import type { ClarificationQuestion } from "../../clarification/types.js";

const CLARIFICATION_SESSION_TTL_MS = 10 * 60 * 1000;

type ClarificationSession = {
  questions: ClarificationQuestion[];
  storedAt: number;
};

const clarificationSessions = new Map<string, ClarificationSession>();

function clarificationSessionKey(prompt: string): string | null {
  const normalized = prompt.trim();
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}

function purgeExpiredSessions(now: number) {
  for (const [key, entry] of clarificationSessions.entries()) {
    if (now - entry.storedAt > CLARIFICATION_SESSION_TTL_MS) {
      clarificationSessions.delete(key);
    }
  }
}

export function rememberClarificationQuestions(
  prompt: string,
  questions: ClarificationQuestion[]
) {
  if (!questions || questions.length === 0) return;
  const key = clarificationSessionKey(prompt);
  if (!key) return;
  const now = Date.now();
  purgeExpiredSessions(now);
  clarificationSessions.set(key, { questions, storedAt: now });
}

export function consumeClarificationQuestions(
  prompt: string
): ClarificationQuestion[] | undefined {
  const key = clarificationSessionKey(prompt);
  if (!key) return undefined;
  purgeExpiredSessions(Date.now());
  const entry = clarificationSessions.get(key);
  if (!entry) return undefined;
  clarificationSessions.delete(key);
  return entry.questions;
}
