import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { executeAdapter } from "../../src/orchestrator/adapter.js";

describe("executeAdapter", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.post("/api/execute", (req, res) => void executeAdapter(req, res));
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
  });

  afterEach(() => {
    delete process.env.AGENTS_RUNTIME;
    delete process.env.AGENTS_GRAPH_SIMULATE_FAILURE;
    delete process.env.PROBLEM_DETAILS_ENABLED;
  });

  it("returns 400 when prompt missing", async () => {
    const res = await request(app).post("/api/execute").send({}).expect(400);
    expect(res.body).toHaveProperty("title", "Bad Request");
  });

  it("falls back to StepQueue sim and returns 200", async () => {
    process.env.AGENTS_RUNTIME = "stepqueue";
    const res = await request(app).post("/api/execute").send({ prompt: "hi" }).expect(200);
    expect(res.body).toMatchObject({ status: "completed" });
  });

  it("returns 500 when langgraph simulation failure enabled", async () => {
    process.env.AGENTS_RUNTIME = "langgraph";
    process.env.AGENTS_GRAPH_SIMULATE_FAILURE = "1";
    const res = await request(app).post("/api/execute").send({ prompt: "hi" }).expect(500);
    expect(res.body).toMatchObject({ title: "Internal Server Error", status: 500, type: "about:blank" });
  });
});
