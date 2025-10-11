import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { chooseProvider, __resetProviderCache } from "../../../src/llm/providers/choose.js";

describe("chooseProvider", () => {
  const originalProvider = process.env.LLM_PROVIDER;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    // Set mock API keys for testing
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    __resetProviderCache();
  });

  afterEach(() => {
    process.env.LLM_PROVIDER = originalProvider;
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    __resetProviderCache();
  });

  it("should return OpenAI provider by default", () => {
    delete process.env.LLM_PROVIDER;
    const provider = chooseProvider();
    expect(provider.constructor.name).toBe("OpenAIProvider");
  });

  it("should return OpenAI provider when explicitly set", () => {
    process.env.LLM_PROVIDER = "openai";
    const provider = chooseProvider();
    expect(provider.constructor.name).toBe("OpenAIProvider");
  });

  it("should return Anthropic provider when specified", () => {
    process.env.LLM_PROVIDER = "anthropic";
    const provider = chooseProvider();
    expect(provider.constructor.name).toBe("AnthropicProvider");
  });

  it("should handle case-insensitive provider names", () => {
    process.env.LLM_PROVIDER = "OPENAI";
    const provider1 = chooseProvider();
    expect(provider1.constructor.name).toBe("OpenAIProvider");

    __resetProviderCache();
    process.env.LLM_PROVIDER = "Anthropic";
    const provider2 = chooseProvider();
    expect(provider2.constructor.name).toBe("AnthropicProvider");
  });

  it("should return the same instance on repeated calls (singleton caching)", () => {
    process.env.LLM_PROVIDER = "openai";
    const provider1 = chooseProvider();
    const provider2 = chooseProvider();
    const provider3 = chooseProvider();

    expect(provider1).toBe(provider2);
    expect(provider2).toBe(provider3);
  });

  it("should cache different instances for different providers", () => {
    process.env.LLM_PROVIDER = "openai";
    const openaiProvider = chooseProvider();

    __resetProviderCache();
    process.env.LLM_PROVIDER = "anthropic";
    const anthropicProvider = chooseProvider();

    expect(openaiProvider).not.toBe(anthropicProvider);
    expect(openaiProvider.constructor.name).toBe("OpenAIProvider");
    expect(anthropicProvider.constructor.name).toBe("AnthropicProvider");
  });

  it("should preserve cache across multiple calls without reset", () => {
    process.env.LLM_PROVIDER = "openai";
    const provider1 = chooseProvider();
    
    // Simulate many calls (as would happen during execution)
    for (let i = 0; i < 100; i++) {
      const provider = chooseProvider();
      expect(provider).toBe(provider1);
    }
  });

  it("should allow cache reset for testing", () => {
    process.env.LLM_PROVIDER = "openai";
    const provider1 = chooseProvider();

    __resetProviderCache();

    const provider2 = chooseProvider();
    expect(provider1).not.toBe(provider2);
    expect(provider1.constructor.name).toBe("OpenAIProvider");
    expect(provider2.constructor.name).toBe("OpenAIProvider");
  });
});
