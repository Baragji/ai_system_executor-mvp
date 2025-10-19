import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/server.js";
import { __clearClarificationSessionsForTests } from "../src/routes/clarify.js";
import * as telemetry from "../src/telemetry/otel.js";

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.PROBLEM_DETAILS_ENABLED = "1";
  delete process.env.OTEL_ENABLED;
  __clearClarificationSessionsForTests();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("clarification service", () => {
  it("returns health status", async () => {
    const app = createApp();

    const response = await request(app).get("/healthz").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns RFC 9457 problem details for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/missing").expect(404);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 404,
      title: "Not Found",
      detail: "Resource not found",
      instance: "/missing",
      method: "GET",
    });
  });

  it("rejects requests without a prompt", async () => {
    const app = createApp();

    const response = await request(app).post("/clarify").send({}).expect(400);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 400,
      title: "Bad Request",
      detail: "prompt required",
      instance: "/clarify",
    });
  });

  it("returns empty questions for complete prompts", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/clarify")
      .send({
        prompt:
          "Develop a web application using Express, run it on port 4000, persist data in PostgreSQL, secure it with JWT authentication, " +
          "style the UI with Tailwind CSS, and include tests with Jest.",
      })
      .expect(200);

    expect(response.body).toEqual({ questions: [] });
  });

  it("returns clarification questions when missing critical info", async () => {
    const app = createApp();

    const response = await request(app).post("/clarify").send({ prompt: "Build an API for managing tasks" }).expect(200);

    expect(Array.isArray(response.body.questions)).toBe(true);
    expect(response.body.questions.length).toBeGreaterThan(0);
    expect(response.body.questions.map((question: { id: string }) => question.id)).toContain("framework");
  });

  it("does not start telemetry when OTEL_ENABLED is falsy", () => {
    process.env.OTEL_ENABLED = "0";

    expect(() => telemetry.maybeInitTelemetry()).not.toThrow();
  });
});
