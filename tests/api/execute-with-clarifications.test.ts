import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../../src/server.js";
import type { RunResult } from "../../src/contracts/validators.js";

const OUTPUT_DIR = path.resolve("output");
const PROJECT_DIR = path.join(OUTPUT_DIR, "clarify-demo");
const TELEMETRY_FILE = path.resolve(".telemetry/events.log");

let lastMessages: unknown = null;

const sandboxResult: RunResult = {
  status: "pass",
  passCount: 1,
  failCount: 0,
  durationMs: 120,
  logsPath: "logs/run.log",
  timestamp: new Date().toISOString()
};

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async (messages: unknown) => {
    lastMessages = messages;
    return JSON.stringify({
      project_name: "clarify-demo",
      hasTests: true,
      files: [
        { path: "README.md", contents: "# Demo" },
        { path: "src/index.ts", contents: "export const ok = true;" },
        { path: "tests/index.test.ts", contents: "import { ok } from '../src/index.js';\nif(!ok) throw new Error('fail');" }
      ],
      notes: []
    });
  })
}));

vi.mock("../../src/runner/runInSandbox.js", () => ({
  runInSandbox: vi.fn(async () => sandboxResult)
}));

vi.mock("../../src/repair/repairOnce.js", () => ({
  repairOnce: vi.fn(async () => ({
    attempted: false,
    repaired: false,
    appliedFiles: 0,
    artifacts: [],
    notes: []
  }))
}));

vi.mock("../../src/planning/decomposeTask.js", () => ({
  decomposeTask: vi.fn(async () => {
    throw new Error("Skip planning in clarification tests");
  })
}));

describe("POST /api/execute with clarifications", () => {
  beforeEach(async () => {
    lastMessages = null;
    await fs.rm(PROJECT_DIR, { recursive: true, force: true });
    // Do not reset global telemetry file to avoid cross-test interference
    await fs.mkdir(path.dirname(TELEMETRY_FILE), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(PROJECT_DIR, { recursive: true, force: true });
  });

  it("works without clarifications", async () => {
    const prompt = "Build a Node API";
    const res = await request(app)
      .post("/api/execute")
      .send({ prompt, projectName: "clarify-demo" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.generated).toBe(prompt);
    expect(res.body.clarificationsUsed).toBe(false);

    const messages = lastMessages as { role: string; content: string }[] | null;
    expect(messages?.[1]?.content).toBe(prompt);

    const metaPath = path.join(OUTPUT_DIR, "clarify-demo", "_executor_meta.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    expect(meta.original_prompt).toBe(prompt);
    expect(meta.source_prompt).toBe(prompt);
    expect(meta.clarification.asked).toBe(false);
    expect(meta.clarification.answers).toEqual([]);
    expect(meta.clarification.questions).toEqual([]);
    expect(meta.clarifications.used).toBe(false);
    expect(meta.clarifications.asked).toBe(false);
  });

  it("uses augmented prompt when clarifications provided", async () => {
    const prompt = "Create a backend service";
    const clarifications = {
      answers: [
        { questionId: "framework", value: "FastAPI" },
        { questionId: "port", value: 5050 }
      ]
    };

    const res = await request(app)
      .post("/api/execute")
      .send({ prompt, clarifications });

    expect(res.status).toBe(200);
    expect(res.body.clarificationsUsed).toBe(true);
    expect(res.body.generated).toContain("Framework: FastAPI");
    expect(res.body.generated).toContain("Port: 5050");
    expect(res.body.generated).toContain(`Original request: ${prompt}`);

    const messages = lastMessages as { role: string; content: string }[] | null;
    expect(messages?.[1]?.content).toBe(res.body.generated);

    const projectSlug = res.body.project;
    const metaPath = path.join(OUTPUT_DIR, projectSlug, "_executor_meta.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
    expect(meta.original_prompt).toBe(prompt);
    expect(meta.source_prompt).toBe(res.body.generated);
    expect(meta.clarification.asked).toBe(true);
    expect(meta.clarification.answers.length).toBe(2);
    expect(meta.clarification.improvedSuccess).toBe(true);
    expect(meta.clarification.questions.length).toBeGreaterThan(0);
    expect(meta.clarifications.used).toBe(true);
    expect(meta.clarifications.answers.length).toBe(2);
  });

  it("rejects invalid clarifications", async () => {
    const res = await request(app)
      .post("/api/execute")
      .send({ prompt: "Generate something", clarifications: { answers: [{}] } });

    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body).toMatchObject({
      status: 400,
      title: "Bad Request",
      detail: "invalid clarifications",
      instance: "/api/execute"
    });
    expect(res.body).not.toHaveProperty("error");
  });
});
