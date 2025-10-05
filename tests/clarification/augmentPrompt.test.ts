import { describe, expect, it } from "vitest";

import { augmentPrompt } from "../../src/clarification/augmentPrompt.js";
import type { ClarificationResponse } from "../../src/clarification/types.js";

describe("augmentPrompt", () => {
  const original = "Build a task management API";

  it("returns original prompt when clarifications are empty", () => {
    const result = augmentPrompt(original, { answers: [] });
    expect(result).toBe(original);
  });

  it("prepends formatted context for a single clarification", () => {
    const clarifications: ClarificationResponse = {
      answers: [{ questionId: "framework", value: "FastAPI" }]
    };

    const result = augmentPrompt(original, clarifications);
    expect(result).toContain("Framework: FastAPI");
    expect(result.endsWith(`Original request: ${original}`)).toBe(true);
  });

  it("formats multiple clarifications separated by commas", () => {
    const clarifications: ClarificationResponse = {
      answers: [
        { questionId: "framework", value: "Express" },
        { questionId: "port", value: 8080 },
        { questionId: "authentication", value: "JWT" }
      ]
    };

    const result = augmentPrompt(original, clarifications);
    expect(result).toContain("Framework: Express, Port: 8080, Authentication: JWT");
    expect(result.split("\n\n")[1]).toBe(`Original request: ${original}`);
  });

  it("skips answers without values", () => {
    const clarifications: ClarificationResponse = {
      answers: [
        { questionId: "framework", value: "Django" },
        { questionId: "port", value: "" }
      ]
    };

    const result = augmentPrompt(original, clarifications);
    expect(result).toContain("Framework: Django");
    expect(result).not.toContain("Port:");
  });

  it("always returns a string", () => {
    const clarifications: ClarificationResponse = {
      answers: [{ questionId: "styling", value: "Tailwind" }]
    };
    const result = augmentPrompt(original, clarifications);
    expect(typeof result).toBe("string");
  });

  it("preserves the original prompt content", () => {
    const clarifications: ClarificationResponse = {
      answers: [{ questionId: "database", value: "PostgreSQL" }]
    };

    const result = augmentPrompt(`${original}\nwith more detail`, clarifications);
    expect(result.endsWith(`Original request: ${original}\nwith more detail`)).toBe(true);
  });
});
