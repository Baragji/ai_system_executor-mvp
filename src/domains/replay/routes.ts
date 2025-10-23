import type { Application, Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";

import type { ExecutorFile } from "../../executor/types.js";
import type { RunInSandboxOptions } from "../../runner/runInSandbox.js";
import type { RunResult } from "../../contracts/validators.js";
import type { MultiTurnContext } from "../../repair/multiTurnRepair.js";
import type { RepairHistory } from "../../contracts/repairHistoryValidator.js";

export type ReplayDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  outputDir: string;
  readFixture: <T = unknown>(slug: string, sessionId: string, relPath: string) => Promise<T>;
  multiTurnRepair: (context: MultiTurnContext) => Promise<RepairHistory>;
  writeFiles: (rootDir: string, files: ExecutorFile[]) => Promise<void>;
  ensureDefaultExportForApp: (rootDir: string) => Promise<void>;
  runTests: (options: RunInSandboxOptions) => Promise<RunResult>;
  logEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>;
};

interface ReplayRepairRequestBody {
  project?: unknown;
  sessionId?: unknown;
}

interface ReplaySubtaskRequestBody extends ReplayRepairRequestBody {
  subtaskId?: unknown;
}

export function mountReplayRoutes(app: Application, deps: ReplayDeps): void {
  const {
    slugify,
    outputDir,
    readFixture,
    multiTurnRepair,
    writeFiles,
    ensureDefaultExportForApp,
    runTests,
    logEvent
  } = deps;

  app.post("/api/replay/repair", async (req: Request, res: Response) => {
    try {
      const body = (req.body as ReplayRepairRequestBody | undefined) ?? {};
      const project = (body.project ?? "").toString();
      const sessionId = (body.sessionId ?? "").toString();
      if (!project || !sessionId) {
        return res.status(400).json({ error: "project and sessionId required" });
      }

      const slug = slugify(project, { lower: true, strict: true });
      const context = await readFixture<MultiTurnContext>(slug, sessionId, path.join("repair", "context.json")).catch(
        () => null
      );
      if (!context) {
        return res.status(404).json({ error: "repair context fixture not found" });
      }

      const history = await multiTurnRepair(context);
      return res.json({ project: slug, sessionId, history });
    } catch (err) {
      const message = (err as Error).message || "internal error";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/replay/subtask", async (req: Request, res: Response) => {
    try {
      const body = (req.body as ReplaySubtaskRequestBody | undefined) ?? {};
      const project = (body.project ?? "").toString();
      const sessionId = (body.sessionId ?? "").toString();
      const subtaskId = (body.subtaskId ?? "").toString();
      if (!project || !sessionId || !subtaskId) {
        return res.status(400).json({ error: "project, sessionId, and subtaskId required" });
      }

      const slug = slugify(project, { lower: true, strict: true });
      const projectRoot = path.join(outputDir, slug);
      try {
        await fs.access(projectRoot);
      } catch {
        return res.status(404).json({ error: "project not found" });
      }

      type FixtureOutput = { files?: ExecutorFile[] };
      const output = await readFixture<FixtureOutput>(
        slug,
        sessionId,
        path.join("subtasks", subtaskId, "output.json")
      ).catch(() => null);
      if (!output || !Array.isArray(output.files)) {
        return res.status(404).json({ error: "subtask output fixture not found or invalid" });
      }

      await writeFiles(projectRoot, output.files);
      await ensureDefaultExportForApp(projectRoot);

      const result = await runTests({ projectRoot, projectSlug: slug });
      await logEvent("test_run", { project: slug, stage: `replay-subtask:${subtaskId}`, status: result.status });
      return res.json({ ok: true, project: slug, subtaskId, result });
    } catch (err) {
      const message = (err as Error).message || "internal error";
      return res.status(500).json({ error: message });
    }
  });
}
