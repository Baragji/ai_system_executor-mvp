import { describe, it, expect } from "vitest";

type RunInitial = { status?: string; passCount?: number; failCount?: number } | undefined;
type D = { files_written?: number; error?: unknown; testResults?: { initial?: RunInitial } };
function computeOutcome(data: unknown): 'success' | 'partial' | 'error' {
  const d = data as D;
  if (!data || (d as { error?: unknown }).error) return 'error';
  const files = Number(d.files_written || 0);
  if (!files) return 'error';
  const initial = d.testResults?.initial;
  const passCount = Number(initial?.passCount ?? 0);
  const failCount = Number(initial?.failCount ?? 0);
  const executed = passCount + failCount > 0;
  const status = String(initial?.status ?? '').toUpperCase();
  if (executed && (status === 'PASS' || status === 'PASSED')) return 'success';
  if (executed && status === 'FAIL') return 'partial';
  return 'error';
}

describe('Outcome State Machine', () => {
  it('no files -> error', () => {
    expect(computeOutcome({ ok: true, files_written: 0 })).toBe('error');
  });

  it('files + tests pass -> success', () => {
    expect(computeOutcome({ ok: true, files_written: 3, testResults: { initial: { status: 'pass', passCount: 1, failCount: 0 } } })).toBe('success');
  });

  it('files + tests fail -> partial', () => {
    expect(computeOutcome({ ok: true, files_written: 2, testResults: { initial: { status: 'fail', passCount: 0, failCount: 2 } } })).toBe('partial');
  });

  it('files + tests error -> error', () => {
    expect(computeOutcome({ ok: true, files_written: 2, testResults: { initial: { status: 'error', passCount: 0, failCount: 0 } } })).toBe('error');
  });

  it('files + no test execution -> error', () => {
    expect(computeOutcome({ ok: true, files_written: 2, testResults: { initial: undefined } })).toBe('error');
  });
});
