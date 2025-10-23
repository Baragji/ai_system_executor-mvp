import express from "express";
import type { Application } from "express";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountPlanRoutes, type PlanDeps } from "../../src/domains/plan/routes.js";

const OUTPUT_DIR = path.resolve("output");
const PROJECT_NAME = "Planner Demo";
const PROJECT_SLUG = "planner-demo";
const PROJECT_ROOT = path.join(OUTPUT_DIR, PROJECT_SLUG);
const META_PATH = path.join(PROJECT_ROOT, "_executor_meta.json");

async function removeProject(): Promise<void> {
  await fs.rm(PROJECT_ROOT, { recursive: true, force: true });
}

describe("plan routes", () => {
  let app: Application;
  let deps: PlanDeps;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await removeProject();

    deps = {
      slugify: vi.fn<PlanDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
      outputDir: OUTPUT_DIR,
      runTests: vi.fn<PlanDeps["runTests"]>().mockResolvedValue({ status: "pass" } as never),
      logEvent: vi.fn<PlanDeps["logEvent"]>().mockResolvedValue()
    } satisfies PlanDeps;

    mountPlanRoutes(app, deps);
  });

  afterEach(async () => {
    await removeProject();
    vi.restoreAllMocks();
  });

  describe("GET /api/plan/:project/failed-subtasks", () => {
    it("returns filtered subtask failures", async () => {
      await fs.mkdir(PROJECT_ROOT, { recursive: true });
      const meta = {
        subtaskResults: [
          { subtaskId: "1", status: "completed" },
          { subtaskId: "2", status: "failed", notes: "needs work" },
          { subtaskId: "3", status: "errored", testResult: { status: "fail", errorMessage: "boom" } },
          { subtaskId: "4", status: "skipped" }
        ]
      };
      await fs.writeFile(META_PATH, JSON.stringify(meta), "utf-8");

      const response = await request(app).get(`/api/plan/${PROJECT_NAME}/failed-subtasks`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        project: PROJECT_SLUG,
        failed: [
          { subtaskId: "2", status: "failed", reason: "needs work" },
          { subtaskId: "3", status: "errored", reason: "boom" },
          { subtaskId: "4", status: "skipped", reason: "unknown" }
        ]
      });
      expect(deps.slugify).toHaveBeenCalledWith(PROJECT_NAME, { lower: true, strict: true });
    });

    it("returns 500 when meta file is missing", async () => {
      const response = await request(app).get(`/api/plan/${PROJECT_NAME}/failed-subtasks`);
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: expect.stringContaining("ENOENT") });
    });
  });

  describe("POST /api/plan/:project/retest-subtask", () => {
    it("returns 404 when project is missing", async () => {
      const response = await request(app).post(`/api/plan/${PROJECT_NAME}/retest-subtask`).send({});
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "project not found" });
      expect(deps.runTests).not.toHaveBeenCalled();
    });

    it("runs tests and logs event when project exists", async () => {
      await fs.mkdir(PROJECT_ROOT, { recursive: true });
      const result = { status: "fail" } as never;
      (deps.runTests as ReturnType<typeof vi.fn>).mockResolvedValueOnce(result);

      const response = await request(app).post(`/api/plan/${PROJECT_NAME}/retest-subtask`).send({});

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ project: PROJECT_SLUG, result });
      expect(deps.runTests).toHaveBeenCalledWith({ projectRoot: PROJECT_ROOT, projectSlug: PROJECT_SLUG });
      expect(deps.logEvent).toHaveBeenCalledWith("test_run", {
        project: PROJECT_SLUG,
        stage: "retest-subtask",
        status: result.status
      });
    });

    it("returns 500 when sandbox fails", async () => {
      await fs.mkdir(PROJECT_ROOT, { recursive: true });
      const error = new Error("sandbox exploded");
      (deps.runTests as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const response = await request(app).post(`/api/plan/${PROJECT_NAME}/retest-subtask`).send({});

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "sandbox exploded" });
    });
  });
});
