import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { type LLMMessage } from "../../src/llm/index.js";

describe("LLM timeout and retry behavior", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should retry on timeout with exponential backoff", async () => {
    // Set short timeout for testing
    process.env.LLM_CALL_TIMEOUT_MS = "100";
    process.env.LLM_MAX_RETRIES = "3";
    process.env.LLM_INITIAL_BACKOFF_MS = "10";
    process.env.LLM_MAX_BACKOFF_MS = "100";

    const mockProvider = {
      generate: vi.fn()
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve('{"test": "data"}'), 150))) // Times out
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve('{"test": "data"}'), 150))) // Times out
        .mockResolvedValueOnce('{"test": "success"}') // Succeeds
    };

    // Mock the provider
    vi.doMock("../../src/llm/providers/choose.js", () => ({
      chooseProvider: () => mockProvider
    }));

    const { generateJSON: testGenerateJSON } = await import("../../src/llm/index.js");

    const messages: LLMMessage[] = [
      { role: "system", content: "test" },
      { role: "user", content: "test" }
    ];

    const result = await testGenerateJSON(messages);
    
    expect(result).toBe('{"test": "success"}');
    expect(mockProvider.generate).toHaveBeenCalledTimes(3);
  }, 30000); // 30s test timeout

  it("should fail after max retries exceeded", async () => {
    process.env.LLM_CALL_TIMEOUT_MS = "100";
    process.env.LLM_MAX_RETRIES = "2";
    process.env.LLM_INITIAL_BACKOFF_MS = "10";

    const mockProvider = {
      generate: vi.fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('{"test": "data"}'), 200))) // Always times out
    };

    vi.doMock("../../src/llm/providers/choose.js", () => ({
      chooseProvider: () => mockProvider
    }));

    const { generateJSON: testGenerateJSON } = await import("../../src/llm/index.js");

    const messages: LLMMessage[] = [
      { role: "system", content: "test" },
      { role: "user", content: "test" }
    ];

    await expect(testGenerateJSON(messages)).rejects.toThrow(/timed out/);
    expect(mockProvider.generate).toHaveBeenCalledTimes(3); // Initial + 2 retries
  }, 30000);

  it("should handle long-running successful calls within timeout", async () => {
    process.env.LLM_CALL_TIMEOUT_MS = "5000"; // 5 seconds
    process.env.LLM_MAX_RETRIES = "1";

    const mockProvider = {
      generate: vi.fn()
        .mockImplementation(() => new Promise(resolve => {
          // Simulate slow but successful response (2 seconds)
          setTimeout(() => resolve('{"result": "slow but successful"}'), 2000);
        }))
    };

    vi.doMock("../../src/llm/providers/choose.js", () => ({
      chooseProvider: () => mockProvider
    }));

    const { generateJSON: testGenerateJSON } = await import("../../src/llm/index.js");

    const messages: LLMMessage[] = [
      { role: "system", content: "test" },
      { role: "user", content: "generate complex code" }
    ];

    const result = await testGenerateJSON(messages);
    
    expect(result).toBe('{"result": "slow but successful"}');
    expect(mockProvider.generate).toHaveBeenCalledTimes(1); // No retries needed
  }, 30000);
});
