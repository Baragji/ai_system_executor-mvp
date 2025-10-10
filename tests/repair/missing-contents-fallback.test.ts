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

describe('repair hardening: skip missing-contents artifacts', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repair-fallback-'));
    await fs.mkdir(path.join(tmpDir, 'src'), { recursive: true });

    // Initial minimal project with missing deps to simulate failing tests
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'app',
        version: '0.0.0',
        private: true,
        scripts: { test: 'node --version' },
        dependencies: { express: '^4.18.2', cors: '^2.8.5' },
        devDependencies: { tailwindcss: '^3.4.1' }
      }, null, 2),
      'utf-8'
    );
    await fs.writeFile(path.join(tmpDir, 'src', 'server.js'), 'module.exports = {}\n', 'utf-8');

    // LLM returns artifacts that include server.js but omits its contents in files[]
    const desiredPkg = {
      name: 'app', version: '0.0.0', private: true,
      scripts: { test: 'node --version' },
      dependencies: { express: '^4.18.2', cors: '^2.8.5', uuid: '^9.0.0' },
      devDependencies: { tailwindcss: '^3.4.1', postcss: '^8.4.31', autoprefixer: '^10.4.16' }
    };

    const payload = {
      artifacts: [
        { path: 'src/server.js', action: 'modify' },
        { path: 'package.json', action: 'modify' }
      ],
      files: [
        { path: 'package.json', contents: JSON.stringify(desiredPkg) }
        // NOTE: intentionally missing contents for src/server.js
      ],
      notes: []
    };

    chooseProviderMock.mockReturnValue({
      generate: async () => {
        // Both first call and strict retry return same payload (still missing server.js)
        return JSON.stringify(payload);
      }
    });

    runInSandboxMock.mockImplementation(async () => ({
      status: 'pass', passCount: 1, failCount: 0,
      durationMs: 50, logsPath: 'logs/x.log', timestamp: new Date().toISOString()
    }));
  });

  afterEach(async () => {
    chooseProviderMock.mockReset();
    runInSandboxMock.mockReset();
  });

  it('applies files when artifacts reference missing contents and then passes tests', async () => {
    const ctx: MultiTurnContext = {
      projectPath: tmpDir,
      originalPrompt: 'test',
      generatedFiles: ['package.json', 'src/server.js'],
      initialTestResult: {
        status: 'fail', passCount: 0, failCount: 1,
        durationMs: 1, logsPath: '', timestamp: new Date().toISOString()
      }
    };

    const history = await multiTurnRepair(ctx);
    expect(history.finalStatus).toBe('pass');

    const pkgRaw = await fs.readFile(path.join(tmpDir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    expect(pkg.dependencies.uuid).toBeTruthy();
    expect(pkg.devDependencies.postcss).toBeTruthy();
    expect(pkg.devDependencies.autoprefixer).toBeTruthy();
  });
});
