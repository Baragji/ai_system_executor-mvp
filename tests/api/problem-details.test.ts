import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_FLAG = process.env.PROBLEM_DETAILS_ENABLED;

async function getFreshApp() {
  vi.resetModules();
  const mod = await import("../../src/server.js");
  return mod.app;
}

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) {
    delete process.env.PROBLEM_DETAILS_ENABLED;
  } else {
    process.env.PROBLEM_DETAILS_ENABLED = ORIGINAL_FLAG;
  }
  vi.resetModules();
});

describe("problem+json envelope", () => {
  it("returns legacy error body when disabled", async () => {
    process.env.PROBLEM_DETAILS_ENABLED = "0";
    const app = await getFreshApp();

    const response = await request(app).post("/api/execute").send({}).expect(400);

    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.headers["content-type"]).not.toContain("problem+json");
    expect(response.body).toEqual({ error: "prompt required" });
  });

  it("returns RFC 9457 problem when enabled", async () => {
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    const app = await getFreshApp();

    const response = await request(app).post("/api/execute").send({}).expect(400);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      status: 400,
      title: "Bad Request",
      detail: "prompt required",
      instance: "/api/execute"
    });
    // Ensure extra metadata is absent when not provided
    expect(response.body).not.toHaveProperty("error");
  });
});
