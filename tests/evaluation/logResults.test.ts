import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { EvaluationResult } from "../../src/evaluation/logResults.js";

let logEvaluationResult: typeof import("../../src/evaluation/logResults.js").logEvaluationResult;

describe("logEvaluationResult", () => {
  let originalCwd: string;
  let tempDir: string;
  let automationDir: string;
  let evaluationFile: string;

  async function resetOutputs(): Promise<void> {
    await fs.rm(evaluationFile, { force: true });
    await fs.mkdir(automationDir, { recursive: true });
  }

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "evaluation-log-"));
    process.chdir(tempDir);
    automationDir = path.resolve(".automation");
    evaluationFile = path.join(automationDir, "evaluation_results.json");
    ({ logEvaluationResult } = await import("../../src/evaluation/logResults.js"));
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await resetOutputs();
  });

  async function readEntries(): Promise<EvaluationResult[]> {
    const content = await fs.readFile(evaluationFile, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line) as EvaluationResult);
  }

  it("writes evaluation results to the automation file", async () => {
    const evaluation: EvaluationResult = {
      timestamp: new Date().toISOString(),
      phase: "2A-OBSERVABILITY-FIX",
      task_id: "OBS-FIX-02",
      status: "pass",
      quality_dimensions: {
        correctness: true,
        completeness: true,
        safety: true
      }
    };

    await logEvaluationResult(evaluation);

    const entries = await readEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject(evaluation);
  });

  it("appends without overwriting existing entries", async () => {
    const first: EvaluationResult = {
      timestamp: new Date().toISOString(),
      phase: "2A-OBSERVABILITY-FIX",
      task_id: "OBS-FIX-02",
      status: "pass",
      quality_dimensions: { correctness: true, completeness: true, safety: true }
    };
    const second: EvaluationResult = {
      timestamp: new Date().toISOString(),
      phase: "2A-OBSERVABILITY-FIX",
      task_id: "OBS-FIX-02",
      status: "fail",
      quality_dimensions: { correctness: false, completeness: true, safety: true },
      notes: "Follow-up required"
    };

    await logEvaluationResult(first);
    await logEvaluationResult(second);

    const entries = await readEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject(first);
    expect(entries[1]).toMatchObject(second);
  });

  it("ensures JSONL structure with required fields", async () => {
    const evaluation: EvaluationResult = {
      timestamp: new Date().toISOString(),
      phase: "2A-OBSERVABILITY-FIX",
      task_id: "OBS-FIX-02",
      status: "fail",
      quality_dimensions: { correctness: false, completeness: false, safety: true }
    };

    await logEvaluationResult(evaluation);

    const content = await fs.readFile(evaluationFile, "utf-8");
    const lines = content.trim().split("\n");

    for (const line of lines) {
      const parsed = JSON.parse(line) as EvaluationResult;
      expect(parsed.timestamp).toBeTruthy();
      expect(parsed.phase).toBeTruthy();
      expect(parsed.task_id).toBeTruthy();
      expect(["pass", "fail"]).toContain(parsed.status);
      expect(parsed.quality_dimensions).toMatchObject({
        correctness: expect.any(Boolean),
        completeness: expect.any(Boolean),
        safety: expect.any(Boolean)
      });
    }
  });
});
