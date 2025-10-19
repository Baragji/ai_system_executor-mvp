import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

async function createTestApp() {
  const mod = await import("../../src/server.js");
  return mod.createApp();
}

async function createTempProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "executor-"));
  return dir;
}

describe("POST /validate", () => {
  let tempDirs: string[] = [];

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    tempDirs = [];
  });

  afterEach(async () => {
    for (const dir of tempDirs) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("returns validation result for existing files", async () => {
    const projectRoot = await createTempProject();
    tempDirs.push(projectRoot);
    await fs.mkdir(path.join(projectRoot, "src"), { recursive: true });
    await fs.writeFile(path.join(projectRoot, "src/index.ts"), "export const value = 1;", "utf-8");

    const app = await createTestApp();

    const response = await request(app)
      .post("/validate")
      .send({
        projectRoot,
        paths: ["src/index.ts"],
      })
      .expect(200);

    expect(response.body).toEqual({ ok: true, missing: [], empty: [] });
  });

  it("reports missing files", async () => {
    const projectRoot = await createTempProject();
    tempDirs.push(projectRoot);

    const app = await createTestApp();

    const response = await request(app)
      .post("/validate")
      .send({
        projectRoot,
        paths: ["src/missing.ts"],
      })
      .expect(200);

    expect(response.body).toEqual({ ok: false, missing: ["src/missing.ts"], empty: [] });
  });

  it("rejects invalid payloads", async () => {
    const app = await createTestApp();

    const response = await request(app)
      .post("/validate")
      .send({ projectRoot: "" })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({ pointer: "/projectRoot" }),
        expect.objectContaining({ pointer: "/paths" }),
      ]),
    });
  });

  it("rejects absolute paths", async () => {
    const projectRoot = await createTempProject();
    tempDirs.push(projectRoot);

    const app = await createTestApp();

    const response = await request(app)
      .post("/validate")
      .send({
        projectRoot,
        paths: [path.join(projectRoot, "src/index.ts")],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      errors: [
        expect.objectContaining({ pointer: "/paths/0" }),
      ],
    });
  });
});
