import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { app } from "../src/server.js";

const OUTPUT_DIR = path.resolve("output");
const fixturesRoot = path.resolve("tests/fixtures");

describe.sequential("POST /api/run-tests", () => {
  beforeAll(async () => {
    await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.cp(path.join(fixturesRoot, "passing-project"), path.join(OUTPUT_DIR, "passing"), {
      recursive: true
    });
  });

  it("returns 404 for missing project", async () => {
    const res = await request(app).post("/api/run-tests").send({ project: "does-not-exist" });
    expect(res.status).toBe(404);
  });

  it("runs tests for an existing project", async () => {
    const res = await request(app).post("/api/run-tests").send({ project: "passing" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pass");
    expect(res.body.passCount).toBeGreaterThanOrEqual(0);
  });
});
