import { createRequire } from "node:module";

import Ajv2020, { type ErrorObject, type JSONSchemaType } from "ajv/dist/2020";
import addFormats from "ajv-formats";

const requireJson = createRequire(import.meta.url);
const runResultSchema = requireJson("../../contracts/run-result.schema.json");
const executorOutputSchema = requireJson("../../contracts/executor-output.schema.json");
const repairArtifactSchema = requireJson("../../contracts/repair-artifact.schema.json");
import type { ExecutorOutput } from "../executor/types.js";

export interface RunResult {
  status: "pass" | "fail" | "error";
  passCount: number;
  failCount: number;
  durationMs: number;
  logsPath: string;
  timestamp: string;
  command?: string;
  exitCode?: number;
  signal?: string;
  timedOut?: boolean;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RepairArtifactDescription {
  path: string;
  action: "modify" | "add" | "delete";
  description?: string;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
  strictSchema: false
});
addFormats(ajv);

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string };

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) return "Invalid schema";
  return errors
    .map(error => {
      const instancePath = error.instancePath ? error.instancePath : "<root>";
      return `${instancePath} ${error.message ?? "validation error"}`;
    })
    .join("; ");
}

const runResultValidator = ajv.compile<RunResult>(
  runResultSchema as unknown as JSONSchemaType<RunResult>
);
const executorOutputValidator = ajv.compile<ExecutorOutput>(
  executorOutputSchema as unknown as JSONSchemaType<ExecutorOutput>
);
const repairArtifactValidator = ajv.compile<RepairArtifactDescription>(
  repairArtifactSchema as unknown as JSONSchemaType<RepairArtifactDescription>
);

export function validateRunResult(data: unknown): ValidationResult<RunResult> {
  const ok = runResultValidator(data);
  if (ok) return { ok: true, value: data as RunResult };
  return { ok: false, errors: formatErrors(runResultValidator.errors) };
}

export function validateExecutorOutput(data: unknown): ValidationResult<ExecutorOutput> {
  const ok = executorOutputValidator(data);
  if (ok) return { ok: true, value: data as ExecutorOutput };
  return { ok: false, errors: formatErrors(executorOutputValidator.errors) };
}

export function validateRepairArtifact(data: unknown): ValidationResult<RepairArtifactDescription> {
  const ok = repairArtifactValidator(data);
  if (ok) return { ok: true, value: data as RepairArtifactDescription };
  return { ok: false, errors: formatErrors(repairArtifactValidator.errors) };
}
