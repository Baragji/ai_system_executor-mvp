#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const detectorPath = path.resolve('scripts/detect-evidence.js');
const tsConstantsPath = path.resolve('workflow/lib/gateCriteria.ts');
const jsConstantsPath = path.resolve('workflow/lib/gateCriteria.js');

function info(msg){ console.log(msg); }
function fail(msg){ console.error(msg); process.exit(1); }

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const hasConstants = fileExists(tsConstantsPath) || fileExists(jsConstantsPath);
  if (!hasConstants) {
    info('Detector constants check: skipped (canonical constants module not present).');
    process.exit(0);
  }

  if (!fileExists(detectorPath)) {
    info('Detector file not found; skipping.');
    process.exit(0);
  }

  const source = fs.readFileSync(detectorPath, 'utf8');

  // Regex: criterion: '...'/"..."/`...`
  const hardcodedCriterion = /\bcriterion\s*:\s*(["'`]).*?\1/g;
  const matches = Array.from(source.matchAll(hardcodedCriterion));
  // Allow the internal hint placeholder used by the aggregator
  const offenders = matches.filter(m => !m[0].includes('__HINT_LANGGRAPH_EXECUTE__'));

  if (offenders.length > 0) {
    const preview = offenders.slice(0, 5).map(m => m[0]).join('\n  ');
    fail(
      'Found hardcoded `criterion` string literal(s) in scripts/detect-evidence.js.\n' +
      '  Offending patterns:\n' +
      `  ${preview}\n` +
      'Please import canonical values from workflow/lib/gateCriteria and reference those instead.'
    );
  }

  console.log('✅ Detector constants check passed (no hardcoded criterion strings).');
}

main();
