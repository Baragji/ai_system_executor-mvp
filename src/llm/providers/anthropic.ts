import Anthropic from "@anthropic-ai/sdk";
import type { LLMMessage } from "../index.js";

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey: key });
    this.model = process.env.LLM_MODEL || "claude-3-7-sonnet-latest";
  }

  async generate(messages: LLMMessage[]): Promise<string> {
    const system = messages.find(m => m.role === "system")?.content || "";
    const user = messages.filter(m => m.role === "user").map(m => ({ role: "user" as const, content: m.content }));
    const resp = await this.client.messages.create({
      model: this.model,
      system,
      max_tokens: 4096,
      temperature: 0.2,
      messages: user
    });
    const content = resp.content?.[0];
    if (content?.type !== "text") {
      throw new Error("Anthropic response missing text content");
    }
    return content.text;
  }
}
