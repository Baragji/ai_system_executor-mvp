import { describe, it, expect } from "vitest";

// Inline a copy of computeOutcome logic to unit test pure behavior
type D = { files_written?: number; error?: unknown; testResults?: { initial?: { status?: string } } };
function computeOutcome(data: unknown): 'success' | 'partial' | 'error' {
  const d = data as D;
  if (!data || d.error) return 'error';
  const files = Number(d.files_written || 0);
  if (!files) return 'error';
  const initial = d.testResults?.initial;
  if (initial && initial.status) {
    const status = String(initial.status).toUpperCase();
    if (status === 'PASS' || status === 'PASSED') return 'success';
    return 'partial';
  }
  return 'error';
}

describe('Outcome State Machine', () => {
  it('no files -> error', () => {
    expect(computeOutcome({ ok: true, files_written: 0 })).toBe('error');
  });

  it('files + tests pass -> success', () => {
    expect(computeOutcome({ ok: true, files_written: 3, testResults: { initial: { status: 'pass' } } })).toBe('success');
  });

  it('files + tests fail -> partial', () => {
    expect(computeOutcome({ ok: true, files_written: 2, testResults: { initial: { status: 'fail' } } })).toBe('partial');
  });

  it('files + tests error -> partial (still generated)', () => {
    expect(computeOutcome({ ok: true, files_written: 2, testResults: { initial: { status: 'error' } } })).toBe('partial');
  });

  it('files + no test execution -> error', () => {
    expect(computeOutcome({ ok: true, files_written: 2, testResults: { initial: null } })).toBe('error');
  });
});
