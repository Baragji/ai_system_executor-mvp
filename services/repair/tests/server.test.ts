import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as telemetry from "../src/telemetry/otel.js";

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

async function createTestApp() {
  const mod = await import("../src/server.js");
  return mod.createApp();
}

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.PROBLEM_DETAILS_ENABLED = "1";
  delete process.env.OTEL_ENABLED;
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("repair service", () => {
  it("returns health status", async () => {
    const app = await createTestApp();

    const response = await request(app).get("/healthz").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns RFC 9457 problem details for unknown routes", async () => {
    const app = await createTestApp();

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

  it("does not start telemetry when OTEL_ENABLED is falsy", () => {
    process.env.OTEL_ENABLED = "0";

    expect(() => telemetry.maybeInitTelemetry()).not.toThrow();
  });
});
