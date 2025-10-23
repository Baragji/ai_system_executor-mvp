import express from "express";
import type { Application } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountFixturesRoutes, type FixturesDeps } from "../../../src/domains/fixtures/routes.ts";
import { writeFixture, listFixtures } from "../../../src/fixtures/index.ts";

const PROJECT_NAME = "Fixtures Demo";
const PROJECT_SLUG = "fixtures-demo";

describe("fixtures routes", () => {
  let app: Application;
  let deps: FixturesDeps;

  beforeEach(async () => {
    app = express();
    app.use(express.json());

    deps = {
      slugify: vi.fn<FixturesDeps["slugify"]>().mockReturnValue(PROJECT_SLUG),
      listFixtures
    } satisfies FixturesDeps;

    mountFixturesRoutes(app, deps);
  });

  afterEach(async () => {
    await fs.rm(path.resolve(".automation", "fixtures", PROJECT_SLUG), { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("lists fixtures for project (empty ok)", async () => {
    const res = await request(app).get(`/api/fixtures/${PROJECT_NAME}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("project", PROJECT_SLUG);
    expect(res.body).toHaveProperty("sessions");
    expect(typeof res.body.sessions).toBe("object");
  });
  it("lists created fixture in sessions map", async () => {
    const sessionId = "session-happy";
    const relPath = "context/example.json";
    await writeFixture(PROJECT_SLUG, sessionId, relPath, { ok: true });

    try {
      const res = await request(app).get(`/api/fixtures/${PROJECT_NAME}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("project", PROJECT_SLUG);
      expect(res.body).toHaveProperty("sessions");
      expect(res.body.sessions).toHaveProperty(sessionId);
      expect(res.body.sessions[sessionId]).toContain(relPath);
    } finally {
      await fs.rm(path.resolve(".automation", "fixtures", PROJECT_SLUG, sessionId), { recursive: true, force: true });
    }
  });
});
