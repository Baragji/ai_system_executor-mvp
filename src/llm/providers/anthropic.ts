import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMRequestMessage,
  ProviderGenerateOptions,
  ProviderGenerateResult
} from "../types.js";

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    this.client = new Anthropic({ apiKey: key });
    this.model = process.env.LLM_MODEL || "claude-3-7-sonnet-latest";
  }

  async generate(messages: LLMRequestMessage[], options: ProviderGenerateOptions = {}): Promise<ProviderGenerateResult> {
    if (options.tools && options.tools.length > 0) {
      throw new Error("Anthropic provider does not support tool calls");
    }

    const system = messages.find(message => message.role === "system")?.content || "";
    const conversation = messages.filter(message => message.role !== "system").map(message => {
      if (message.role === "assistant") {
        return { role: "assistant" as const, content: message.content ?? "" };
      }
      if (message.role === "tool") {
        return { role: "assistant" as const, content: message.content };
      }
      return { role: "user" as const, content: message.content };
    });

    const resp = await this.client.messages.create({
      model: this.model,
      system,
      max_tokens: 4096,
      temperature: 0.2,
      messages: conversation
    }, { signal: options.signal });
    const content = resp.content?.[0];
    if (content?.type !== "text") {
      throw new Error("Anthropic response missing text content");
    }
    if (options.onToken) {
      options.onToken(content.text);
    }
    return { content: content.text, toolCalls: undefined };
  }
}
