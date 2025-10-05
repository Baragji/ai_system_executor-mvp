import { describe, expect, it } from "vitest";

import {
  validateClarificationRequest,
  validateClarificationResponse
} from "../../src/contracts/validators.js";

describe("validateClarificationRequest", () => {
  it("accepts a valid multiple choice question", () => {
    const result = validateClarificationRequest({
      questions: [
        {
          id: "framework",
          text: "Which framework should we use?",
          type: "choice",
          options: ["FastAPI", "Express"]
        }
      ]
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a valid text question without options", () => {
    const result = validateClarificationRequest({
      questions: [
        {
          id: "styling",
          text: "Describe your styling preferences",
          type: "text"
        }
      ]
    });
    expect(result.ok).toBe(true);
  });

  it("rejects when questions property missing", () => {
    const result = validateClarificationRequest({});
    expect(result.ok).toBe(false);
  });

  it("rejects questions without identifiers", () => {
    const result = validateClarificationRequest({
      questions: [
        {
          text: "Select database",
          type: "choice",
          options: ["PostgreSQL"]
        }
      ]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects choice questions without options", () => {
    const result = validateClarificationRequest({
      questions: [
        {
          id: "database",
          text: "Select database",
          type: "choice"
        }
      ]
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateClarificationResponse", () => {
  it("accepts string answers", () => {
    const result = validateClarificationResponse({
      answers: [
        {
          questionId: "framework",
          value: "FastAPI"
        }
      ]
    });
    expect(result.ok).toBe(true);
  });

  it("accepts numeric answers", () => {
    const result = validateClarificationResponse({
      answers: [
        {
          questionId: "port",
          value: 8080
        }
      ]
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing answers array", () => {
    const result = validateClarificationResponse({});
    expect(result.ok).toBe(false);
  });

  it("rejects answers without question id", () => {
    const result = validateClarificationResponse({
      answers: [
        {
          value: "PostgreSQL"
        }
      ]
    });
    expect(result.ok).toBe(false);
  });

  it("rejects null answers", () => {
    const result = validateClarificationResponse({
      answers: [
        {
          questionId: "framework",
          value: null
        }
      ]
    });
    expect(result.ok).toBe(false);
  });
});
