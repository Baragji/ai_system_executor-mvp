import { describe, it, expect, vi, beforeEach } from 'vitest';

const { chooseProviderMock } = vi.hoisted(() => ({ chooseProviderMock: vi.fn() }));

vi.mock('../../src/llm/providers/choose.js', () => ({
  chooseProvider: (...args: unknown[]) => chooseProviderMock(...args)
}));

import { generateJSON, type LLMMessage } from '../../src/llm/index.js';

describe('LLM retry/backoff', () => {
  beforeEach(() => {
    // real timers; keep backoffs at 1ms via env
  });

  it('retries on 429 then succeeds', async () => {
    process.env.LLM_MAX_RETRIES = '3';
    process.env.LLM_INITIAL_BACKOFF_MS = '1';
    process.env.LLM_MAX_BACKOFF_MS = '1';
    const messages: LLMMessage[] = [{ role: 'user', content: 'hi' }];
    let calls = 0;
    chooseProviderMock.mockReturnValue({
      generate: async () => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('rate limited') as Error & { status?: number };
          err.status = 429;
          throw err;
        }
        return '{"ok":true}';
      }
    });

    const out = await generateJSON(messages);
    expect(out).toContain('ok');
    expect(calls).toBe(3);
  });

  it('does not retry on 400', async () => {
    process.env.LLM_MAX_RETRIES = '1';
    process.env.LLM_INITIAL_BACKOFF_MS = '1';
    process.env.LLM_MAX_BACKOFF_MS = '1';
    const messages: LLMMessage[] = [{ role: 'user', content: 'hi' }];
    chooseProviderMock.mockReturnValue({
      generate: async () => {
        const err = new Error('bad request') as Error & { status?: number };
        err.status = 400;
        throw err;
      }
    });
    await expect(generateJSON(messages)).rejects.toThrow(/bad request/);
  });
});
