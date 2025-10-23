import express from "express";
import type { Application } from "express";
import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountRunnerRoutes, type RunnerDeps } from "../../../src/domains/runner/routes.ts";

const OUTPUT_DIR = path.resolve("output");
const fixturesRoot = path.resolve("tests/fixtures");
const PROJECT_NAME = "Passing Project";
const PROJECT_SLUG = "passing";

describe.sequential("runner routes", () => {
  let app: Application;
  let deps: RunnerDeps;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.rm(path.join(OUTPUT_DIR, PROJECT_SLUG), { recursive: true, force: true });
    await fs.cp(path.join(fixturesRoot, "passing-project"), path.join(OUTPUT_DIR, PROJECT_SLUG), {
      recursive: true
    });

    deps = {
      slugify: vi.fn<RunnerDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
      outputDir: OUTPUT_DIR,
      runTests: vi.fn<RunnerDeps["runTests"]>().mockResolvedValue({ status: "pass" } as never),
      logEvent: vi.fn<RunnerDeps["logEvent"]>().mockResolvedValue()
    } satisfies RunnerDeps;

    mountRunnerRoutes(app, deps);
  });

  afterEach(async () => {
    await fs.rm(path.join(OUTPUT_DIR, PROJECT_SLUG), { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("returns 404 for missing project", async () => {
    deps.slugify.mockReturnValueOnce("non-existent");
    const res = await request(app).post("/api/run-tests").send({ project: "does-not-exist" });
    expect(res.status).toBe(404);
    expect(deps.runTests).not.toHaveBeenCalled();
  });

  it("runs tests for an existing project", async () => {
    const res = await request(app).post("/api/run-tests").send({ project: PROJECT_NAME });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pass");
    expect(deps.runTests).toHaveBeenCalledWith({ projectRoot: path.join(OUTPUT_DIR, PROJECT_SLUG), projectSlug: PROJECT_SLUG });
    expect(deps.logEvent).toHaveBeenCalledWith("test_run", { project: PROJECT_SLUG, stage: "manual", status: "pass" });
  });
});
