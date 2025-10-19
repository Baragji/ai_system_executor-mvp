import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const {
  logEventMock,
  chatCreateMock,
  responsesCreateMock
} = vi.hoisted(() => ({
  logEventMock: vi.fn(),
  chatCreateMock: vi.fn(),
  responsesCreateMock: vi.fn()
}));

vi.mock('../../../src/telemetry/events.js', () => ({
  logEvent: (...args: unknown[]) => logEventMock(...args)
}));

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = { completions: { create: (...args: unknown[]) => chatCreateMock(...args) } };
    responses = { create: (...args: unknown[]) => responsesCreateMock(...args) };
    constructor(public config: unknown) {
      void config;
    }
  }
}));

import { OpenAIProvider } from '../../../src/llm/providers/openai.ts';

describe('OpenAIProvider', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.LLM_MODEL = 'gpt-5';
    logEventMock.mockReset();
    chatCreateMock.mockReset();
    responsesCreateMock.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.LLM_MODEL;
  });

  it('normalizes output_text content blocks returned by reasoning models', async () => {
    chatCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: [
              { type: 'reasoning', content: 'thinking...' },
              { type: 'output_text', text: { value: '{"ok":true}' } }
            ]
          }
        }
      ]
    });

    const provider = new OpenAIProvider();
    const result = await provider.generate([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('{"ok":true}');
    expect(logEventMock).not.toHaveBeenCalled();
  });

  it('falls back to the Responses API when chat completions omit the message', async () => {
    chatCreateMock.mockResolvedValue({
      choices: [
        {
          message: null,
          finish_reason: 'stop'
        }
      ]
    });
    responsesCreateMock.mockResolvedValue({ output_text: '{"fallback":1}' });

    const provider = new OpenAIProvider();
    const result = await provider.generate([{ role: 'user', content: 'hi' }]);

    expect(result.content).toBe('{"fallback":1}');
    expect(chatCreateMock).toHaveBeenCalled();
    expect(responsesCreateMock).toHaveBeenCalled();
    expect(logEventMock).toHaveBeenNthCalledWith(
      1,
      'llm_provider_empty_message',
      expect.objectContaining({ reason: 'missing_message', provider: 'openai' })
    );
    // Allow extra diagnostic events (e.g., request_context) before recovery
    const calls = logEventMock.mock.calls.map(args => args[0]);
    expect(calls).toContain('llm_provider_empty_message_recovered');
  });
});
