import { describe, expect, it } from "vitest";

import {
  type ExecutionTraceEntry,
  validateExecutionTrace
} from "../../src/contracts/executionTraceValidator.js";

describe("execution trace validator", () => {
  it("accepts valid entries", () => {
    const entry: ExecutionTraceEntry = {
      timestamp: new Date().toISOString(),
      task_id: "plan:demo",
      action: "plan_progress",
      status: "in_progress",
      subtask_id: "sub-1",
      progress_pct: 50
    };

    const result = validateExecutionTrace(entry);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual(entry);
  });

  it("rejects entries missing required fields", () => {
    const result = validateExecutionTrace({});
    expect(result.ok).toBe(false);
    expect(result.errors).toMatch(/timestamp/);
  });
});
