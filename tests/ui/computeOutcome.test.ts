import { describe, it, expect } from 'vitest';

// Import the browser module as an ES module
import { computeOutcomeFromPayload } from '../../src/ui/outcome.js';

describe('UI outcome mapping', () => {
  it('returns error when no files', () => {
    expect(computeOutcomeFromPayload({ ok: true, files_written: 0 })).toBe('error');
  });

  it('returns error when no tests executed', () => {
    const data = { ok: true, files_written: 3, testResults: { initial: { passCount: 0, failCount: 0, status: 'pass' } } };
    expect(computeOutcomeFromPayload(data)).toBe('error');
  });

  it('returns success when executed and pass', () => {
    const data = { ok: true, files_written: 3, testResults: { initial: { passCount: 2, failCount: 0, status: 'pass' } } };
    expect(computeOutcomeFromPayload(data)).toBe('success');
  });

  it('returns partial when executed and fail', () => {
    const data = { ok: true, files_written: 3, testResults: { initial: { passCount: 1, failCount: 1, status: 'fail' } } };
    expect(computeOutcomeFromPayload(data)).toBe('partial');
  });
});
