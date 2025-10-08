import { describe, expect, it } from "vitest";
import { validateUIValidationResult } from "../../src/contracts/validators.js";
import type { UIValidationResult } from "../../src/runner/runUIValidation.js";

describe("UI Validation Result Schema", () => {
  it("validates a complete passing result", () => {
    const validResult: UIValidationResult = {
      timestamp: "2025-10-07T12:00:00Z",
      status: "pass",
      playwright: {
        status: "pass",
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
        durationMs: 5000,
        reportPath: ".automation/playwright-report",
        violations: [],
      },
      lighthouse: {
        status: "pass",
        performanceScore: 0.85,
        accessibilityScore: 0.95,
        bestPracticesScore: 0.90,
        seoScore: 0.88,
        reportPath: ".automation/lighthouse-reports",
      },
      notes: ["All tests passed", "No violations found"],
    };

    const result = validateUIValidationResult(validResult);
    expect(result.ok).toBe(true);
  });

  it("validates a result with accessibility violations", () => {
    const resultWithViolations: UIValidationResult = {
      timestamp: "2025-10-07T12:00:00Z",
      status: "fail",
      playwright: {
        status: "fail",
        totalTests: 5,
        passedTests: 3,
        failedTests: 2,
        durationMs: 3000,
        violations: [
          {
            type: "accessibility",
            test: "home page accessibility",
            message: "Missing alt text on image",
          },
          {
            type: "visual",
            test: "header visual regression",
            message: "Screenshot differs by 150 pixels",
          },
        ],
      },
      lighthouse: {
        status: "pass",
        performanceScore: 0.80,
        accessibilityScore: 0.75,
        bestPracticesScore: 0.85,
        seoScore: 0.90,
      },
      notes: ["2 violations found", "Performance is acceptable"],
    };

    const result = validateUIValidationResult(resultWithViolations);
    expect(result.ok).toBe(true);
  });

  it("validates a minimal result with skipped tests", () => {
    const minimalResult: UIValidationResult = {
      timestamp: "2025-10-07T12:00:00Z",
      status: "pass",
      playwright: {
        status: "skipped",
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        durationMs: 0,
        violations: [],
      },
      lighthouse: {
        status: "skipped",
        performanceScore: 0,
        accessibilityScore: 0,
        bestPracticesScore: 0,
        seoScore: 0,
      },
      notes: ["Tests skipped in this run"],
    };

    const result = validateUIValidationResult(minimalResult);
    expect(result.ok).toBe(true);
  });

  it("rejects result with invalid status", () => {
    const invalidResult = {
      timestamp: "2025-10-07T12:00:00Z",
      status: "unknown", // Invalid status
      playwright: {
        status: "pass",
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        durationMs: 2000,
        violations: [],
      },
      lighthouse: {
        status: "pass",
        performanceScore: 0.9,
        accessibilityScore: 0.95,
        bestPracticesScore: 0.92,
        seoScore: 0.88,
      },
      notes: [],
    };

    const result = validateUIValidationResult(invalidResult);
    expect(result.ok).toBe(false);
  });

  it("rejects result with missing required fields", () => {
    const incompleteResult = {
      timestamp: "2025-10-07T12:00:00Z",
      status: "pass",
      playwright: {
        status: "pass",
        totalTests: 5,
        passedTests: 5,
        // Missing failedTests
        durationMs: 2000,
        violations: [],
      },
      lighthouse: {
        status: "pass",
        performanceScore: 0.9,
        accessibilityScore: 0.95,
        bestPracticesScore: 0.92,
        seoScore: 0.88,
      },
      notes: [],
    };

    const result = validateUIValidationResult(incompleteResult);
    expect(result.ok).toBe(false);
  });

  it("rejects result with invalid score values", () => {
    const invalidScores = {
      timestamp: "2025-10-07T12:00:00Z",
      status: "pass",
      playwright: {
        status: "pass",
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        durationMs: 2000,
        violations: [],
      },
      lighthouse: {
        status: "pass",
        performanceScore: 1.5, // Invalid: > 1
        accessibilityScore: 0.95,
        bestPracticesScore: 0.92,
        seoScore: -0.1, // Invalid: < 0
      },
      notes: [],
    };

    const result = validateUIValidationResult(invalidScores);
    expect(result.ok).toBe(false);
  });
});
