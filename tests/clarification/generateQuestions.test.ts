import { describe, expect, it } from "vitest";

import { generateQuestions } from "../../src/clarification/generateQuestions.js";
import type { ClarificationQuestion } from "../../src/clarification/types.js";

function findQuestion(questions: ClarificationQuestion[], id: string) {
  return questions.find(question => question.id === id);
}

describe("generateQuestions", () => {
  it("creates framework question", () => {
    const result = generateQuestions(["framework"]);
    const question = findQuestion(result, "framework");
    expect(question?.type).toBe("choice");
    expect(question?.options).toContain("FastAPI");
  });

  it("creates port question", () => {
    const result = generateQuestions(["port"]);
    const question = findQuestion(result, "port");
    expect(question?.type).toBe("number");
    expect(question?.options).toBeUndefined();
    expect(question?.text).toContain("8000");
  });

  it("creates database question", () => {
    const result = generateQuestions(["database"]);
    const question = findQuestion(result, "database");
    expect(question?.options).toContain("PostgreSQL");
  });

  it("creates authentication question", () => {
    const result = generateQuestions(["authentication"]);
    const question = findQuestion(result, "authentication");
    expect(question?.options).toEqual(["Yes", "No"]);
  });

  it("creates styling question", () => {
    const result = generateQuestions(["styling"]);
    const question = findQuestion(result, "styling");
    expect(question?.options).toContain("Tailwind CSS");
  });

  it("creates test framework question", () => {
    const result = generateQuestions(["testFramework"]);
    const question = findQuestion(result, "testFramework");
    expect(question?.options).toContain("Jest");
  });
});
