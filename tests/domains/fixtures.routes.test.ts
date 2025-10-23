import express from "express";
import type { Application } from "express";
import request from "supertest";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mountFixturesRoutes, type FixturesDeps } from "../../src/domains/fixtures/routes.js";

describe("fixtures routes", () => {
  let app: Application;
  let deps: FixturesDeps;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    deps = {
      slugify: vi.fn<FixturesDeps["slugify"]>().mockImplementation(value => value.toLowerCase()),
      listFixtures: vi.fn<FixturesDeps["listFixtures"]>().mockResolvedValue({ session: ["a"] })
    } satisfies FixturesDeps;
    mountFixturesRoutes(app, deps);
  });

  it("returns sessions for a slugified project", async () => {
    const response = await request(app).get("/api/fixtures/My Project");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ project: "my project", sessions: { session: ["a"] } });
    expect(deps.slugify).toHaveBeenCalledWith("My Project", { lower: true, strict: true });
    expect(deps.listFixtures).toHaveBeenCalledWith("my project");
  });

  it("propagates errors as 500 responses", async () => {
    (deps.listFixtures as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("nope"));
    const response = await request(app).get("/api/fixtures/test");
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "nope" });
  });
});
