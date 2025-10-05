import OpenAI from "openai";
import type { LLMMessage } from "../index.js";

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    this.client = new OpenAI({ apiKey: key });
    this.model = process.env.LLM_MODEL || "gpt-4o-mini";
  }

  async generate(messages: LLMMessage[]): Promise<string> {
    // Reasoning models (o1, o1-mini, o1-preview, gpt-5) don't support custom temperature
    const isReasoningModel = this.model.startsWith('o1') || this.model.startsWith('gpt-5');
    
    const requestParams: any = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      response_format: { type: "json_object" }
    };
    
    // Only set temperature for non-reasoning models
    if (!isReasoningModel) {
      requestParams.temperature = 0.2;
    }
    
    const resp = await this.client.chat.completions.create(requestParams);
    const content = resp.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");
    return content;
  }
}
