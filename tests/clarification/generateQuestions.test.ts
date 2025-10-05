import { describe, expect, it } from "vitest";

import { generateQuestions } from "../../src/clarification/generateQuestions.js";
import type { ClarificationQuestion } from "../../src/clarification/types.js";

function findQuestion(questions: ClarificationQuestion[], id: string) {
  return questions.find(question => question.id === id);
}

describe("generateQuestions", () => {
  it("creates framework question with language default", () => {
    const prompt = "Build a Python API";
    const result = generateQuestions(["framework"], prompt);
    const question = findQuestion(result, "framework");
    expect(question?.type).toBe("choice");
    expect(question?.options).toContain("FastAPI");
    expect(question?.default).toBe("FastAPI");
  });

  it("creates port question", () => {
    const result = generateQuestions(["port"], "Build a Node API on port 5050");
    const question = findQuestion(result, "port");
    expect(question?.type).toBe("number");
    expect(question?.options).toBeUndefined();
    expect(question?.text).toContain("8000");
    expect(question?.default).toBe(5050);
  });

  it("creates database question", () => {
    const result = generateQuestions(["database"], "Create a simple app that stores data");
    const question = findQuestion(result, "database");
    expect(question?.options).toContain("PostgreSQL");
    expect(question?.default).toBe("SQLite");
  });

  it("creates authentication question", () => {
    const result = generateQuestions(["authentication"], "Build an app with authentication");
    const question = findQuestion(result, "authentication");
    expect(question?.options).toEqual(["Yes", "No"]);
    expect(question?.default).toBeUndefined();
  });

  it("creates styling question", () => {
    const result = generateQuestions(["styling"], "Build a UI dashboard");
    const question = findQuestion(result, "styling");
    expect(question?.options).toContain("Tailwind CSS");
    expect(question?.default).toBeUndefined();
  });

  it("creates test framework question", () => {
    const result = generateQuestions(["testFramework"], "Set up tests for the project");
    const question = findQuestion(result, "testFramework");
    expect(question?.options).toContain("Jest");
    expect(question?.default).toBeUndefined();
  });
});
