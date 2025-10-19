import { createHash } from "node:crypto";

import { Router, type Request, type Response } from "express";

import { detectMissing } from "../../../../src/clarification/detectMissing.js";
import { generateQuestions } from "../../../../src/clarification/generateQuestions.js";
import type { ClarificationQuestion } from "../../../../src/clarification/types.js";
import { validateClarificationRequest } from "../../../../src/contracts/validators.js";
import { respondWithProblem } from "../middleware/problemDetails.js";

const CLARIFICATION_SESSION_TTL_MS = 10 * 60 * 1000;

type ClarificationSession = {
  questions: ClarificationQuestion[];
  storedAt: number;
};

const clarificationSessions = new Map<string, ClarificationSession>();

function clarificationSessionKey(prompt: string): string | null {
  const normalized = prompt.trim();
  if (!normalized) {
    return null;
  }
  return createHash("sha256").update(normalized).digest("hex");
}

function purgeExpiredSessions(now: number): void {
  for (const [key, entry] of clarificationSessions.entries()) {
    if (now - entry.storedAt > CLARIFICATION_SESSION_TTL_MS) {
      clarificationSessions.delete(key);
    }
  }
}

function rememberClarificationQuestions(prompt: string, questions: ClarificationQuestion[]): void {
  if (questions.length === 0) {
    return;
  }
  const key = clarificationSessionKey(prompt);
  if (!key) {
    return;
  }
  const now = Date.now();
  purgeExpiredSessions(now);
  clarificationSessions.set(key, { questions, storedAt: now });
}

function getInstance(req: Request): string {
  return req.originalUrl || req.url || "/clarify";
}

export function createClarifyRouter(): Router {
  const router = Router();

  router.post("/clarify", (req: Request, res: Response) => {
    try {
      const promptRaw = req.body?.prompt;
      const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
      if (!prompt) {
        respondWithProblem(res, 400, "BadRequest", "prompt required", getInstance(req));
        return;
      }

      const missing = detectMissing(prompt);
      const questions = generateQuestions(missing, prompt);
      rememberClarificationQuestions(prompt, questions);
      const payload = { questions };
      const validation = validateClarificationRequest(payload);
      if (!validation.ok) {
        console.error("Clarification payload failed validation", validation.errors);
        respondWithProblem(res, 500, "ClarificationContractViolation", "clarification contract violation", getInstance(req));
        return;
      }

      res.json(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "internal error";
      console.error("[/clarify] unexpected error", error);
      respondWithProblem(res, 500, "InternalServerError", message, getInstance(req));
    }
  });

  return router;
}

export function __clearClarificationSessionsForTests(): void {
  clarificationSessions.clear();
}
