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

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function problemDetailsEnabled(): boolean {
  return truthy(process.env.PROBLEM_DETAILS_ENABLED);
}

export function respondWithProblem(
  res: Response,
  status: number,
  title: string,
  detail: string,
  instance: string,
  extras?: Record<string, unknown>
): void {
  if (problemDetailsEnabled()) {
    const payload = toProblem(status, title, detail, instance);
    if (extras) {
      for (const [key, value] of Object.entries(extras)) {
        if (key in payload) continue;
        (payload as Record<string, unknown>)[key] = value;
      }
    }
    res.status(status);
    res.setHeader("Content-Type", "application/problem+json");
    res.json(payload);
    return;
  }

  const fallback: Record<string, unknown> = { error: detail };
  if (extras) {
    Object.assign(fallback, extras);
  }
  res.status(status).json(fallback);
}

/**
 * Installs an RFC 9457 error handler if PROBLEM_DETAILS_ENABLED is truthy.
 * Default-off to avoid breaking existing API error bodies.
 */
export function installProblemDetails(app: Express): void {
  if (!problemDetailsEnabled()) {
    return; // no-op by default
  }

  app.use(async (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    try {
      if (res.headersSent) return;
      const status = typeof (err as { status?: number }).status === "number" ? (err as { status?: number }).status! : 500;
      const message = (err as { message?: string })?.message || "internal error";
      const instance = req.originalUrl || req.url || "";
      respondWithProblem(res, status, status >= 500 ? "InternalServerError" : "BadRequest", message, instance);
    } catch {
      try {
        res.status(500).json({ error: "internal error" });
      } catch {
        // swallow
      }
    }
  });
}
