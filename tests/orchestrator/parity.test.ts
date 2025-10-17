import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/server.js";

// Mock LLM and runner to keep outputs stable across runtimes
vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "hello-world",
      hasTests: true,
      files: [
        { path: "package.json", contents: JSON.stringify({ name: "demo", version: "1.0.0" }) },
        { path: "src/index.ts", contents: "export const greet = () => 'hi';" },
        { path: "tests/index.test.ts", contents: "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { greet } from '../src/index.js';\ntest('greets', () => { assert.equal(greet(), 'hi'); });" }
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

describe("orchestrator parity: stepqueue vs langgraph", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    delete process.env.AGENTS_RUNTIME;
  });

  it("produces equivalent final response payloads", async () => {
    // StepQueue direct response
    process.env.AGENTS_RUNTIME = "stepqueue";
    const base = await request(app)
      .post("/api/execute")
      .send({ prompt: "Build a hello world app", projectName: "parity-app" })
      .expect(200);

    expect(base.body).toHaveProperty("ok", true);
    const baseProject = base.body.project;

    // LangGraph path with polling
    process.env.AGENTS_RUNTIME = "langgraph";
    const start = await request(app)
      .post("/api/execute")
      .send({ prompt: "Build a hello world app", projectName: "parity-app" })
      .expect(202);

    const location = start.headers["location"] as string;
    expect(location).toMatch(/^\/api\/executions\//);

    // Poll a few times until completed
    let final;
    for (let i = 0; i < 20; i += 1) {
      const poll = await request(app).get(location).expect(200);
      if (poll.body.status === "completed") {
        final = poll.body.result;
        break;
      }
      await new Promise(r => setTimeout(r, 25));
    }
    expect(final).toBeTruthy();
    expect(final).toHaveProperty("ok", true);

    // Parity on key fields
    expect(final.project).toEqual(baseProject);
    expect(final.files_written).toEqual(base.body.files_written);
    expect(final.repair?.attempted).toEqual(base.body.repair?.attempted);
    expect(final.testResults?.initial?.status).toEqual(base.body.testResults?.initial?.status);
  });
});
