import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../../src/server.js";

describe("POST /api/clarify", () => {
  it("returns empty questions for complete prompts", async () => {
    const res = await request(app)
      .post("/api/clarify")
      .send({
        prompt:
          "Develop a web application using Express, run it on port 4000, persist data in PostgreSQL, secure it with JWT authentication, " +
          "style the UI with Tailwind CSS, and include tests with Jest."
      });

    expect(res.status).toBe(200);
    expect(res.body.questions).toEqual([]);
  });

  it("returns clarification questions when missing critical info", async () => {
    const res = await request(app)
      .post("/api/clarify")
      .send({ prompt: "Build an API for managing tasks" });

    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBeGreaterThan(0);
    expect(res.body.questions.map((q: { id: string }) => q.id)).toContain("framework");
  });

  it("rejects invalid payloads", async () => {
    const res = await request(app)
      .post("/api/clarify")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
