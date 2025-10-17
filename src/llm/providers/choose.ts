import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";

type ProviderKey = "openai" | "anthropic";
const cache: Partial<Record<ProviderKey, OpenAIProvider | AnthropicProvider>> = {};

/**
 * Returns a singleton LLM provider instance based on LLM_PROVIDER env var.
 * Caches instances to avoid re-initialization overhead and preserve connection pooling.
 * 
 * @returns The cached provider instance for the current LLM_PROVIDER setting
 */
export function chooseProvider() {
  const key = (process.env.LLM_PROVIDER || "openai").toLowerCase() as ProviderKey;
  
  if (!cache[key]) {
    cache[key] = key === "anthropic" ? new AnthropicProvider() : new OpenAIProvider();
  }
  
  return cache[key]!;
}

/**
 * Test helper: clears the provider cache to allow env var changes to take effect.
 * Should only be used in tests.
 * @internal
 */
export function __resetProviderCache() {
  (Object.keys(cache) as ProviderKey[]).forEach(k => delete cache[k]);
}
