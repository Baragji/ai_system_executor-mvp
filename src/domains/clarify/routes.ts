import type { Application, Request, Response } from "express";
import { detectMissing } from "../../clarification/detectMissing.js";
import { generateQuestions } from "../../clarification/generateQuestions.js";
import { rememberClarificationQuestions } from "./session.js";
import { validateClarificationRequest } from "../../contracts/validators.js";
import { respondWithProblem } from "../../middleware/problemDetails.js";

// Mounts the /api/clarify route without changing behavior
export function mountClarifyRoutes(app: Application): void {
  app.post("/api/clarify", (req: Request, res: Response) => {
    try {
      const promptRaw = (req.body as unknown as { prompt?: unknown } | undefined)?.prompt;
      const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "";
      if (!prompt) {
        respondWithProblem(res, 400, "BadRequest", "prompt required", req.originalUrl || req.url || "/api/clarify");
        return;
      }

      const missing = detectMissing(prompt);
      const questions = generateQuestions(missing, prompt);
      rememberClarificationQuestions(prompt, questions);
      const payload = { questions } as const;
      const validation = validateClarificationRequest(payload);
      if (!validation.ok) {
        console.error("Clarification payload failed validation", validation.errors);
        respondWithProblem(
          res,
          500,
          "ClarificationContractViolation",
          "clarification contract violation",
          req.originalUrl || req.url || "/api/clarify"
        );
        return;
      }

      return res.json(payload);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "internal error";
      respondWithProblem(res, 500, "InternalServerError", message, req.originalUrl || req.url || "/api/clarify");
      return;
    }
  });
}
