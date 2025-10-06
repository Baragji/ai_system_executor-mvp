import { createRequire } from "node:module";

import Ajv2020, { type JSONSchemaType } from "ajv/dist/2020";

const requireJson = createRequire(import.meta.url);
const schema = requireJson("../../contracts/execution-trace.schema.json");

export interface ExecutionTraceEntry {
  timestamp: string;
  task_id: string;
  action: string;
  status: string;
  cmd?: string;
  exit_code?: number;
  stdout_excerpt?: string;
  stderr_excerpt?: string;
  subtask_id?: string;
  progress_pct?: number;
  [key: string]: unknown;
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
  strictSchema: false
});

const validator = ajv.compile<ExecutionTraceEntry>(
  schema as JSONSchemaType<ExecutionTraceEntry>
);

export function validateExecutionTrace(entry: unknown): {
  ok: boolean;
  value?: ExecutionTraceEntry;
  errors?: string;
} {
  const valid = validator(entry);
  if (valid) {
    return { ok: true, value: entry as ExecutionTraceEntry };
  }

  const messages = validator.errors
    ?.map(error => {
      const path = error.instancePath && error.instancePath.length > 0 ? error.instancePath : "<root>";
      return `${path} ${error.message ?? "validation error"}`;
    })
    .join("; ");

  return { ok: false, errors: messages ?? "Invalid execution trace entry" };
}
