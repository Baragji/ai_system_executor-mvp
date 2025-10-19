import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

async function createTestApp() {
  const mod = await import("../../src/server.js");
  return mod.createApp();
}

describe("POST /analyze", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.PROBLEM_DETAILS_ENABLED = "1";
  });

  it("returns failure analysis for provided test output", async () => {
    const app = await createTestApp();
    const sampleLog = [
      "FAIL src/example.test.ts",
      "  ● sample suite › reports failure",
      "",
      "    expect(received).toBe(2)",
      "    Received: 1",
    ].join("\n");

    const response = await request(app)
      .post("/analyze")
      .send({ testOutput: sampleLog })
      .expect(200);

    expect(response.body.analysis).toMatchObject({
      totalFailed: 1,
      category: "assertion",
    });
    expect(response.body.analysis.failedTests[0]).toMatchObject({
      name: "sample suite › reports failure",
      type: "assertion",
    });
  });

  it("returns validation error when testOutput is missing", async () => {
    const app = await createTestApp();

    const response = await request(app).post("/analyze").send({}).expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      title: "Bad Request",
      errors: [
        {
          pointer: "/testOutput",
        },
      ],
    });
  });
});
