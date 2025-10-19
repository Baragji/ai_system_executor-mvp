import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

async function startFakeOrchestrator() {
  let executionId = "exec-123";
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end();
      return;
    }
    if (req.method === "GET" && req.url === "/healthz") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (req.method === "POST" && req.url === "/execute") {
      let body = "";
      req.setEncoding("utf-8");
      req.on("data", chunk => (body += chunk));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body || "{}");
          if (!parsed || !Array.isArray(parsed.steps)) {
            res.statusCode = 400;
            res.setHeader("content-type", "application/problem+json");
            res.end(JSON.stringify({ status: 400, title: "Bad Request", detail: "steps required", instance: "/execute" }));
            return;
          }
        } catch {
          // ignore; treat as bad request
        }
        res.statusCode = 202;
        res.setHeader("location", `/executions/${executionId}`);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ executionId, status: "started", location: `/executions/${executionId}` }));
      });
      return;
    }
    if (req.method === "GET" && req.url?.startsWith("/executions/")) {
      const id = req.url.split("/").at(-1) || executionId;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ id, status: "completed" }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>(resolve => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  return { server, url } as const;
}

describe("Monolith → Orchestrator proxy", () => {
  let orchestrator: Awaited<ReturnType<typeof startFakeOrchestrator>> | null = null;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    orchestrator = await startFakeOrchestrator();
    process.env.ORCHESTRATOR_URL = orchestrator.url;
  });

  afterEach(async () => {
    delete process.env.ORCHESTRATOR_URL;
    if (orchestrator) {
      await new Promise<void>(resolve => orchestrator?.server.close(() => resolve()));
      orchestrator = null;
    }
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("proxies POST /api/execute and rewrites Location header", async () => {
    const mod = await import("../../src/server.js");
    const app = mod.app as import("express").Express;

    const response = await request(app)
      .post("/api/execute")
      .send({ prompt: "ping" })
      .expect(202);

    expect(response.headers.location).toMatch(/^\/api\/executions\//);
    expect(response.body).toMatchObject({ executionId: expect.any(String), status: expect.stringMatching(/started|running/i) });
  });

  it("proxies GET /api/executions/:id to orchestrator", async () => {
    const mod = await import("../../src/server.js");
    const app = mod.app as import("express").Express;

    const status = await request(app).get("/api/executions/exec-xyz").expect(200);
    expect(status.body).toMatchObject({ id: "exec-xyz", status: expect.any(String) });
  });
});

