import type { Application, Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";

import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
import type { RunResult } from "../../contracts/validators.js";

export type PlanDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  outputDir: string;
  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
};

export function mountPlanRoutes(app: Application, deps: PlanDeps): void {
  const { slugify, outputDir, runTests, logEvent } = deps;

  app.get("/api/plan/:project/failed-subtasks", async (req: Request, res: Response) => {
    try {
      const { project } = req.params as { project: string };
      const slug = slugify(project, { lower: true, strict: true });
      const projectRoot = path.join(outputDir, slug);
      const metaPath = path.join(projectRoot, "_executor_meta.json");
      const buf = await fs.readFile(metaPath, "utf-8");
      const meta = JSON.parse(buf) as {
        subtaskResults?: Array<{
          subtaskId: string;
          status: string;
          notes?: string;
          testResult?: { status: string; errorMessage?: string } | null;
        }>;
      };
      const failed = (meta.subtaskResults ?? [])
        .filter((result) => result.status !== "completed")
        .map((result) => ({
          subtaskId: result.subtaskId,
          status: result.status,
          reason: result.testResult?.errorMessage || result.notes || "unknown"
        }));
      return res.json({ project: slug, failed });
    } catch (err) {
      const message = (err as Error).message || "internal error";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/plan/:project/retest-subtask", async (req: Request, res: Response) => {
    try {
      const { project } = req.params as { project: string };
      const slug = slugify(project, { lower: true, strict: true });
      const projectRoot = path.join(outputDir, slug);
      try {
        await fs.access(projectRoot);
      } catch {
        return res.status(404).json({ error: "project not found" });
      }

      const result = await runTests({ projectRoot, projectSlug: slug });
      await logEvent("test_run", { project: slug, stage: "retest-subtask", status: result.status });
      return res.json({ project: slug, result });
    } catch (err) {
      const message = (err as Error).message || "internal error";
      return res.status(500).json({ error: message });
    }
  });
}
