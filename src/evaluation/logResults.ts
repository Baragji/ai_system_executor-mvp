import fs from "node:fs/promises";
import path from "node:path";

const AUTOMATION_DIR = path.resolve(".automation");
const EVALUATION_FILE = path.join(AUTOMATION_DIR, "evaluation_results.json");

export interface EvaluationQualityDimensions {
  correctness: boolean;
  completeness: boolean;
  safety: boolean;
}

export interface EvaluationResult {
  timestamp: string;
  phase: string;
  task_id: string;
  status: "pass" | "fail";
  quality_dimensions: EvaluationQualityDimensions;
  notes?: string;
}

export async function logEvaluationResult(
  evaluation: EvaluationResult
): Promise<void> {
  await fs.mkdir(AUTOMATION_DIR, { recursive: true });
  await fs.appendFile(EVALUATION_FILE, `${JSON.stringify(evaluation)}\n`, "utf-8");
}
