import { describe, it, expect, vi, afterEach } from "vitest";

const { chooseProviderMock } = vi.hoisted(() => ({ chooseProviderMock: vi.fn() }));

vi.mock("../../src/llm/providers/choose.js", () => ({
  chooseProvider: (...args: unknown[]) => chooseProviderMock(...args)
}));

import { generateJSON } from "../../src/llm/index.js";
import {
  createAbortSignal,
  abortSession,
  cleanupAbortSignal,
  PausedError
} from "../../src/orchestrator/abortSignal.js";

describe("generateJSON abort propagation", () => {
  afterEach(() => {
    chooseProviderMock.mockReset();
  });

  it("throws PausedError when session aborts during provider execution", async () => {
    vi.useFakeTimers();
    const sessionId = "abort-session";

    chooseProviderMock.mockReturnValue({
      generate: vi.fn((_messages: unknown, options: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => reject(options.signal?.reason ?? new Error("aborted")),
            { once: true }
          );
          setTimeout(() => resolve({ content: "{\"ok\":true}" }), 1_000).unref?.();
        })
      )
    });

    createAbortSignal(sessionId);
    try {
      const promise = generateJSON([{ role: "user", content: "hello" }], { sessionId });
      abortSession(sessionId);
      await expect(promise).rejects.toBeInstanceOf(PausedError);
    } finally {
      cleanupAbortSignal(sessionId);
      vi.useRealTimers();
    }
  });
});
