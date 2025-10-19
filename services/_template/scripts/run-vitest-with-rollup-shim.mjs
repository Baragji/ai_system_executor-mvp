import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const vitestEntry = resolve(
  dirname(require.resolve('vitest/package.json')),
  'vitest.mjs'
);

const shimPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../tests/setup/register-rollup-wasm.mjs'
);

const extraOption = `--import=${shimPath}`;
const env = { ...process.env };

env.NODE_OPTIONS = env.NODE_OPTIONS
  ? `${env.NODE_OPTIONS} ${extraOption}`
  : extraOption;

const extraArgs = process.argv.slice(2);

const child = spawn(process.execPath, [vitestEntry, 'run', '--coverage', ...extraArgs], {
  stdio: 'inherit',
  env
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
