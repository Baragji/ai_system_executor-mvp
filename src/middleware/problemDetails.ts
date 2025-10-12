import type { Express, NextFunction, Request, Response } from "express";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: unknown;
}

export function toProblem(status: number, title: string, detail: string, instance: string, type = "about:blank"): ProblemDetails {
  return {
    type,
    title,
    status,
    detail,
    instance,
    "urn:ts": new Date().toISOString()
  };
}

/**
 * Installs an RFC 9457 error handler if PROBLEM_DETAILS_ENABLED is truthy.
 * Default-off to avoid breaking existing API error bodies.
 */
export function installProblemDetails(app: Express): void {
  const enabled = String(process.env.PROBLEM_DETAILS_ENABLED || "").trim();
  if (!enabled || enabled === "0" || enabled.toLowerCase() === "false") {
    return; // no-op by default
  }

  app.use(async (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    try {
      if (res.headersSent) return;
      const status = typeof (err as { status?: number }).status === "number" ? (err as { status?: number }).status! : 500;
      const message = (err as { message?: string })?.message || "internal error";
      const instance = req.originalUrl || req.url || "";
      const pd = toProblem(status, status >= 500 ? "InternalServerError" : "BadRequest", message, instance);
      res.status(status);
      res.setHeader("Content-Type", "application/problem+json");
      res.json(pd);
    } catch {
      try {
        res.status(500).json({ error: "internal error" });
      } catch {
        // swallow
      }
    }
  });
}
