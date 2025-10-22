import fs from "node:fs/promises";
import path from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../../src/server.js";
import type { RunResult } from "../../src/contracts/validators.js";
import type { ExecutorSuccessResponse } from "../../src/orchestrator/executionTypes.js";
import { postExecuteAndWait } from "../helpers/execute.js";

const OUTPUT_DIR = path.resolve("output");
const PROJECT_DIR = path.join(OUTPUT_DIR, "telemetry-demo");

let sandboxResult: RunResult;

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn(async () =>
    JSON.stringify({
      project_name: "telemetry-demo",
      hasTests: true,
      files: [
        { path: "README.md", contents: "# Demo" },
        { path: "src/index.ts", contents: "export const ok = true;" },
        {
          path: "tests/index.test.ts",
          contents:
            "import { ok } from '../src/index.js';\nif(!ok) throw new Error('fail');"
        }
      ],
      notes: []
    })
  )
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

async function readMeta(projectSlug: string) {
  const metaPath = path.join(OUTPUT_DIR, projectSlug, "_executor_meta.json");
  const raw = await fs.readFile(metaPath, "utf-8");
  return JSON.parse(raw);
}

describe("clarification telemetry meta", () => {
  beforeEach(async () => {
    sandboxResult = {
      status: "pass",
      passCount: 1,
      failCount: 0,
      durationMs: 120,
      logsPath: "logs/run.log",
      timestamp: new Date().toISOString()
    };
    await fs.rm(PROJECT_DIR, { recursive: true, force: true });
  });

  afterEach(async () => {
    await fs.rm(PROJECT_DIR, { recursive: true, force: true });
  });

  it("meta file includes clarification data when clarifications used", async () => {
    const prompt = "Build a Python API that stores data";
    const clarifyRes = await request(app)
      .post("/api/clarify")
      .send({ prompt });

    const questions = clarifyRes.body.questions as { id: string }[];
    const answers = questions
      .filter(question => ["framework", "port", "database"].includes(question.id))
      .map(question => {
        if (question.id === "framework") return { questionId: question.id, value: "FastAPI" };
        if (question.id === "port") return { questionId: question.id, value: 5050 };
        return { questionId: question.id, value: "PostgreSQL" };
      });

    const executeResult = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt,
      clarifications: { answers }
    });

    expect(executeResult.finalStatus).toBe(200);
    expect([200, 202]).toContain(executeResult.initialStatus);
    const payload = executeResult.payload;
    const meta = await readMeta(payload.project);
    expect(meta.clarification.asked).toBe(true);
    expect(meta.clarification.questions.map((q: { id: string }) => q.id)).toEqual(
      questions.map(question => question.id)
    );
    expect(meta.clarification.answers).toEqual(answers);
    expect(meta.clarification.improvedSuccess).toBe(true);
  });

  it("sets improvedSuccess false when tests fail", async () => {
    sandboxResult = {
      status: "fail",
      passCount: 0,
      failCount: 1,
      durationMs: 90,
      logsPath: "logs/run.log",
      timestamp: new Date().toISOString()
    };

    const prompt = "Build a Node API";
    const clarifyRes = await request(app)
      .post("/api/clarify")
      .send({ prompt });

    const questions = clarifyRes.body.questions as { id: string }[];
    const answers = questions
      .filter(question => question.id === "framework")
      .map(question => ({ questionId: question.id, value: "Express" }));

    const executeResult = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), {
      prompt,
      clarifications: { answers }
    });

    expect(executeResult.finalStatus).toBe(200);
    const payload = executeResult.payload;
    const meta = await readMeta(payload.project);
    expect(meta.clarification.asked).toBe(true);
    expect(meta.clarification.improvedSuccess).toBe(false);
  });

  it("marks clarification asked when user skips answers", async () => {
    const prompt = "Build a Python API";
    await request(app).post("/api/clarify").send({ prompt });

    const executeResult = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), { prompt });

    expect(executeResult.finalStatus).toBe(200);
    const payload = executeResult.payload;
    const meta = await readMeta(payload.project);
    expect(meta.clarification.asked).toBe(true);
    expect(meta.clarification.answers).toEqual([]);
    expect(meta.clarification.improvedSuccess).toBe(false);
  });

  it("keeps clarification false when no clarifications needed", async () => {
    const prompt = "Explain the art of pottery";
    const executeResult = await postExecuteAndWait<ExecutorSuccessResponse>(request(app), { prompt });

    expect(executeResult.finalStatus).toBe(200);
    const payload = executeResult.payload;
    const meta = await readMeta(payload.project);
    expect(meta.clarification.asked).toBe(false);
    expect(meta.clarification.questions).toEqual([]);
    expect(meta.clarification.answers).toEqual([]);
    expect(meta.clarification.improvedSuccess).toBe(false);
  });
});
