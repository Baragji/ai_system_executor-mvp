import request from "supertest";
import { describe, expect, it } from "vitest";

import { type LLMGatewayDriver } from "../../src/domain/index.js";
import { createApp } from "../../src/server.js";

describe("POST /complete", () => {
  it("returns completion payload", async () => {
    const driver: LLMGatewayDriver = {
      async complete(messages) {
        return { content: JSON.stringify({ count: messages.length }) };
      },
    };

    const app = createApp(driver);
    const response = await request(app)
      .post("/complete")
      .send({
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Say hi" },
        ],
        tools: [
          {
            name: "fs.read", 
            description: "Read file",
            parameters: { type: "object" },
          },
        ],
      })
      .expect(200);

    expect(response.body).toEqual({ content: JSON.stringify({ count: 2 }) });
  });

  it("validates messages", async () => {
    const driver: LLMGatewayDriver = {
      async complete() {
        throw new Error("should not be called");
      },
    };

    const app = createApp(driver);
    const response = await request(app).post("/complete").send({ messages: "nope" }).expect(400);

    expect(response.body.detail).toMatch(/messages/);
  });

  it("validates tool schemas", async () => {
    const driver: LLMGatewayDriver = {
      async complete() {
        throw new Error("should not be called");
      },
    };

    const app = createApp(driver);
    const response = await request(app)
      .post("/complete")
      .send({
        messages: [{ role: "user", content: "hi" }],
        tools: "nope",
      })
      .expect(400);

    expect(response.body.detail).toMatch(/tools/);
  });

  it("treats missing driver as 503", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/complete")
      .send({ messages: [{ role: "user", content: "hi" }] })
      .expect(503);

    expect(response.body.detail).toMatch(/not configured/i);
  });
});
