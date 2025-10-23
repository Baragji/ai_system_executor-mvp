import express from "express";
import type { Application } from "express";
import request from "supertest";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mountStatusRoutes, type StatusDeps } from "../../../src/domains/status/routes.ts";
import type { ExecutionRecord } from "../../../src/orchestrator/executionsStore.ts";

describe("status routes", () => {
  let app: Application;
  let deps: StatusDeps;

  beforeEach(() => {
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    app = express();
    deps = {
      getExecution: vi.fn<StatusDeps["getExecution"]>().mockReturnValue(null)
    } satisfies StatusDeps;
    mountStatusRoutes(app, deps);
  });

  afterEach(() => {
    delete process.env.PROBLEM_DETAILS_ENABLED;
    vi.restoreAllMocks();
  });

  it("returns ok for /healthz", async () => {
    const response = await request(app).get("/healthz");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns execution record when found", async () => {
    const record: ExecutionRecord = {
      id: "exec-1",
      status: "running",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    (deps.getExecution as ReturnType<typeof vi.fn>).mockReturnValueOnce(record);

    const response = await request(app).get("/api/executions/exec-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(record);
    expect(deps.getExecution).toHaveBeenCalledWith("exec-1");
  });

  it("returns RFC 9457 problem when execution missing", async () => {
    const response = await request(app).get("/api/executions/missing");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "execution not found",
      instance: "/api/executions/missing"
    });
  });
});
