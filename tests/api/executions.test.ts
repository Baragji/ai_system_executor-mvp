import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
    expect(["started", "completed"]).toContain(firstPoll.body.status);

    // Wait briefly for stub to complete
    await new Promise(r => setTimeout(r, 20));

    const secondPoll = await request(app).get(location).expect(200);
    expect(secondPoll.body).toMatchObject({ status: "completed" });
    expect(secondPoll.body).toHaveProperty("result");
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
