import { describe, it, expect } from 'vitest';

/**
 * Unit tests for computeOutcome() state machine logic
 * Tests the authoritative outcome determination that powers UI rendering
 */

// Mock implementation of computeOutcome for testing
// In production, this lives in public/script.js
interface ExecutionData {
  error?: string;
  files_written?: number;
  testResults?: {
    initial?: {
      executed?: boolean;
      status?: string;
      passCount?: number;
      failCount?: number;
    };
  };
  ok?: boolean;
  project?: string;
  browse_url?: string;
  planExecutionResult?: Record<string, unknown>;
}

function computeOutcome(data: ExecutionData | null | undefined): 'success' | 'partial' | 'error' {
  // 1. Generation failed or no files produced → ERROR
  if (!data || data.error || !data.files_written || data.files_written === 0) {
    return 'error';
  }

  // 2. Files generated + tests executed
  if (data.testResults?.initial?.executed) {
    const testStatus = data.testResults.initial.status?.toUpperCase();
    
    // Tests passed → SUCCESS
    if (testStatus === 'PASS' || testStatus === 'PASSED') {
      return 'success';
    }
    
    // Tests failed → PARTIAL (files exist but quality issue)
    return 'partial';
  }

  // 3. Files generated but tests not executed → ERROR (incomplete build)
  return 'error';
}

describe('Outcome State Machine', () => {
  describe('computeOutcome()', () => {
    it('should return "error" when data is null or undefined', () => {
      expect(computeOutcome(null)).toBe('error');
      expect(computeOutcome(undefined)).toBe('error');
    });

    it('should return "error" when data.error is present', () => {
      const data = {
        error: 'Something went wrong',
        files_written: 5,
        testResults: { initial: { executed: true, status: 'PASS' } }
      };
      expect(computeOutcome(data)).toBe('error');
    });

    it('should return "error" when files_written is 0', () => {
      const data = {
        files_written: 0,
        testResults: { initial: { executed: true, status: 'PASS' } }
      };
      expect(computeOutcome(data)).toBe('error');
    });

    it('should return "error" when files_written is missing', () => {
      const data = {
        testResults: { initial: { executed: true, status: 'PASS' } }
      };
      expect(computeOutcome(data)).toBe('error');
    });

    it('should return "success" when files written and tests pass', () => {
      const data = {
        files_written: 5,
        testResults: {
          initial: {
            executed: true,
            status: 'PASS'
          }
        }
      };
      expect(computeOutcome(data)).toBe('success');
    });

    it('should return "success" when tests status is "PASSED" (uppercase)', () => {
      const data = {
        files_written: 3,
        testResults: {
          initial: {
            executed: true,
            status: 'PASSED'
          }
        }
      };
      expect(computeOutcome(data)).toBe('success');
    });

    it('should return "partial" when files written but tests fail', () => {
      const data = {
        files_written: 5,
        testResults: {
          initial: {
            executed: true,
            status: 'FAIL',
            failCount: 2,
            passCount: 3
          }
        }
      };
      expect(computeOutcome(data)).toBe('partial');
    });

    it('should return "partial" when tests executed with error status', () => {
      const data = {
        files_written: 4,
        testResults: {
          initial: {
            executed: true,
            status: 'ERROR'
          }
        }
      };
      expect(computeOutcome(data)).toBe('partial');
    });

    it('should return "error" when files written but tests not executed', () => {
      const data = {
        files_written: 5,
        testResults: {
          initial: {
            executed: false,
            status: 'NOT_RUN'
          }
        }
      };
      expect(computeOutcome(data)).toBe('error');
    });

    it('should return "error" when files written but testResults missing', () => {
      const data = {
        files_written: 5
      };
      expect(computeOutcome(data)).toBe('error');
    });

    it('should return "error" when testResults.initial is missing', () => {
      const data = {
        files_written: 5,
        testResults: {}
      };
      expect(computeOutcome(data)).toBe('error');
    });

    it('should handle edge case: tests executed but status undefined', () => {
      const data = {
        files_written: 3,
        testResults: {
          initial: {
            executed: true
            // status missing
          }
        }
      };
      expect(computeOutcome(data)).toBe('partial'); // Not PASS/PASSED → partial
    });
  });

  describe('Outcome State Machine - Integration scenarios', () => {
    it('should handle successful project generation with all fields', () => {
      const data = {
        ok: true,
        files_written: 8,
        project: 'test-project',
        browse_url: 'http://localhost:3000/output/test-project',
        testResults: {
          initial: {
            executed: true,
            status: 'PASS',
            passCount: 12,
            failCount: 0
          }
        },
        planExecutionResult: {
          status: 'completed',
          subtaskResults: []
        }
      };
      expect(computeOutcome(data)).toBe('success');
    });

    it('should handle partial success with failing tests', () => {
      const data = {
        ok: true,
        files_written: 6,
        project: 'test-project',
        browse_url: 'http://localhost:3000/output/test-project',
        testResults: {
          initial: {
            executed: true,
            status: 'FAIL',
            passCount: 8,
            failCount: 4
          }
        }
      };
      expect(computeOutcome(data)).toBe('partial');
    });

    it('should handle complete failure with no files', () => {
      const data = {
        ok: false,
        error: 'LLM returned invalid JSON',
        files_written: 0
      };
      expect(computeOutcome(data)).toBe('error');
    });

    it('should handle missing package.json scenario (files exist but incomplete)', () => {
      const data = {
        ok: true,
        files_written: 2,
        testResults: {
          initial: {
            executed: false, // Can't run tests without package.json
            status: 'NOT_RUN'
          }
        }
      };
      expect(computeOutcome(data)).toBe('error');
    });
  });
});
