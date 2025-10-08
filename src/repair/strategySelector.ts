import type { FailureCategory } from "../contracts/repairHistoryValidator.js";

export type RepairStrategy =
  | "syntax_focus"
  | "timeout_focus"
  | "assertion_focus"
  | "exception_hardening"
  | "multiple_prioritize";

const baseStrategyByCategory: Record<Exclude<FailureCategory, "multiple">, RepairStrategy> = {
  syntax: "syntax_focus",
  timeout: "timeout_focus",
  assertion: "assertion_focus",
  exception: "exception_hardening"
};

const lateAttemptThreshold = 3;

export function selectStrategy(
  category: FailureCategory,
  attempt: 1 | 2 | 3 | 4
): RepairStrategy {
  if (category === "multiple") {
    return "multiple_prioritize";
  }

  if (attempt >= lateAttemptThreshold && category === "assertion") {
    return "multiple_prioritize";
  }

  return baseStrategyByCategory[category];
}

const guidanceByStrategy: Record<RepairStrategy, string> = {
  syntax_focus:
    [
      "Prioritize resolving syntax or parsing errors first.",
      "Use the compiler or test output to pinpoint the exact file and line failing to parse.",
      "Avoid refactors—make the minimum correction so the parser can proceed." 
    ].join(" "),
  timeout_focus:
    [
      "Focus on operations that exceed the test timeout.",
      "Look for unbounded loops, heavy I/O, or missing awaits that block completion.",
      "Favor efficient, incremental adjustments rather than large rewrites." 
    ].join(" "),
  assertion_focus:
    [
      "Study the expected vs actual values in the failing assertion.",
      "Align the implementation with the test's intent before touching unrelated areas.",
      "Keep changes scoped to the code exercised by the failing assertion." 
    ].join(" "),
  exception_hardening:
    [
      "Address uncaught exceptions by adding guards, default values, or error handling.",
      "Trace the stack to the origin of the throw and inspect assumptions made there.",
      "Prefer contained fixes that harden the failing path without broad changes." 
    ].join(" "),
  multiple_prioritize:
    [
      "Multiple signals are failing—rank them and address the most deterministic one first.",
      "Stabilize prior modifications before layering new fixes to avoid compounding errors.",
      "Document what you are deferring so later attempts remain focused." 
    ].join(" ")
};

export function strategyGuidance(strategy: RepairStrategy): string {
  return guidanceByStrategy[strategy];
}
