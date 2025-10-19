import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../src/server.js";

const OUTPUT_DIR = path.resolve("output");
const fixturesRoot = path.resolve("tests/fixtures");

describe.sequential("POST /api/run-tests", () => {
  const originalRunnerUrl = process.env.RUNNER_URL;
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeAll(async () => {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.rm(path.join(OUTPUT_DIR, "passing"), { recursive: true, force: true });
    await fs.cp(path.join(fixturesRoot, "passing-project"), path.join(OUTPUT_DIR, "passing"), {
      recursive: true
    });
  });

  afterAll(() => {
    if (originalRunnerUrl === undefined) {
      delete process.env.RUNNER_URL;
    } else {
      process.env.RUNNER_URL = originalRunnerUrl;
    }
    if (originalFetch === undefined) {
      delete (globalThis as { fetch?: unknown }).fetch;
    } else {
      (globalThis as { fetch?: unknown }).fetch = originalFetch;
    }
  });

  it("returns 404 for missing project", async () => {
    const res = await request(app).post("/api/run-tests").send({ project: "does-not-exist" });
    expect(res.status).toBe(404);
  });

  it("runs tests for an existing project", async () => {
    const res = await request(app).post("/api/run-tests").send({ project: "passing" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pass");
    expect(res.body.passCount).toBeGreaterThanOrEqual(0);
  });

  describe("when RUNNER_URL is set", () => {
    const runnerUrl = "http://runner.example";
    let previousFetch: unknown;

    beforeEach(() => {
      process.env.RUNNER_URL = runnerUrl;
      previousFetch = (globalThis as { fetch?: unknown }).fetch;
    });

    afterEach(() => {
      delete process.env.RUNNER_URL;
      if (previousFetch === undefined) {
        delete (globalThis as { fetch?: unknown }).fetch;
      } else {
        (globalThis as { fetch?: unknown }).fetch = previousFetch;
      }
      vi.restoreAllMocks();
    });

    it("proxies the request to the runner service", async () => {
      const upstreamBody = { status: "pass", passCount: 3 };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null) },
        text: async () => JSON.stringify(upstreamBody)
      });
      (globalThis as { fetch?: unknown }).fetch = mockFetch;

      const res = await request(app).post("/api/run-tests").send({ project: "passing" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0] as [string, { method?: string; headers?: Record<string, string>; body?: string }];
      expect(url).toBe(`${runnerUrl}/run-tests`);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
          accept: "application/json, application/problem+json"
        })
      );
      expect(init?.body).toBe(JSON.stringify({ project: "passing" }));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(upstreamBody);
    });
  });
});
