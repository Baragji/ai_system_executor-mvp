import request from "supertest";
import { describe, expect, it } from "vitest";

import { type LLMGatewayDriver } from "../../src/domain/index.js";
import { createApp } from "../../src/server.js";

function stripWhitespace(value: string): string {
  return value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n");
}

describe("POST /stream", () => {
  it("streams chunks before returning the final result", async () => {
    const driver: LLMGatewayDriver = {
      async complete(_messages, options) {
        options?.onToken?.("hello");
        return { content: "world" };
      },
    };

    const app = createApp(driver);
    const response = await request(app)
      .post("/stream")
      .set("Accept", "text/event-stream")
      .send({ messages: [{ role: "user", content: "say hi" }] })
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/event-stream");
    const body = stripWhitespace(response.text);
    expect(body).toContain("event: chunk\ndata: {\"token\":\"hello\"}");
    expect(body).toContain("event: result\ndata: {\"content\":\"world\"}");
  });

  it("returns validation errors without starting stream", async () => {
    const driver: LLMGatewayDriver = {
      async complete() {
        throw new Error("should not be called");
      },
    };

    const app = createApp(driver);
    const response = await request(app).post("/stream").send({ messages: "nope" }).expect(400);

    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body.detail).toMatch(/messages/);
  });

  it("treats missing driver as 503 without streaming", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/stream")
      .send({ messages: [{ role: "user", content: "hi" }] })
      .expect(503);

    expect(response.headers["content-type"]).toContain("application/problem+json");
  });
});
