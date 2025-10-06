import type { FailureAnalysis } from "../contracts/repairHistoryValidator.js";

export interface PreviousAttemptSummary {
  attemptNumber: number;
  status: "pass" | "fail" | "error";
  summary: string;
  failureAnalysis?: FailureAnalysis | null;
  durationMs?: number;
}

export interface RepairContext {
  attemptNumber: 1 | 2 | 3 | 4;
  failureAnalysis: FailureAnalysis | null;
  previousAttempts: PreviousAttemptSummary[];
  originalPrompt: string;
  maxAttempts?: number;
}

const MAX_PROMPT_LENGTH = 4000;

function summarizeFailedTests(analysis: FailureAnalysis | null): string {
  if (!analysis || analysis.failedTests.length === 0) {
    return "Current failures: No detailed failure analysis available. Focus on verifying failing areas in tests.";
  }

  const failedSummaries = analysis.failedTests.map(test => {
    const messageLine = test.message.split("\n")[0];
    return `- ${test.name} (${test.type}): ${messageLine}`;
  });

  return [
    "Current failures:",
    ...failedSummaries,
    `Category: ${analysis.category} • Total failed: ${analysis.totalFailed}`
  ].join("\n");
}

function summarizePreviousAttempts(attempts: PreviousAttemptSummary[]): string {
  if (attempts.length === 0) {
    return "Previous attempts tried: none yet. This is the first repair attempt after the initial run.";
  }

  const lines = attempts.map(attempt => {
    const header = `Attempt ${attempt.attemptNumber} (${attempt.status})`;
    const durationPart = attempt.durationMs != null ? ` • Duration: ${attempt.durationMs}ms` : "";
    const firstFailedTest = attempt.failureAnalysis?.failedTests[0];
    const failureSummary = firstFailedTest ? ` • Key failure: ${firstFailedTest.name}` : "";
    return `- ${header}${durationPart}: ${attempt.summary}${failureSummary}`;
  });

  return ["Previous attempts tried:", ...lines].join("\n");
}

function attemptSpecificGuidance(attemptNumber: number): string {
  switch (attemptNumber) {
    case 1:
      return "Focus on the suspected root cause. Keep changes minimal and targeted.";
    case 2:
      return "Do not repeat the first attempt's approach. Adjust strategy based on the observed failures.";
    case 3:
      return "This is the third attempt. Zero in on the exact failing code paths indicated above and double-check assumptions.";
    case 4:
      return "FINAL attempt. Be extremely precise—address the failing lines directly, avoid risky refactors, and ensure tests pass.";
    default:
      return "Provide a careful, minimal fix informed by the failure analysis.";
  }
}

function buildInstructionSection(attemptNumber: number): string {
  const lines = [
    "ONLY fix the failing parts. Return JSON diff format.",
    "Constraints: no full rewrites. Preserve working code."
  ];

  lines.push(attemptSpecificGuidance(attemptNumber));

  if (attemptNumber >= 3) {
    lines.push("Explicitly verify that the proposed diff resolves the listed failures without introducing regressions.");
  }

  return lines.join("\n");
}

function enforceLength(prompt: string): string {
  if (prompt.length <= MAX_PROMPT_LENGTH) {
    return prompt;
  }

  return `${prompt.slice(0, MAX_PROMPT_LENGTH - 1)}…`;
}

export function buildRepairPrompt(context: RepairContext): string {
  const maxAttempts = context.maxAttempts ?? 4;
  const header = `Attempt ${context.attemptNumber} of ${maxAttempts}`;
  const previousSummary = summarizePreviousAttempts(context.previousAttempts);
  const failureSummary = summarizeFailedTests(context.failureAnalysis);

  const sections = [
    header,
    previousSummary,
    failureSummary,
    "Original request:",
    context.originalPrompt.trim(),
    buildInstructionSection(context.attemptNumber)
  ];

  const prompt = sections.join("\n\n");
  return enforceLength(prompt);
}
