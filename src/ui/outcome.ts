export type Outcome = 'success' | 'partial' | 'error';

type InitialResult = { passCount?: number; failCount?: number; status?: string };
type TestResults = { initial?: InitialResult };
type Payload = { error?: unknown; files_written?: unknown; testResults?: unknown };

function isObject(x: unknown): x is Record<string, unknown> { return typeof x === 'object' && x !== null; }
function getNumber(u: unknown, fallback = 0): number { return typeof u === 'number' ? u : fallback; }

export function computeOutcomeFromPayload(input: unknown): Outcome {
  const data = isObject(input) ? (input as Payload) : {};
  if (data.error !== undefined) return 'error';
  const files = getNumber(data.files_written, 0);
  if (!files) return 'error';
  const tr = (isObject(data.testResults) ? (data.testResults as TestResults) : undefined);
  const initial = tr?.initial;
  const passCount = getNumber(initial?.passCount, 0);
  const failCount = getNumber(initial?.failCount, 0);
  const executed = passCount + failCount > 0;
  const status = String(initial?.status ?? '').toUpperCase();
  if (executed && (status === 'PASS' || status === 'PASSED')) return 'success';
  if (executed && status === 'FAIL') return 'partial';
  return 'error';
}
