import { describe, it, expect } from "vitest";
import { generateJSON, type LLMMessage } from "../../src/llm/index.js";

const RUN = process.env.RUN_REAL_LLM === "1";

(RUN ? describe : describe.skip)("llm live (openai)", () => {
  it("generateJSON returns a non-empty JSON string from OpenAI", async () => {
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a JSON generator. Return a compact JSON object only." },
      { role: "user", content: "Return {\"ok\":true,\"msg\":\"pong\"}" }
    ];

    const raw = await generateJSON(messages, { sessionId: "llm-live-openai-test" });
    expect(typeof raw).toBe("string");
    expect(raw.length).toBeGreaterThan(2);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    expect(parsed).toBeTruthy();
    expect((parsed as { ok?: boolean }).ok).toBe(true);
  }, 60_000);
});

