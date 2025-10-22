import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "hello-world",
      hasTests: true,
      files: [
        { path: "package.json", contents: JSON.stringify({ name: "demo", version: "1.0.0" }) },
        { path: "src/index.ts", contents: "export const greet = () => 'hi';" },
        {
          path: "tests/index.test.ts",
          contents: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { greet } from '../src/index.js';\ntest('greets', () => { assert.equal(greet(), 'hi'); });"
        }
      ],
      notes: []
    })
  )
}));

vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn(async () => ({
    status: "pass",
    passCount: 1,
    failCount: 0,
    durationMs: 200,
    logsPath: "logs/pass.log",
    timestamp: new Date().toISOString()
  }))
}));

vi.mock("../../src/repair/multiTurnRepair.js", () => ({
  multiTurnRepair: vi.fn(async () => ({
    attempts: [
      {
        number: 1,
        status: "pass",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        changedFiles: [],
        summary: "Initial run passed",
        testResult: {
          status: "pass",
          passCount: 1,
          failCount: 0,
          durationMs: 200,
          logsPath: "logs/pass.log"
        },
        durationMs: 200,
        cumulativeTime: 200
      }
    ],
    finalStatus: "pass",
    totalAttempts: 1,
    successAttemptNumber: 1
  }))
}));

vi.mock("../../src/planning/decomposeTask.js", () => ({
  decomposeTask: vi.fn(async () => {
    throw new Error("Skip planning in executions tests");
  })
}));

import { app } from "../../src/server.js";
import { __test as execStoreTest } from "../../src/orchestrator/executionsStore.js";

describe("LangGraph executions endpoint", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.AGENTS_RUNTIME = "langgraph";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
    execStoreTest.clear();
  });

  afterEach(() => {
    delete process.env.PROBLEM_DETAILS_ENABLED;
  });

  it("returns 202 + Location for /api/execute and exposes status at /api/executions/:id", async () => {
    const resStart = await request(app)
      .post("/api/execute")
      .send({ prompt: "Build a hello world app" })
      .expect(202);

    expect(resStart.body).toHaveProperty("executionId");
    expect(resStart.body).toHaveProperty("status", "started");
    const location = resStart.headers["location"] as string;
    expect(location).toMatch(/^\/api\/executions\//);

    const firstPoll = await request(app).get(location).expect(200);
    expect(["started", "running", "completed"]).toContain(firstPoll.body.status);

    let finalExecution: { status?: string; output?: unknown; logs?: unknown } | null = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const poll = await request(app).get(location).expect(200);
      finalExecution = poll.body;
      if (poll.body.status === "completed") {
        break;
      }
      await new Promise(r => setTimeout(r, 25));
    }

    expect(finalExecution?.status).toBe("completed");
    expect(finalExecution).toHaveProperty("output");
    expect(finalExecution?.logs).toBeInstanceOf(Array);
  });

  it("returns 404 for unknown execution id", async () => {
    const res = await request(app).get("/api/executions/does-not-exist").expect(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body).toMatchObject({
      status: 404,
      title: "Not Found",
      detail: "execution not found",
      instance: "/api/executions/does-not-exist"
    });
    expect(res.body).not.toHaveProperty("error");
  });
});
