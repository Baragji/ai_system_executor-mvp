import { createRequire } from "node:module";

import Ajv2020, { type ErrorObject, type JSONSchemaType } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { RepairStrategy } from "../repair/strategySelector.js";

const requireJson = createRequire(import.meta.url);
const schema = requireJson("../../contracts/repair-history.schema.json");

export type FailureCategory =
  | "assertion"
  | "exception"
  | "timeout"
  | "syntax"
  | "multiple";

export interface FailedTestSummary {
  name: string;
  type: Exclude<FailureCategory, "multiple">;
  message: string;
  stackSnippet: string[];
}

export interface FailureAnalysis {
  failedTests: FailedTestSummary[];
  totalFailed: number;
  category: FailureCategory;
}

export interface TestResultSummary {
  status: "pass" | "fail" | "error";
  passCount: number;
  failCount: number;
  skipCount?: number;
  durationMs?: number;
  summary?: string;
  logsPath?: string;
  errorMessage?: string;
}

export interface RepairAttemptRecord {
  number: number;
  status?: "pending" | "running" | "pass" | "fail" | "error";
  startedAt?: string;
  finishedAt?: string;
  changedFiles: string[];
  summary?: string;
  strategy?: RepairStrategy;
  testResult: TestResultSummary;
  failureAnalysis?: FailureAnalysis;
  durationMs: number;
  cumulativeTime: number;
}

export interface RepairHistory {
  attempts: RepairAttemptRecord[];
  finalStatus: "pass" | "fail" | "exhausted";
  totalAttempts: number;
  successAttemptNumber?: number;
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string };

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: false,
  strictSchema: false
});
addFormats(ajv);

const validator = ajv.compile<RepairHistory>(
  schema as unknown as JSONSchemaType<RepairHistory>
);

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) {
    return "Invalid repair history";
  }

  return errors
    .map(error => {
      const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : "<root>";
      return `${path} ${error.message ?? "validation error"}`;
    })
    .join("; ");
}

function validateDomainRules(history: RepairHistory): string[] {
  const errors: string[] = [];

  if (history.attempts.length !== history.totalAttempts) {
    errors.push(
      `totalAttempts (${history.totalAttempts}) must match attempts length (${history.attempts.length})`
    );
  }

  const seenAttemptNumbers = new Set<number>();
  let expectedCumulative = 0;

  history.attempts.forEach((attempt, index) => {
    if (attempt.number < 1 || attempt.number > 4) {
      errors.push(`attempt[${index}].number must be between 1 and 4`);
    }

    if (seenAttemptNumbers.has(attempt.number)) {
      errors.push(`attempt number ${attempt.number} is duplicated`);
    }
    seenAttemptNumbers.add(attempt.number);

    if (index > 0) {
      const previousAttempt = history.attempts[index - 1];
      if (previousAttempt && attempt.number <= previousAttempt.number) {
        errors.push(`attempt[${index}].number must increase sequentially`);
      }
    }

    expectedCumulative += attempt.durationMs;

    if (attempt.cumulativeTime !== expectedCumulative) {
      errors.push(
        `attempt[${index}].cumulativeTime (${attempt.cumulativeTime}) must equal accumulated duration (${expectedCumulative})`
      );
    }
  });

  const hasPass = history.attempts.some(attempt => attempt.testResult.status === "pass");

  if (history.finalStatus === "pass") {
    if (history.successAttemptNumber == null) {
      errors.push("successAttemptNumber is required when finalStatus is 'pass'");
    } else {
      const matchingAttempt = history.attempts.find(
        attempt => attempt.number === history.successAttemptNumber
      );
      if (!matchingAttempt) {
        errors.push(
          `successAttemptNumber ${history.successAttemptNumber} does not match an attempt`
        );
      } else if (matchingAttempt.testResult.status !== "pass") {
        errors.push(
          `Attempt ${matchingAttempt.number} referenced by successAttemptNumber did not pass`
        );
      }
    }
  } else if (history.successAttemptNumber != null) {
    errors.push("successAttemptNumber must be omitted unless finalStatus is 'pass'");
  }

  if (history.finalStatus === "pass" && !hasPass) {
    errors.push("At least one attempt must have a passing testResult when finalStatus is 'pass'");
  }

  if (history.finalStatus === "exhausted" && hasPass) {
    errors.push("finalStatus 'exhausted' cannot include a passing attempt");
  }

  const lastAttempt = history.attempts.at(-1);
  if (lastAttempt && history.finalStatus === "fail" && lastAttempt.testResult.status === "pass") {
    errors.push("finalStatus 'fail' cannot end with a passing test result");
  }

  return errors;
}

export function validateRepairHistory(data: unknown): ValidationResult<RepairHistory> {
  const isValid = validator(data);

  if (!isValid) {
    return { ok: false, errors: formatErrors(validator.errors) };
  }

  const history = data as RepairHistory;
  const domainErrors = validateDomainRules(history);
  if (domainErrors.length > 0) {
    return { ok: false, errors: domainErrors.join("; ") };
  }

  return { ok: true, value: history };
}

export type { ValidationResult };
