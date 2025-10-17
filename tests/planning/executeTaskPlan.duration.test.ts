import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

type Subtask = { id: string; title: string; description: string; status: 'pending'|'in_progress'|'completed'|'failed'; dependencies?: string[] };
type TaskPlan = { originalPrompt: string; subtasks: Subtask[]; totalSubtasks: number };
type SubtaskResult = { status: 'completed'|'failed'; subtaskId: string; generatedFiles: string[]; testResult: unknown; repairHistory: unknown; durationMs: number; notes?: string };
type RunResult = { status: 'pass'|'fail'|'error'; passCount: number; failCount: number; durationMs: number; logsPath: string; timestamp: string };
type RepairHistory = { attempts: unknown[]; finalStatus: 'exhausted'|'fail'|'pass'; totalAttempts: number; successAttemptNumber?: number };
type PlanExecutionContext = {
  projectPath: string;
  projectSlug: string;
  originalPrompt: string;
  previousSubtaskResults: unknown[];
  generateSubtaskOutput: () => Promise<{ project_name: string; files: unknown[]; notes: unknown[]; hasTests: boolean }>;
  writeFiles: () => Promise<void>;
  runTests: () => Promise<RunResult>;
  multiTurnRepair: () => Promise<RepairHistory>;
  subtaskExecutor: (s: Subtask) => Promise<SubtaskResult>;
  now: () => number;
};

const OLD_ENV = { ...process.env };

describe('executeTaskPlan duration limit', () => {
  beforeEach(() => {
    process.env.PLAN_MAX_DURATION_MS = '100';
  });
  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('halts quickly when PLAN_MAX_DURATION_MS is small', async () => {
    // Plan with two subtasks
    const plan: TaskPlan = {
      originalPrompt: 'demo',
      totalSubtasks: 2,
      subtasks: [
        { id: 'a', title: 'A', description: 'A', status: 'pending' },
        { id: 'b', title: 'B', description: 'B', status: 'pending', dependencies: ['a'] }
      ]
    };

    // Time source that advances beyond threshold after first subtask
    let t = 0;
    const now = () => t;
    const subtaskExecutor: PlanExecutionContext['subtaskExecutor'] = async (s: Subtask): Promise<SubtaskResult> => {
      // first run increments time past 100ms to trigger halt on next loop
      t += 200;
      return { status: 'failed', subtaskId: s.id, generatedFiles: [], testResult: null, repairHistory: null, durationMs: 5 };
    };

    const ctx: PlanExecutionContext = {
      projectPath: '/tmp/x', projectSlug: 'x', originalPrompt: 'x',
      previousSubtaskResults: [],
      generateSubtaskOutput: async () => ({ project_name: 'x', files: [], notes: [], hasTests: false }),
      writeFiles: async () => {},
      runTests: async () => ({ status: 'pass', passCount: 0, failCount: 0, durationMs: 0, logsPath: '', timestamp: new Date().toISOString() }),
      multiTurnRepair: async () => ({ attempts: [], finalStatus: 'exhausted', totalAttempts: 0, successAttemptNumber: undefined }),
      subtaskExecutor,
      now
    };

    vi.resetModules();
    const { executeTaskPlan } = await import('../../src/planning/executeTaskPlan.js');
    const result = await executeTaskPlan(plan as unknown as TaskPlan, ctx as unknown as PlanExecutionContext);
    expect(['failed','partial']).toContain(result.status);
    // Should not have executed more than first subtask given the small duration limit
    expect(result.subtaskResults.length).toBe(1);
  });
});
