import type { Application, Request, Response } from "express";

export interface ProgressDeps {
  openProgressStream: (req: Request, res: Response, sessionId: string) => void;
  getProgress: (sessionId: string) => unknown | null;
}

// Mounts /api/progress endpoints using injected helpers from server.ts
export function mountProgressRoutes(app: Application, deps: ProgressDeps): void {
  const { openProgressStream, getProgress } = deps;

  app.get("/api/progress/:sessionId", (req, res) => {
    const { sessionId } = req.params as { sessionId: string };
    openProgressStream(req, res, sessionId);
  });

  // JSON snapshot endpoint retained for polling fallbacks
  app.get("/api/progress/snapshot/:sessionId", (req, res) => {
    const { sessionId } = req.params as { sessionId: string };
    const snap = getProgress(sessionId);
    if (!snap) {
      return res.status(404).json({ error: "session not found" });
    }
    return res.json(snap);
  });

  // Legacy SSE alias for compatibility
  app.get("/api/progress/stream/:sessionId", (req, res) => {
    const { sessionId } = req.params as { sessionId: string };
    openProgressStream(req, res, sessionId);
  });
}
