import { describe, expect, it } from "vitest";

import type { FailureAnalysis } from "../../src/contracts/repairHistoryValidator.js";
import { buildRepairPrompt } from "../../src/repair/buildRepairPrompt.js";
import {
  selectStrategy,
  strategyGuidance
} from "../../src/repair/strategySelector.js";

function makeAnalysis(category: FailureAnalysis["category"]): FailureAnalysis {
  return {
    category,
    failedTests: [
      {
        name: "sample test",
        type: category === "multiple" ? "assertion" : (category as Exclude<FailureAnalysis["category"], "multiple">),
        message: "expected true to be false",
        stackSnippet: []
      }
    ],
    totalFailed: 1
  };
}

describe("buildRepairPrompt adaptive guidance", () => {
  const baseContext = {
    previousAttempts: [],
    originalPrompt: "Fix the failing tests"
  } as const;

  it("injects strategy guidance for each category", () => {
    const categories: FailureAnalysis["category"][] = [
      "syntax",
      "timeout",
      "assertion",
      "exception",
      "multiple"
    ];

    categories.forEach(category => {
      const prompt = buildRepairPrompt({
        ...baseContext,
        attemptNumber: 1,
        failureAnalysis: makeAnalysis(category),
        maxAttempts: 4
      });

      expect(prompt).toContain("Adaptive focus");
      const strategy = selectStrategy(category, 1);
      expect(prompt).toContain(strategyGuidance(strategy));
    });
  });

  it("falls back when failure analysis missing", () => {
    const prompt = buildRepairPrompt({
      ...baseContext,
      attemptNumber: 2,
      failureAnalysis: null,
      maxAttempts: 4
    });

    expect(prompt).toContain("Adaptive focus: Failure category unknown");
  });

  it("adds conservative note for late attempts", () => {
    const prompt = buildRepairPrompt({
      ...baseContext,
      attemptNumber: 3,
      failureAnalysis: makeAnalysis("assertion"),
      maxAttempts: 4
    });

    expect(prompt).toContain("Keep the scope tight on later attempts");
    expect(prompt).toContain("Explicitly verify");
  });
});
