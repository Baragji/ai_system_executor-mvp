import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/server.js";
import * as telemetry from "../src/telemetry/otel.js";

const runInSandboxMock = vi.fn();
const ensureDependenciesMock = vi.fn();
const logEventMock = vi.fn();

vi.mock("../src/domain/runner.js", () => ({
  runInSandbox: (...args: unknown[]) => runInSandboxMock(...args),
  ensureDependencies: (...args: unknown[]) => ensureDependenciesMock(...args),
  logEvent: (...args: unknown[]) => logEventMock(...args),
}));

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

beforeEach(() => {
  process.env.NODE_ENV = "test";
  process.env.PROBLEM_DETAILS_ENABLED = "1";
  delete process.env.OTEL_ENABLED;
  runInSandboxMock.mockReset();
  ensureDependenciesMock.mockReset();
  logEventMock.mockReset();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("runner service", () => {
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

  it("does not start telemetry when OTEL_ENABLED is falsy", () => {
    process.env.OTEL_ENABLED = "0";

    expect(() => telemetry.maybeInitTelemetry()).not.toThrow();
  });

  it("validates required fields for POST /run", async () => {
    const app = createApp();

    const response = await request(app).post("/run").send({ projectSlug: "demo" }).expect(400);

    expect(response.body).toEqual({ error: "projectRoot required" });
    expect(runInSandboxMock).not.toHaveBeenCalled();
  });

  it("runs sandbox execution for POST /run", async () => {
    const app = createApp();
    runInSandboxMock.mockResolvedValue({ status: "pass", passCount: 1, failCount: 0 });

    const body = {
      projectRoot: "/tmp/project",
      projectSlug: "project",
      command: "npm test",
      timeoutMs: 12345,
      env: { FOO: "bar" },
      sessionId: "abc123",
    };

    const response = await request(app).post("/run").send(body).expect(200);

    expect(runInSandboxMock).toHaveBeenCalledWith({
      projectRoot: body.projectRoot,
      projectSlug: body.projectSlug,
      command: body.command,
      timeoutMs: body.timeoutMs,
      env: body.env,
      sessionId: body.sessionId,
    });
    expect(response.body).toEqual({ status: "pass", passCount: 1, failCount: 0 });
  });

  it("validates POST /install payload", async () => {
    const app = createApp();

    const response = await request(app).post("/install").send({}).expect(400);

    expect(response.body).toEqual({ error: "projectRoot required" });
    expect(ensureDependenciesMock).not.toHaveBeenCalled();
  });

  it("runs dependency installation for POST /install", async () => {
    const app = createApp();
    ensureDependenciesMock.mockResolvedValue({ installed: true, command: "npm ci" });

    const response = await request(app)
      .post("/install")
      .send({ projectRoot: "/tmp/project", timeoutMs: 60000 })
      .expect(200);

    expect(ensureDependenciesMock).toHaveBeenCalledWith("/tmp/project", 60000);
    expect(response.body).toEqual({ installed: true, command: "npm ci" });
  });

  it("validates POST /test payload", async () => {
    const app = createApp();

    const response = await request(app).post("/test").send({}).expect(400);

    expect(response.body).toEqual({ error: "project required" });
  });

  it("returns 404 when project directory is missing", async () => {
    const app = createApp();
    const accessSpy = vi.spyOn(fs, "access").mockRejectedValueOnce(new Error("missing"));

    const response = await request(app).post("/test").send({ project: "missing" }).expect(404);

    expect(accessSpy).toHaveBeenCalled();
    expect(response.body).toEqual({ error: "project not found" });

    accessSpy.mockRestore();
  });

  it("runs sandbox tests for POST /test", async () => {
    const app = createApp();
    const accessSpy = vi.spyOn(fs, "access").mockResolvedValue();
    runInSandboxMock.mockResolvedValue({ status: "pass", passCount: 2, failCount: 0 });

    const response = await request(app).post("/test").send({ project: "My Project" }).expect(200);

    const slug = "my-project";
    const expectedRoot = path.join(path.resolve("output"), slug);

    expect(accessSpy).toHaveBeenCalledWith(expectedRoot);
    expect(runInSandboxMock).toHaveBeenCalledWith({ projectRoot: expectedRoot, projectSlug: slug });
    expect(logEventMock).toHaveBeenCalledWith("test_run", { project: slug, stage: "manual", status: "pass" });
    expect(response.body).toEqual({ status: "pass", passCount: 2, failCount: 0 });

    accessSpy.mockRestore();
  });
});
