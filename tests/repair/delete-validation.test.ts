import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { chooseProviderMock } = vi.hoisted(() => ({ chooseProviderMock: vi.fn() }));
const { runInSandboxMock } = vi.hoisted(() => ({ runInSandboxMock: vi.fn() }));

vi.mock('../../src/llm/providers/choose.js', () => ({
  chooseProvider: (...args: unknown[]) => chooseProviderMock(...args)
}));

vi.mock('../../src/runner/runInSandbox.js', () => ({
  runInSandbox: (...args: unknown[]) => runInSandboxMock(...args)
}));

import { multiTurnRepair, type MultiTurnContext } from '../../src/repair/multiTurnRepair.js';

describe('repair intake: invalid delete stops with explicit category', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repair-delete-'));
    await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'app', version: '0.0.0', private: true, scripts: { test: 'node --version' } }, null, 2),
      'utf-8'
    );

    const payload = {
      artifacts: [
        { path: 'src/does-not-exist.js', action: 'delete' }
      ],
      files: [],
      notes: []
    };

    chooseProviderMock.mockReturnValue({
      generate: async () => JSON.stringify(payload)
    });

    runInSandboxMock.mockImplementation(async () => ({
      status: 'fail', passCount: 0, failCount: 1,
      durationMs: 50, logsPath: 'logs/x.log', timestamp: new Date().toISOString(),
      errorMessage: 'tests failing'
    }));
  });

  afterEach(async () => {
    chooseProviderMock.mockReset();
    runInSandboxMock.mockReset();
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it('emits REPAIR_INCOMPLETE_ARTIFACT and stops', async () => {
    const ctx: MultiTurnContext = {
      projectPath: tmpDir,
      originalPrompt: 'test',
      generatedFiles: [],
      initialTestResult: {
        status: 'fail', passCount: 0, failCount: 1,
        durationMs: 1, logsPath: '', timestamp: new Date().toISOString(), errorMessage: 'failing'
      }
    };

    const history = await multiTurnRepair(ctx);
    expect(history.finalStatus).toBe('fail');
    expect(history.attempts.length).toBe(1);
    expect(history.attempts[0]?.summary).toMatch(/REPAIR_INCOMPLETE_ARTIFACT/);
  });
});

