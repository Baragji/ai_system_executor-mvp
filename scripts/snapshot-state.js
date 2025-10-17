#!/usr/bin/env node
/**
 * State Snapshot Generator (Phase 1: Read-Only Synthesis)
 *
 * Produces a synthesized, read-only view of repo state as JSON.
 * - Sources: GATES_LEDGER, contracts (phase 19/20), git status
 * - Optional: run validations if --validate is passed
 * - Outputs to .automation/WHERE_AM_I.json and/or prints to stdout with --print
 *
 * No new dependencies. ESM compatible (package.json type: module).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
// no file URL helpers needed
import { exec } from 'node:child_process';

import { loadGateCriteria } from '../workflow/lib/gateCriteria.js';


const ROOT = process.cwd();
const AUTOMATION_DIR = path.join(ROOT, '.automation');
const LEDGER_PATH = path.join(AUTOMATION_DIR, 'GATES_LEDGER.md');
const OUTPUT_PATH = path.join(AUTOMATION_DIR, 'WHERE_AM_I.json');
const CONTRACTS_DIR = path.join(ROOT, 'contracts', 'Roadmap_execution');

const G3_VALIDATION_RULES = [
  {
    includes: ['Deterministic replay validation'],
    action: 'RUN_DETERMINISTIC_REPLAY_TESTS',
    command: 'AGENTS_RUNTIME=langgraph npm test tests/orchestrator/replay.test.ts',
    reasoning:
      'Deterministic replay validation remains unchecked for Gate G3. Run the LangGraph replay tests to capture evidence.',
    relativePath: 'tests/orchestrator/replay.test.ts'
  },
  {
    includes: ['Parity tests'],
    action: 'RUN_PARITY_TESTS',
    command: 'AGENTS_RUNTIME=langgraph npm test tests/orchestrator/parity.test.ts',
    reasoning:
      'Parity tests are still pending for Gate G3. Execute the LangGraph parity suite to confirm StepQueue fallback behaviour.',
    relativePath: 'tests/orchestrator/parity.test.ts'
  },
  {
    includes: ['Performance benchmarks'],
    action: 'RUN_PERFORMANCE_BENCHMARKS',
    command: 'AGENTS_RUNTIME=langgraph npm test tests/benchmarks/perf-overhead.test.ts',
    reasoning:
      'Performance benchmarks remain incomplete for Gate G3. Measure LangGraph overhead to gather required evidence.',
    relativePath: 'tests/benchmarks/perf-overhead.test.ts'
  }
];

function parseArgs(argv) {
  const args = new Set();
  const out = { print: false, validate: false, out: OUTPUT_PATH };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--print' || a === '--pretty') out.print = true;
    else if (a === '--validate') out.validate = true;
    else if (a === '--no-validate') out.validate = false;
    else if (a === '--out') {
      const next = argv[i + 1];
      if (next) {
        out.out = path.resolve(next);
        i++;
      }
    } else {
      args.add(a);
    }
  }
  return out;
}

async function safeRead(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Parse .automation/GATES_LEDGER.md into a simple gates summary
 */
function normalizeStatus(raw) {
  const s = (raw || '').toUpperCase();
  if (s.includes('PASSED') || s.includes('✅')) return 'passed';
  if (s.includes('PARTIAL') || s.includes('🟡')) return 'partial';
  if (s.includes('FAILED') || s.includes('❌')) return 'failed';
  if (s.includes('NOT STARTED') || s.includes('⏳')) return 'not_started';
  return 'unknown';
}

