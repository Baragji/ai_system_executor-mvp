import express from "express";
import type { Application } from "express";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountReplayRoutes, type ReplayDeps } from "../../src/domains/replay/routes.js";

const OUTPUT_DIR = path.resolve("output");
const PROJECT_NAME = "Replay Demo";
const PROJECT_SLUG = "replay-demo";
const SESSION_ID = "session-1";
const SUBTASK_ID = "subtask-7";

async function removeProject(): Promise<void> {
  await fs.rm(path.join(OUTPUT_DIR, PROJECT_SLUG), { recursive: true, force: true });
}

describe("replay routes", () => {
  let app: Application;
  let deps: ReplayDeps;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await removeProject();

    deps = {
      slugify: vi.fn<ReplayDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
      outputDir: OUTPUT_DIR,
      readFixture: vi.fn<ReplayDeps["readFixture"]>().mockResolvedValue({} as never),
      multiTurnRepair: vi.fn<ReplayDeps["multiTurnRepair"]>().mockResolvedValue({ steps: [] } as never),
      writeFiles: vi.fn<ReplayDeps["writeFiles"]>().mockResolvedValue(),
      ensureDefaultExportForApp: vi.fn<ReplayDeps["ensureDefaultExportForApp"]>().mockResolvedValue(),
      runTests: vi.fn<ReplayDeps["runTests"]>().mockResolvedValue({ status: "pass" } as never),
      logEvent: vi.fn<ReplayDeps["logEvent"]>().mockResolvedValue()
    } satisfies ReplayDeps;

    mountReplayRoutes(app, deps);
  });

  afterEach(async () => {
    await removeProject();
    vi.restoreAllMocks();
  });

  describe("POST /api/replay/repair", () => {
    it("returns 400 when required fields are missing", async () => {
      const response = await request(app).post("/api/replay/repair").send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "project and sessionId required" });
    });

    it("returns 404 when fixture is missing", async () => {
      (deps.readFixture as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("missing"));
      const response = await request(app)
        .post("/api/replay/repair")
        .send({ project: PROJECT_NAME, sessionId: SESSION_ID });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "repair context fixture not found" });
    });

    it("returns history when repair succeeds", async () => {
      const context = { prompt: "hello" } as never;
      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce(context);
      const history = { steps: [{ id: 1 }] } as never;
      (deps.multiTurnRepair as ReturnType<typeof vi.fn>).mockResolvedValueOnce(history);

      const response = await request(app)
        .post("/api/replay/repair")
        .send({ project: PROJECT_NAME, sessionId: SESSION_ID });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ project: PROJECT_SLUG, sessionId: SESSION_ID, history });
      expect(deps.readFixture).toHaveBeenCalledWith(
        PROJECT_SLUG,
        SESSION_ID,
        path.join("repair", "context.json")
      );
      expect(deps.multiTurnRepair).toHaveBeenCalledWith(context);
    });

    it("returns 500 when repair throws", async () => {
      const context = { prompt: "boom" } as never;
      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce(context);
      const error = new Error("repair failed");
      (deps.multiTurnRepair as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const response = await request(app)
        .post("/api/replay/repair")
        .send({ project: PROJECT_NAME, sessionId: SESSION_ID });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "repair failed" });
    });
  });

  describe("POST /api/replay/subtask", () => {
    it("returns 400 when fields are missing", async () => {
      const response = await request(app).post("/api/replay/subtask").send({ project: PROJECT_NAME });
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "project, sessionId, and subtaskId required" });
    });

    it("returns 404 when project folder is missing", async () => {
      const response = await request(app)
        .post("/api/replay/subtask")
        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "project not found" });
    });

    it("returns 404 when fixture output is invalid", async () => {
      const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
      await fs.mkdir(projectRoot, { recursive: true });
      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const response = await request(app)
        .post("/api/replay/subtask")
        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "subtask output fixture not found or invalid" });
    });

    it("replays subtask, writes files, and logs event", async () => {
      const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
      await fs.mkdir(projectRoot, { recursive: true });
      const files = [{ path: "index.ts", contents: "export const x = 1;" }] as never;
      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ files });
      const runResult = { status: "fail", details: { reason: "tests" } } as never;
      (deps.runTests as ReturnType<typeof vi.fn>).mockResolvedValueOnce(runResult);

      const response = await request(app)
        .post("/api/replay/subtask")
        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true, project: PROJECT_SLUG, subtaskId: SUBTASK_ID, result: runResult });
      expect(deps.writeFiles).toHaveBeenCalledWith(projectRoot, files);
      expect(deps.ensureDefaultExportForApp).toHaveBeenCalledWith(projectRoot);
      expect(deps.runTests).toHaveBeenCalledWith({ projectRoot, projectSlug: PROJECT_SLUG });
      expect(deps.logEvent).toHaveBeenCalledWith("test_run", {
        project: PROJECT_SLUG,
        stage: `replay-subtask:${SUBTASK_ID}`,
        status: runResult.status
      });
    });

    it("returns 500 when sandbox fails", async () => {
      const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
      await fs.mkdir(projectRoot, { recursive: true });
      (deps.readFixture as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        files: [{ path: "index.ts", contents: "" }]
      });
      const error = new Error("sandbox failed");
      (deps.runTests as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const response = await request(app)
        .post("/api/replay/subtask")
        .send({ project: PROJECT_NAME, sessionId: SESSION_ID, subtaskId: SUBTASK_ID });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "sandbox failed" });
    });
  });
});
