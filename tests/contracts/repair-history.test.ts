import { describe, expect, it } from "vitest";

import {
  type FailureAnalysis,
  type RepairAttemptRecord,
  type RepairHistory,
  type TestResultSummary,
  validateRepairHistory
} from "../../src/contracts/repairHistoryValidator.js";

const baseTestResult = (overrides: Partial<TestResultSummary> = {}): TestResultSummary => ({
  status: "fail",
  passCount: 0,
  failCount: 1,
  ...overrides
});

const baseFailureAnalysis: FailureAnalysis = {
  failedTests: [
    {
      name: "adds numbers",
      type: "assertion",
      message: "Expected 4, received 5",
      stackSnippet: ["at add (src/add.ts:10:5)"]
    }
  ],
  totalFailed: 1,
  category: "assertion"
};

const attempt = (
  index: number,
  overrides: Partial<RepairAttemptRecord> = {}
): RepairAttemptRecord => ({
  number: index,
  changedFiles: ["src/add.ts"],
  testResult: baseTestResult(),
  failureAnalysis: baseFailureAnalysis,
  durationMs: 12000,
  cumulativeTime: index * 12000,
  ...overrides
});

describe("repair history schema validation", () => {
  it("accepts a single attempt success", () => {
    const history: RepairHistory = {
      attempts: [
        attempt(1, {
          testResult: baseTestResult({ status: "pass", passCount: 10, failCount: 0 }),
          failureAnalysis: {
            failedTests: [],
            totalFailed: 0,
            category: "assertion"
          },
          durationMs: 9000,
          cumulativeTime: 9000
        })
      ],
      finalStatus: "pass",
      totalAttempts: 1,
      successAttemptNumber: 1
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(true);
  });

  it("accepts two attempts where the second succeeds", () => {
    const history: RepairHistory = {
      attempts: [
        attempt(1),
        attempt(2, {
          testResult: baseTestResult({ status: "pass", passCount: 12, failCount: 0 }),
          failureAnalysis: {
            failedTests: [],
            totalFailed: 0,
            category: "assertion"
          },
          durationMs: 6000,
          cumulativeTime: 18000
        })
      ],
      finalStatus: "pass",
      totalAttempts: 2,
      successAttemptNumber: 2
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(true);
  });

  it("accepts four attempts exhausted without success", () => {
    const attempts = [1, 2, 3, 4].map(index =>
      attempt(index, {
        testResult: baseTestResult({ status: "fail" }),
        cumulativeTime: index * 15000,
        durationMs: 15000
      })
    );

    const history: RepairHistory = {
      attempts,
      finalStatus: "exhausted",
      totalAttempts: 4
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(true);
  });

  it("accepts early termination when third attempt passes", () => {
    const attempts = [
      attempt(1),
      attempt(2),
      attempt(3, {
        testResult: baseTestResult({ status: "pass", passCount: 15, failCount: 0 }),
        failureAnalysis: {
          failedTests: [],
          totalFailed: 0,
          category: "assertion"
        }
      })
    ].map((entry, index) => ({
      ...entry,
      durationMs: 10000,
      cumulativeTime: (index + 1) * 10000
    }));

    const history: RepairHistory = {
      attempts,
      finalStatus: "pass",
      totalAttempts: 3,
      successAttemptNumber: 3
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(true);
  });

  it("rejects history missing required fields", () => {
    const result = validateRepairHistory({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("attempts");
    }
  });

  it("rejects attempts with number above four", () => {
    const history: RepairHistory = {
      attempts: [
        attempt(1),
        attempt(5, { cumulativeTime: 24000 })
      ],
      finalStatus: "fail",
      totalAttempts: 2
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("<= 4");
    }
  });

  it("rejects invalid final status", () => {
    const history = {
      attempts: [attempt(1)],
      // @ts-expect-error invalid status for testing
      finalStatus: "unknown",
      totalAttempts: 1
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("finalStatus");
    }
  });

  it("rejects histories where cumulative time does not increase correctly", () => {
    const history: RepairHistory = {
      attempts: [
        attempt(1, { durationMs: 5000, cumulativeTime: 5000 }),
        attempt(2, { durationMs: 5000, cumulativeTime: 9000 })
      ],
      finalStatus: "fail",
      totalAttempts: 2
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("cumulativeTime");
    }
  });

  it("rejects duplicate attempt numbers", () => {
    const history: RepairHistory = {
      attempts: [attempt(1), attempt(1, { cumulativeTime: 24000 })],
      finalStatus: "fail",
      totalAttempts: 2
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("duplicated");
    }
  });

  it("requires success attempt information when history ends in pass", () => {
    const history: RepairHistory = {
      attempts: [
        attempt(1, {
          testResult: baseTestResult({ status: "pass", passCount: 5, failCount: 0 }),
          failureAnalysis: { failedTests: [], totalFailed: 0, category: "assertion" },
          durationMs: 4000,
          cumulativeTime: 4000
        })
      ],
      finalStatus: "pass",
      totalAttempts: 1
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("successAttemptNumber is required");
    }
  });

  it("rejects success attempt number when history is not a pass", () => {
    const history: RepairHistory = {
      attempts: [attempt(1)],
      finalStatus: "fail",
      totalAttempts: 1,
      successAttemptNumber: 1
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("must be omitted");
    }
  });

  it("rejects failing histories whose last attempt passed", () => {
    const history: RepairHistory = {
      attempts: [
        attempt(1, {
          testResult: baseTestResult({ status: "pass", passCount: 4, failCount: 0 }),
          failureAnalysis: { failedTests: [], totalFailed: 0, category: "assertion" },
          durationMs: 7000,
          cumulativeTime: 7000
        })
      ],
      finalStatus: "fail",
      totalAttempts: 1
    };

    const result = validateRepairHistory(history);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("cannot end with a passing test result");
    }
  });
});
