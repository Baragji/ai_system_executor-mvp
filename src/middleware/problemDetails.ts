import type { Express, NextFunction, Request, Response } from "express";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  occurred_at?: string;
  [key: string]: unknown;
}

export interface ValidationError {
  pointer: string;
  detail: string;
}

/**
 * Get HTTP reason phrase for status code (RFC 9110)
 * Used for about:blank type to provide standard titles
 */
function getHttpReasonPhrase(status: number): string {
  const phrases: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Content',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return phrases[status] || 'Error';
}

export function toProblem(status: number, title: string, detail: string, instance: string, type = "about:blank"): ProblemDetails {
  const problem: ProblemDetails = {
    type,
    title: type === 'about:blank' ? getHttpReasonPhrase(status) : title,
    status,
    detail,
    instance,
    occurred_at: new Date().toISOString()
  };
  return problem;
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/**
 * Check if RFC 9457 problem details are enabled
 * Phase 19 T0: Default-on in dev/test, default-off in prod
 */
export function problemDetailsEnabled(): boolean {
  const env = process.env.PROBLEM_DETAILS_ENABLED;

  // If explicitly set, respect the setting
  if (env !== undefined) {
    return truthy(env);
  }

  // Auto-enable in dev/test, disable in production
  const nodeEnv = process.env.NODE_ENV;
  return nodeEnv === 'development' || nodeEnv === 'test';
}

/**
 * Helper to create validation error problem details with JSON Pointer format (RFC 9457 §3.1)
 *
 * @example
 * toValidationProblem(req.path, 'Request validation failed', [
 *   { pointer: '#/prompt', detail: 'Required field missing' },
 *   { pointer: '#/maxTokens', detail: 'Must be a positive integer' }
 * ])
 */
export function toValidationProblem(
  instance: string,
  detail: string,
  errors: ValidationError[]
): ProblemDetails {
  return {
    type: 'https://api.executor-mvp.com/problems/validation-error',
    title: 'Bad Request',
    status: 400,
    detail,
    instance,
    occurred_at: new Date().toISOString(),
    errors
  };
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
    // Explicitly include charset per best practice and to avoid any proxy/content-type normalization issues
    res.setHeader("Content-Type", "application/problem+json; charset=utf-8");
    res.json(payload);
    return;
  }

  const fallback: Record<string, unknown> = { error: detail };
  if (extras) {
    Object.assign(fallback, extras);
  }
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json(fallback);
}

/**
 * Installs an RFC 9457 error handler
 * Phase 19 T0: Default-on in dev/test, default-off in production
 */
export function installProblemDetails(app: Express): void {
  if (!problemDetailsEnabled()) {
    return; // no-op in production by default
  }

  app.use(async (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    try {
      if (res.headersSent) return;
      const status = typeof (err as { status?: number }).status === "number" ? (err as { status?: number }).status! : 500;
      const message = (err as { message?: string })?.message || "Internal error occurred";
      const instance = req.originalUrl || req.url || "";

      // Use HTTP reason phrase for generic errors (about:blank type)
      const title = getHttpReasonPhrase(status);
      respondWithProblem(res, status, title, message, instance);
    } catch {
      try {
        res.status(500).json({ error: "internal error" });
      } catch {
        // swallow
      }
    }
  });
}
