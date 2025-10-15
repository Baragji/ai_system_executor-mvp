import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import type { WorkflowMetadata } from "../../workflow/lib/phaseState.js";

describe("GET /api/workflow/status", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("returns 404 because the workflow status endpoint is removed", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(404);

    const allowedTypes = ["application/problem+json", "application/json", "text/html"];
    expect(allowedTypes.some(type => res.type?.startsWith(type))).toBe(true);
  });

  it("does not expose workflow metadata payloads", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(404);

    const metadata = res.body as Partial<WorkflowMetadata>;
    expect(metadata.phase).toBeUndefined();
    expect(metadata.gates).toBeUndefined();
    expect(metadata.suggestedNextAction).toBeUndefined();
  });
});
