import { describe, expect, it } from "vitest";

import { buildRepairPrompt } from "../../src/repair/buildRepairPrompt.js";
import type { FailureAnalysis } from "../../src/contracts/repairHistoryValidator.js";

const failureAnalysis: FailureAnalysis = {
  failedTests: [
    {
      name: "math suite › adds numbers",
      type: "assertion",
      message: "Expected 4, received 5",
      stackSnippet: ["at add (src/math.ts:10:5)"]
    }
  ],
  totalFailed: 1,
  category: "assertion"
};

describe("buildRepairPrompt", () => {
  it("produces a general prompt for the first attempt", () => {
    const prompt = buildRepairPrompt({
      attemptNumber: 1,
      failureAnalysis,
      previousAttempts: [],
      originalPrompt: "Fix the add function so tests pass."
    });

    expect(prompt).toContain("Attempt 1 of 4");
    expect(prompt).toContain("Previous attempts tried: none yet");
    expect(prompt).toContain("ONLY fix the failing parts");
  });

  it("references previous attempts on the second try", () => {
    const prompt = buildRepairPrompt({
      attemptNumber: 2,
      failureAnalysis,
      previousAttempts: [
        {
          attemptNumber: 1,
          status: "fail",
          summary: "Adjusted logic but assertion still failing.",
          failureAnalysis,
          durationMs: 12000
        }
      ],
      originalPrompt: "Fix the add function so tests pass."
    });

    expect(prompt).toContain("Attempt 2 of 4");
    expect(prompt).toContain("Attempt 1 (fail)");
    expect(prompt).toContain("Do not repeat the first attempt's approach");
  });

  it("tightens instructions on the third attempt", () => {
    const prompt = buildRepairPrompt({
      attemptNumber: 3,
      failureAnalysis,
      previousAttempts: [
        { attemptNumber: 1, status: "fail", summary: "Initial tweak", failureAnalysis },
        { attemptNumber: 2, status: "fail", summary: "Refined logic", failureAnalysis }
      ],
      originalPrompt: "Fix the add function so tests pass."
    });

    expect(prompt).toContain("Attempt 3 of 4");
    expect(prompt).toContain("third attempt");
    expect(prompt).toContain("Explicitly verify that the proposed diff resolves the listed failures");
  });

  it("adds urgency on the final attempt and stays concise", () => {
    const prompt = buildRepairPrompt({
      attemptNumber: 4,
      failureAnalysis,
      previousAttempts: [
        { attemptNumber: 1, status: "fail", summary: "Initial tweak", failureAnalysis },
        { attemptNumber: 2, status: "fail", summary: "Refined logic", failureAnalysis },
        { attemptNumber: 3, status: "fail", summary: "Close to working", failureAnalysis }
      ],
      originalPrompt: "Fix the add function so tests pass.".repeat(50)
    });

    expect(prompt).toContain("Attempt 4 of 4");
    expect(prompt).toContain("FINAL attempt");
    expect(prompt.length).toBeLessThanOrEqual(4000);
    const wordCount = prompt.split(/\s+/).length;
    expect(wordCount).toBeLessThan(1000);
  });
});
