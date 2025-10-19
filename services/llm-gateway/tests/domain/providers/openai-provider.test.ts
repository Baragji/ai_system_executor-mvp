import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { OpenAIProvider } from "../../../src/domain/providers/openai.js";

const { createCompletionMock, responsesCreateMock, openAIConstructor } = vi.hoisted(() => {
  const create = vi.fn();
  const responses = vi.fn();
  const constructor = vi.fn(() => ({
    chat: {
      completions: {
        create,
      },
    },
    responses: {
      create: responses,
    },
  }));

  return {
    createCompletionMock: create,
    responsesCreateMock: responses,
    openAIConstructor: constructor,
  };
});

vi.mock("openai", () => ({
  default: openAIConstructor,
}));

describe("OpenAIProvider", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.LLM_MODEL;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.LLM_MODEL;

    createCompletionMock.mockReset();
    responsesCreateMock.mockReset();
    openAIConstructor.mockClear();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }

    if (originalModel === undefined) {
      delete process.env.LLM_MODEL;
    } else {
      process.env.LLM_MODEL = originalModel;
    }
  });

  it("sends chat completion requests with normalized messages", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: "hello world",
          },
        },
      ],
    });

    const provider = new OpenAIProvider();
    const result = await provider.generate([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Say hi" },
    ]);

    expect(openAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(createCompletionMock).toHaveBeenCalledTimes(1);

    const [request, options] = createCompletionMock.mock.calls[0];
    expect(request.model).toBe("gpt-5");
    expect(request.messages).toEqual([
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Say hi" },
    ]);
    expect(request.response_format).toEqual({ type: "json_object" });
    expect(request.tool_choice).toBeUndefined();
    expect(options).toEqual({ signal: undefined });
    expect(result).toEqual({ content: "hello world", toolCalls: undefined });
  });

  it("maps tool schemas and returns tool calls", async () => {
    process.env.LLM_MODEL = "o1-mini";
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_123",
                type: "function",
                function: {
                  name: "calculator",
                  arguments: "{\"value\":1}",
                },
              },
            ],
          },
        },
      ],
    });

    const provider = new OpenAIProvider();
    const result = await provider.generate(
      [{ role: "user", content: "use the tool" }],
      {
        tools: [
          {
            name: "calculator",
            description: "adds numbers",
            parameters: { type: "object", properties: {} },
          },
        ],
      },
    );

    const [request] = createCompletionMock.mock.calls[0];
    expect(request.model).toBe("o1-mini");
    expect(request.tool_choice).toBe("auto");
    expect(request.tools).toEqual([
      {
        type: "function",
        function: {
          name: "calculator",
          description: "adds numbers",
          parameters: { type: "object", properties: {} },
        },
      },
    ]);
    expect(request.response_format).toBeUndefined();
    expect(result).toEqual({
      content: "",
      toolCalls: [
        { id: "call_123", name: "calculator", arguments: "{\"value\":1}" },
      ],
    });
  });

  it("invokes onToken with the final content when provided", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            role: "assistant",
            content: "final answer",
          },
        },
      ],
    });

    const provider = new OpenAIProvider();
    const tokens: string[] = [];
    const result = await provider.generate(
      [{ role: "user", content: "stream" }],
      {
        onToken: token => tokens.push(token),
      },
    );

    expect(tokens).toEqual(["final answer"]);
    expect(result).toEqual({ content: "final answer", toolCalls: undefined });
  });
});
