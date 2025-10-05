import Ajv from "ajv";
import addFormats from "ajv-formats";
import schema from "../../contracts/executor-output.schema.json" assert { type: "json" };
import type { ExecutorOutput } from "./types.js";

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile<ExecutorOutput>(schema as any);

export function validateExecutorOutput(data: unknown): { ok: true; value: ExecutorOutput } | { ok: false; errors: string } {
  const ok = validate(data);
  if (ok) return { ok: true, value: data as ExecutorOutput };
  const msg = (validate.errors || []).map(e => `${e.instancePath} ${e.message}`).join("; ");
  return { ok: false, errors: msg || "Invalid schema" };
}
