import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import path from "node:path";
import { app } from "../../src/server.js";

const OUTPUT_DIR = path.resolve("output");
const slug = "api-files-test";
const projectRoot = path.join(OUTPUT_DIR, slug);

describe("GET /api/files/:project/:path", () => {
  beforeAll(async () => {
    await fs.mkdir(path.join(projectRoot, "src"), { recursive: true });
    await fs.writeFile(path.join(projectRoot, "src", "index.ts"), "export const x=1;\n", "utf-8");
  });
  afterAll(async () => {
    // leave output for inspection
  });

  it("returns content for valid file", async () => {
    const res = await request(app).get(`/api/files/${slug}/${encodeURIComponent("src/index.ts")}`);
    expect(res.status).toBe(200);
    expect(res.body.content).toContain("export const x");
  });

  it("returns 404 for missing file", async () => {
    const res = await request(app).get(`/api/files/${slug}/${encodeURIComponent("nope.txt")}`);
    expect(res.status).toBe(404);
  });

  it("blocks path traversal", async () => {
    const res = await request(app).get(`/api/files/${slug}/${encodeURIComponent("../../etc/passwd")}`);
    expect(res.status).toBe(403);
  });
});

