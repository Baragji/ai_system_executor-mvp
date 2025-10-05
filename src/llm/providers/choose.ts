import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";

export function chooseProvider() {
  const provider = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider();
    case "openai":
    default:
      return new OpenAIProvider();
  }
}
