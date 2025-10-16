#!/usr/bin/env node
/**
 * Autonomous Next Action Executor (Phase 4: Autonomous Workflow)
 *
 * Executes the suggested next action from workflow state.
 *
 * Modes:
 * - Default (--interactive): Asks for confirmation before executing
 * - --dry-run: Prints action without executing
 * - --auto: Executes without confirmation (use with caution)
 *
 * Safety:
 * - Blocks git push commands (requires manual intervention)
 * - Blocks destructive operations
 * - All actions logged for audit
 */

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { stdin, stdout } from 'node:process';
import * as readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import { detectEvidenceForEntry, normalizeActionEntry } from './detect-evidence.js';
import { autoUpdateLedgerWithEvidence } from './gate-auto-update.js';
import { loadPhaseState, buildWorkflowMetadata } from '../workflow/lib/phaseState.js';

const execAsync = promisify(exec);
const ACTION_LOG_PATH = path.resolve('.automation/actions.jsonl');

function parseArgs(argv) {
  const options = {
    dryRun: false,
    interactive: true,
    auto: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '-n') {
      options.dryRun = true;
    } else if (arg === '--interactive' || arg === '-i') {
      options.interactive = true;
      options.auto = false;
    } else if (arg === '--auto' || arg === '-y') {
      options.auto = true;
      options.interactive = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Autonomous Next Action Executor

Usage:
  npm run state:next              # Interactive mode (default)
  npm run state:next:dry          # Dry-run (show action without executing)
  npm run state:next:auto         # Auto mode (execute without confirmation)

Options:
  --dry-run, -n        Print action without executing
  --interactive, -i    Ask for confirmation before executing (default)
  --auto, -y           Execute without confirmation
  --help, -h           Show this help

Safety:
  - Blocks git push commands (requires manual execution)
  - Blocks destructive operations
  - All actions logged for audit trail
`);
}

async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function readUncommittedChanges() {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024
    });
    return stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch {
    return [];
  }
}

function isSafeCommand(command) {
  const dangerous = [
    'git push',
    'npm publish',
    'rm -rf',
    'rmdir',
    'format',
    'mkfs',
    '>',  // Redirection could overwrite files
  ];

  for (const pattern of dangerous) {
    if (command.includes(pattern)) {
      return false;
    }
  }

  return true;
}

async function executeCommand(command, dryRun = false) {
  if (dryRun) {
    console.log('[DRY RUN] Would execute:', command);
    return { success: true, stdout: '', stderr: '', exitCode: 0, dryRun: true };
  }

  console.log('Executing:', command);

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    return { success: true, stdout, stderr, exitCode: 0 };
  } catch (error) {
    console.error('Command failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    const exitCode = typeof error.code === 'number' ? error.code : 1;
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode
    };
  }
}

async function appendActionLog(record) {
  try {
    await fs.mkdir(path.dirname(ACTION_LOG_PATH), { recursive: true });
    await fs.appendFile(ACTION_LOG_PATH, `${JSON.stringify(record)}\n`, 'utf-8');
  } catch (error) {
    console.warn('Failed to write workflow action log entry', error);
  }
}


async function main() {
  const options = parseArgs(process.argv);

  console.log('🤖 Autonomous Next Action Executor\n');

  // Load workflow state
  console.log('Loading workflow state...');
  const phaseState = await loadPhaseState();
  const uncommittedChanges = await readUncommittedChanges();
  const metadata = buildWorkflowMetadata(phaseState, {
    validations: null,
    uncommittedChanges,
    computedAt: Date.now()
  });

  const action = metadata.suggestedNextAction;

  console.log('\n📊 Current State:');
  console.log(`Phase: ${metadata.phase.name}`);
  console.log(`Current Gate: ${metadata.currentGate ? `${metadata.currentGate.id} (${metadata.currentGate.status})` : 'None'}`);
  console.log(`Current Task: ${metadata.currentTask ? metadata.currentTask.title : 'None'}`);
  console.log(`Uncommitted Changes: ${uncommittedChanges.length}`);

  console.log('\n🎯 Suggested Next Action:');
  console.log(`Action: ${action.action}`);
  console.log(`Reasoning: ${action.reasoning}`);
  console.log(`Command: ${action.command || 'N/A'}`);

  // Handle NO_ACTION case
  if (action.action === 'NO_ACTION') {
    console.log('\n✅ No action needed. Repository is clean and ready.');
    process.exit(0);
  }

  // Check if command exists
  if (!action.command) {
    console.log('\n⚠️  No command specified for this action.');
    process.exit(1);
  }

  // Safety check
  if (!isSafeCommand(action.command)) {
    console.error('\n❌ ERROR: Command contains potentially destructive operations.');
    console.error('For safety, the following patterns are blocked:');
    console.error('  - git push (use manual push to avoid accidental force-push)');
    console.error('  - npm publish');
    console.error('  - rm -rf / rmdir');
    console.error('  - file redirection (>)');
    console.error('\nPlease run this command manually after review.');
    process.exit(1);
  }

  // Dry-run mode
  if (options.dryRun) {
    console.log('\n[DRY RUN MODE]');
    console.log('Would execute:', action.command);
    console.log('\nTo execute, run: npm run state:next');
    process.exit(0);
  }

  // Interactive confirmation
  if (options.interactive) {
    console.log('');
    const confirmed = await askConfirmation('Execute this action?');
    if (!confirmed) {
      console.log('\n❌ Aborted by user.');
      process.exit(0);
    }
  }

  // Execute
  console.log('\n⚙️  Executing action...\n');
  const result = await executeCommand(action.command, false);

  const logRecord = {
    timestamp: new Date().toISOString(),
    cmd: action.command,
    exit_code: result.exitCode ?? (result.success ? 0 : 1),
    status: result.success ? 'completed' : 'failed',
    action: action.action,
    reasoning: action.reasoning,
    gate: metadata.currentGate ? metadata.currentGate.id : null,
    task: metadata.currentTask ? metadata.currentTask.id : null,
    mode: options.auto ? 'auto' : options.interactive ? 'interactive' : 'unknown'
  };

  await appendActionLog(logRecord);

  const normalizedLogEntry = normalizeActionEntry(logRecord, 'state:next');
  const evidenceMatches = detectEvidenceForEntry(normalizedLogEntry);

  if (evidenceMatches.length > 0) {
    console.log('\n🔍 Evidence detected from this action:');
    for (const match of evidenceMatches) {
      console.log(`  • ${match.gate} — ${match.criterion}`);
    }
  } else {
    console.log('\nℹ️  No gate evidence detected from this action.');
  }

  if (result.success) {
    if (evidenceMatches.length > 0) {
      await autoUpdateLedgerWithEvidence(evidenceMatches, normalizedLogEntry);
    }

    console.log('\n✅ Action completed successfully!');
    console.log('\nNext: Run `npm run state:show` to see updated status.');
    process.exit(0);
  } else {
    console.error('\n❌ Action failed. See error output above.');
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
