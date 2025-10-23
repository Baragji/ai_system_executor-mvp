import type { Application, Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";

import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
import type { RunResult } from "../../contracts/validators.js";

export type RunnerDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  outputDir: string;
  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
};

interface RunTestsRequestBody {
  project?: unknown;
}

export function mountRunnerRoutes(app: Application, deps: RunnerDeps): void {
  const { slugify, outputDir, runTests, logEvent } = deps;

  app.post("/api/run-tests", async (req: Request, res: Response) => {
    try {
      const projectRaw = (req.body as RunTestsRequestBody | undefined)?.project;
      const project = (projectRaw ?? "").toString();
      if (!project) {
        return res.status(400).json({ error: "project required" });
      }

      const slug = slugify(project, { lower: true, strict: true });
      const projectRoot = path.join(outputDir, slug);

      try {
        await fs.access(projectRoot);
      } catch {
        return res.status(404).json({ error: "project not found" });
      }

      const run = await runTests({ projectRoot, projectSlug: slug });
      await logEvent("test_run", { project: slug, stage: "manual", status: run.status });
      return res.json(run);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "internal error";
      return res.status(500).json({ error: message });
    }
  });
}
