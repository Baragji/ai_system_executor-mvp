import { describe, expect, it } from "vitest";

import {
  validateRunResult,
  validateExecutorOutput,
  validateRepairArtifact
} from "../../src/contracts/validators.js";

describe("validateRunResult", () => {
  it("accepts a valid run result", () => {
    const result = validateRunResult({
      status: "pass",
      passCount: 3,
      failCount: 0,
      durationMs: 1200,
      logsPath: "logs/run.log",
      timestamp: new Date().toISOString()
    });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = validateRunResult({
      status: "unknown",
      passCount: 0,
      failCount: 0,
      durationMs: 0,
      logsPath: "logs/run.log",
      timestamp: new Date().toISOString()
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateExecutorOutput", () => {
  it("requires hasTests flag", () => {
    const result = validateExecutorOutput({
      files: [{ path: "README.md", contents: "# Hi" }],
      hasTests: true
    });
    expect(result.ok).toBe(true);
  });

  it("fails when hasTests missing", () => {
    const result = validateExecutorOutput({
      files: [{ path: "README.md", contents: "# Hi" }]
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateRepairArtifact", () => {
  it("validates action enum", () => {
    const result = validateRepairArtifact({ path: "src/index.ts", action: "modify" });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = validateRepairArtifact({ path: "src/index.ts", action: "rewrite" });
    expect(result.ok).toBe(false);
  });
});
