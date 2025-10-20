#!/usr/bin/env node
/**
 * Metrics collection script for AGENTS.md Rule 4 (Baseline → Change → Final)
 *
 * Usage:
 *   node scripts/metrics.js --out .automation/evidence/$TASK/baseline.json
 *   node scripts/metrics.js --out .automation/evidence/$TASK/final.json
 *
 * Captures:
 * - Deep imports count (../../../../src/)
 * - Test coverage (lines/branches)
 * - File counts per service
 * - Lint/typecheck status
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outputPath = outIndex !== -1 ? args[outIndex + 1] : null;

if (!outputPath) {
  console.error('Usage: node scripts/metrics.js --out <path>');
  process.exit(1);
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', ...options });
  } catch (err) {
    return { error: err.message, exitCode: err.status };
  }
}

function countDeepImports() {
  const result = exec('rg -c "../../../../src/" services/ 2>/dev/null || echo "0"');
  if (typeof result === 'object' && result.error) return 0;

  // Sum all counts from rg output (format: file:count)
  const lines = result.trim().split('\n').filter(Boolean);
  return lines.reduce((sum, line) => {
    const match = line.match(/:(\d+)$/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);
}

function getTestCoverage() {
  const result = exec('npm test -- --reporter=json 2>/dev/null || echo "{}"');
  if (typeof result === 'object' && result.error) {
    return { lines: 0, branches: 0, error: result.error };
  }

  try {
    const testOutput = JSON.parse(result);
    // Vitest coverage is in testResults.coverage or separate coverage file
    // This is a simplified extraction - adjust based on your test setup
    return {
      lines: testOutput.coverage?.lines?.pct || 0,
      branches: testOutput.coverage?.branches?.pct || 0,
      tests_passed: testOutput.numPassedTests || 0,
      tests_total: testOutput.numTotalTests || 0
    };
  } catch (err) {
    // Fallback: parse from text output
    const coverageMatch = result.match(/Lines\s*:\s*([\d.]+)%.*Branches\s*:\s*([\d.]+)%/s);
    if (coverageMatch) {
      return {
        lines: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2])
      };
    }
    return { lines: 0, branches: 0, error: 'Could not parse coverage' };
  }
}

function countServiceFiles() {
  const services = ['planning', 'repair', 'executor', 'clarification', 'runner', 'orchestrator', 'llm-gateway'];
  const counts = {};

  for (const service of services) {
    const result = exec(`find services/${service}/src -type f -name "*.ts" 2>/dev/null | wc -l`);
    counts[service] = typeof result === 'string' ? parseInt(result.trim(), 10) : 0;
  }

  return counts;
}

function getLintStatus() {
  const result = exec('npm run lint 2>&1');
  if (typeof result === 'object' && result.error) {
    return { passed: false, exitCode: result.exitCode };
  }
  return { passed: true, exitCode: 0 };
}

function getTypecheckStatus() {
  const result = exec('npm run typecheck 2>&1');
  if (typeof result === 'object' && result.error) {
    return { passed: false, exitCode: result.exitCode };
  }
  return { passed: true, exitCode: 0 };
}

function getGitState() {
  return {
    branch: exec('git rev-parse --abbrev-ref HEAD').trim(),
    commit: exec('git rev-parse HEAD').trim(),
    uncommitted: exec('git status --short').trim().split('\n').filter(Boolean).length
  };
}

// Collect metrics
const metrics = {
  timestamp: new Date().toISOString(),
  deep_imports: countDeepImports(),
  coverage: getTestCoverage(),
  service_files: countServiceFiles(),
  lint: getLintStatus(),
  typecheck: getTypecheckStatus(),
  git: getGitState(),
  node_version: process.version,
  npm_version: exec('npm -v').trim()
};

// Ensure output directory exists
const outDir = dirname(outputPath);
mkdirSync(outDir, { recursive: true });

// Write output
writeFileSync(outputPath, JSON.stringify(metrics, null, 2));

console.log(`Metrics collected: ${outputPath}`);
console.log(`Deep imports: ${metrics.deep_imports}`);
console.log(`Coverage: ${metrics.coverage.lines}% lines, ${metrics.coverage.branches}% branches`);
console.log(`Lint: ${metrics.lint.passed ? 'PASS' : 'FAIL'}`);
console.log(`Typecheck: ${metrics.typecheck.passed ? 'PASS' : 'FAIL'}`);
