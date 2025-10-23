import express from "express";
import type { Application } from "express";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountRunnerRoutes, type RunnerDeps } from "../../src/domains/runner/routes.js";

const OUTPUT_DIR = path.resolve("output");
const PROJECT_NAME = "Example Project";
const PROJECT_SLUG = "example-project";

async function removeProject(slug: string): Promise<void> {
  await fs.rm(path.join(OUTPUT_DIR, slug), { recursive: true, force: true });
}

describe("runner routes", () => {
  let app: Application;
  let deps: RunnerDeps;
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await removeProject(PROJECT_SLUG);

    logError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const runTests = vi.fn<RunnerDeps["runTests"]>().mockResolvedValue({ status: "pass" } as never);
    const logEvent = vi.fn<RunnerDeps["logEvent"]>().mockResolvedValue();

    deps = {
      slugify: vi.fn<RunnerDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
      outputDir: OUTPUT_DIR,
      runTests,
      logEvent
    } satisfies RunnerDeps;

    mountRunnerRoutes(app, deps);
  });

  afterEach(async () => {
    await removeProject(PROJECT_SLUG);
    vi.restoreAllMocks();
  });

  it("returns 400 when project is missing", async () => {
    const response = await request(app).post("/api/run-tests").send({});
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "project required" });
    expect(deps.runTests).not.toHaveBeenCalled();
  });

  it("returns 404 when project folder does not exist", async () => {
    const response = await request(app).post("/api/run-tests").send({ project: PROJECT_NAME });
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "project not found" });
    expect(deps.runTests).not.toHaveBeenCalled();
  });

  it("runs tests for existing project and logs event", async () => {
    const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
    await fs.mkdir(projectRoot, { recursive: true });

    const result = { status: "pass", details: { ok: true } } as never;
    (deps.runTests as ReturnType<typeof vi.fn>).mockResolvedValueOnce(result);

    const response = await request(app).post("/api/run-tests").send({ project: PROJECT_NAME });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(deps.runTests).toHaveBeenCalledWith({ projectRoot, projectSlug: PROJECT_SLUG });
    expect(deps.logEvent).toHaveBeenCalledWith("test_run", {
      project: PROJECT_SLUG,
      stage: "manual",
      status: result.status
    });
  });

  it("returns 500 when runner throws", async () => {
    const projectRoot = path.join(OUTPUT_DIR, PROJECT_SLUG);
    await fs.mkdir(projectRoot, { recursive: true });
    const error = new Error("boom");
    (deps.runTests as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    const response = await request(app).post("/api/run-tests").send({ project: PROJECT_NAME });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "boom" });
    expect(logError).toHaveBeenCalledWith(error);
  });
});