function parseGatesLedger(md) {
  const summary = {};
  if (!md) return summary;
  const gateBlocks = md.split(/\n---\n/g);
  for (const block of gateBlocks) {
    const gateMatch = block.match(/##\s+Gate\s+(G\d+)/);
    if (!gateMatch) continue;
    const id = gateMatch[1];
    const statusLine = block.match(/\*\*Status:\*\*\s*([^\n]+)/);
    const status = normalizeStatus(statusLine ? statusLine[1] : '');
    summary[id] = status;
  }
  return summary;
}

async function findPhase19Contract() {
  try {
    const entries = await fs.readdir(CONTRACTS_DIR);
    const name = entries.find((f) => /19_phase19_autonomous_transition_contract\.json$/.test(f));
    return name ? path.join(CONTRACTS_DIR, name) : null;
  } catch {
    return null;
  }
}

async function loadJson(file) {
  try {
    const txt = await fs.readFile(file, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function runCmd(cmd, cwd = ROOT) {
  return new Promise((resolve) => {
    const child = exec(cmd, { cwd, env: process.env, timeout: 60_000 }, (error, stdout, stderr) => {
      resolve({
        cmd,
        exitCode: error && typeof error.code === 'number' ? error.code : 0,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
      });
    });
    // Prevent hanging processes
    child.on('error', () => {
      resolve({ cmd, exitCode: 1, stdout: '', stderr: 'spawn error' });
    });
  });
}

async function getGitStatus() {
  const res = await runCmd('git status --porcelain');
  if (res.exitCode !== 0) return [];
  const lines = res.stdout.split(/\r?\n/).filter(Boolean);
  return lines.map((l) => l.trim());
}

async function getValidationSummary(shouldValidate) {
  if (!shouldValidate) {
    return {
      last_run: null,
      lint: 'skipped',
      typecheck: 'skipped',
      test: 'skipped',
      contract_check: 'skipped',
    };
  }
  const startedAt = new Date().toISOString();
  const lint = await runCmd('npm run -s lint');
  const typecheck = await runCmd('npm run -s typecheck');
  const test = await runCmd('npm test -s');
  const contractCheck = await runCmd('npm run -s contract:check');
  return {
    last_run: startedAt,
    lint: lint.exitCode === 0 ? 'pass' : 'fail',
    typecheck: typecheck.exitCode === 0 ? 'pass' : 'fail',
    test: test.exitCode === 0 ? 'pass' : 'fail',
    contract_check: contractCheck.exitCode === 0 ? 'pass' : 'fail',
  };
}

function isCriterionComplete(status) {
  return status === '✅';
}

async function resolvePendingG3Validations({ gates, gateCriteriaIndex }) {
  const pending = [];
  const g2 = gates['G2'];
  const g3 = gates['G3'];
  const eligible = g2 === 'passed' && (!g3 || g3 === 'partial' || g3 === 'not_started' || g3 === 'unknown');
  if (!eligible) {
    return pending;
  }

  const criteria = gateCriteriaIndex?.G3 ?? [];
  for (const rule of G3_VALIDATION_RULES) {
    const criterion = criteria.find(entry => rule.includes.every(token => entry.text.includes(token)));
    if (criterion && !isCriterionComplete(criterion.status)) {
      pending.push({
        action: rule.action,
        command: rule.command,
        reasoning: rule.reasoning
      });
    }
  }

  return pending;
}

function suggestNextAction({ gates, validations, uncommitted, pendingValidations }) {
  if (pendingValidations && pendingValidations.length > 0) {
    return pendingValidations[0];
  }
  // Basic heuristics
  const g2 = gates['G2'];
  const g3 = gates['G3'];

  if (uncommitted.length > 0) {
    const testChanges = uncommitted.some((l) => /\stests\//.test(l));
    return {
      action: testChanges ? 'COMMIT_PENDING_TESTS' : 'COMMIT_PENDING_CHANGES',
      reasoning: 'Uncommitted changes detected. Commit to persist progress.',
      command: "git add -A && git commit -m 'chore: persist progress'",
    };
  }

  if (validations && validations.lint === 'fail' || validations.typecheck === 'fail' || validations.test === 'fail') {
    return {
      action: 'FIX_VALIDATION_ERRORS',
      reasoning: 'One or more validations failing.',
      command: 'npm run validate:all',
    };
  }

  if (g2 === 'passed' && (g3 === 'partial' || g3 === 'not_started' || !g3)) {
    return {
      action: 'ADVANCE_ORCHESTRATOR_PILOT',
      reasoning: 'Trust Spine (G2) passed; G3 is partial. Advance orchestrator parity/perf work.',
      command: 'AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts',
    };
  }

  return {
    action: 'NO_ACTION',
    reasoning: 'Repository is clean and validations are not flagged. Continue planned work.',
    command: null,
  };
}

async function main() {
  const args = parseArgs(process.argv);

  const ledgerText = await safeRead(LEDGER_PATH);
  const gates = parseGatesLedger(ledgerText || '');
  const gateCriteriaIndex = loadGateCriteria({ ledgerPath: LEDGER_PATH });

  const contractPath = await findPhase19Contract();
  const contract = contractPath ? await loadJson(contractPath) : null;
  const contractStat = contractPath ? await fs.stat(contractPath).catch(() => null) : null;
  const phaseId = '19';
  const phaseName = contract?.contract_meta?.phase_name || 'Autonomous Transition';

  const uncommitted = await getGitStatus();
  const validations = await getValidationSummary(args.validate);
  const tasks = Array.isArray(contract?.tasks) ? contract.tasks : [];
  const pendingTasks = tasks.filter((task) => task && task.status !== 'complete');
  const pendingValidations = await resolvePendingG3Validations({ gates, gateCriteriaIndex });

  const snapshot = {
    generated_at: new Date().toISOString(),
    data_sources: {
      gates: path.relative(ROOT, LEDGER_PATH),
      contract: contractPath ? path.relative(ROOT, contractPath) : null,
      git: 'git status --porcelain',
    },
    current_phase: {
      id: phaseId,
      name: phaseName,
      contract_path: contractPath ? path.relative(ROOT, contractPath) : null,
    },
    gates_summary: gates,
    validation_summary: validations,
    uncommitted_changes: uncommitted,
    sync_status: {
      last_sync: contractStat ? contractStat.mtime.toISOString() : null,
      contract_stale: pendingTasks.length > 0,
      stale_tasks: pendingTasks.map((task) => task?.id).filter(Boolean),
    },
  };

  snapshot.pending_validations = pendingValidations;
  snapshot.suggested_next_action = suggestNextAction({
    gates,
    validations,
    uncommitted,
    pendingValidations
  });

  if (tasks.length > 0) {
    snapshot.tasks = tasks.map((task) => ({
      id: task?.id ?? null,
      title: task?.title ?? null,
      status: task?.status ?? null,
      completed_at: task?.completed_at ?? null
    }));
  }

  // Add a concise human-readable summary for quick scanning in terminals
  function summarizeGates(g) {
    const entries = Object.entries(g || {});
    if (entries.length === 0) return 'Gates: none';
    return 'Gates: ' + entries.map(([k, v]) => `${k}=${v}`).join(', ');
  }
  function summarizeValidations(v) {
    if (!v || !v.lint) return 'Validations: not_run';
    return `Validations: lint=${v.lint}, typecheck=${v.typecheck}, test=${v.test}, contract=${v.contract_check}`;
  }
  const humanSummary = [
    `Phase ${phaseId} — ${phaseName}`,
    summarizeGates(gates),
    summarizeValidations(validations),
    `Uncommitted: ${uncommitted.length}`,
    `Next: ${snapshot.suggested_next_action?.action || 'NONE'}`
  ].join(' | ');
  snapshot.human_readable_summary = humanSummary;

  await fs.mkdir(AUTOMATION_DIR, { recursive: true });
  await fs.writeFile(args.out, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  if (args.print) {
    // Print to stdout for quick inspection
    process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
  }
}

main().catch((err) => {
  const fallback = {
    generated_at: new Date().toISOString(),
    error: String(err?.message || err || 'unknown error'),
  };
  // Best-effort write; ignore errors
  fs.mkdir(AUTOMATION_DIR, { recursive: true }).then(() => fs.writeFile(OUTPUT_PATH, JSON.stringify(fallback, null, 2) + '\n', 'utf8')).catch(() => {});
  console.error('[state:snapshot] ERROR', err);
  process.exit(1);
});
