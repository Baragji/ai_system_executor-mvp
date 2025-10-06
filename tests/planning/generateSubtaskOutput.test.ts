import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/llm/index.js", () => ({
  generateJSON: vi.fn()
}));

import { generateSubtaskOutputWithRetry } from "../../src/planning/generateSubtaskOutput.js";
import { generateJSON } from "../../src/llm/index.js";

const generateJSONMock = vi.mocked(generateJSON);

beforeEach(() => {
  generateJSONMock.mockReset();
});

const systemPrompt = "system";
const request = {
  subtask: {
    id: "1",
    title: "Test",
    description: "",
    status: "pending" as const,
    successCriteria: "",
    dependencies: []
  },
  prompt: "do something"
};

const validPayload = {
  project_name: "demo",
  files: [
    { path: "src/index.ts", contents: "export const value = 1;" }
  ],
  notes: ["done"],
  hasTests: false
};

describe("generateSubtaskOutputWithRetry", () => {
  it("retries once on invalid JSON", async () => {
    generateJSONMock
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce(JSON.stringify(validPayload));

    const result = await generateSubtaskOutputWithRetry(systemPrompt, request, false);

    expect(result.project_name).toBe("demo");
    expect(generateJSONMock).toHaveBeenCalledTimes(2);
  });

  it("retries on schema validation failure", async () => {
    generateJSONMock
      .mockResolvedValueOnce(JSON.stringify({ project_name: "demo" }))
      .mockResolvedValueOnce(JSON.stringify(validPayload));

    const result = await generateSubtaskOutputWithRetry(systemPrompt, request, false);

    expect(result.files).toHaveLength(1);
    expect(generateJSONMock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting attempts", async () => {
    generateJSONMock.mockResolvedValue("{}");

    await expect(
      generateSubtaskOutputWithRetry(systemPrompt, request, false)
    ).rejects.toThrow(/Failed to generate valid subtask output/);
  });
});
