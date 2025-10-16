#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  isAutoUpdateEnabled,
  updateGateMarkdown,
  validateLedgerUpdate
} from './update-gate.js';

const LEDGER_PATH = path.resolve('.automation/GATES_LEDGER.md');

export async function autoUpdateLedgerWithEvidence(
  matches,
  logEntry,
  {
    ledgerPath = LEDGER_PATH,
    logger = console
  } = {}
) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return { updated: false, operations: [] };
  }

  if (!isAutoUpdateEnabled()) {
    logger?.log?.('\nℹ️  Gate auto-update is disabled (set GATE_AUTO_UPDATE=1 to enable).');
    return { updated: false, operations: [] };
  }

  let originalContent;
  try {
    originalContent = await fs.readFile(ledgerPath, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.warn?.(`\n⚠️  Unable to read ${ledgerPath} for gate auto-update: ${message}`);
    return { updated: false, operations: [], error: message };
  }

  let currentContent = originalContent;
  const operations = [];

  for (const match of matches) {
    if (!match?.gate || !match?.criterion) {
      operations.push({
        gate: match?.gate ?? 'unknown',
        criterion: match?.criterion ?? 'unknown',
        error: 'Invalid evidence match payload'
      });
      continue;
    }

    try {
      const result = updateGateMarkdown(currentContent, {
        gateId: match.gate,
        criterion: match.criterion,
        timestamp: match.timestamp ?? logEntry?.timestamp,
        command: match.command ?? logEntry?.command,
        evidencePath: match.details?.artifact ?? undefined,
        evidenceNote: match.source ? `Detected via ${match.source}` : undefined
      });

      const validation = validateLedgerUpdate(currentContent, result.content, match.gate);

      currentContent = result.content;
      operations.push({
        gate: match.gate,
        criterion: match.criterion,
        changes: result.changes,
        validation
      });
    } catch (error) {
      operations.push({
        gate: match.gate,
        criterion: match.criterion,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (currentContent === originalContent) {
    const hasErrors = operations.some(operation => operation.error);
    if (hasErrors) {
      logger?.log?.('\n⚠️  Gate auto-update encountered issues:');
      for (const operation of operations) {
        if (operation.error) {
          logger?.log?.(`  • ${operation.gate} — ${operation.criterion}: ❌ ${operation.error}`);
        }
      }
    } else {
      logger?.log?.('\nℹ️  Gate ledger already up to date.');
    }

    return { updated: false, operations };
  }

  await fs.writeFile(ledgerPath, currentContent, 'utf-8');

  logger?.log?.('\n🛠️  Gate ledger auto-updated:');
  for (const operation of operations) {
    if (operation.error) {
      logger?.log?.(`  • ${operation.gate} — ${operation.criterion}: ❌ ${operation.error}`);
      continue;
    }

    if (operation.changes?.alreadyComplete) {
      logger?.log?.(`  • ${operation.gate} — ${operation.criterion}: already complete (no changes needed)`);
      continue;
    }

    if (operation.changes?.criterionUpdated) {
      const statusNote = operation.changes.statusUpdated
        ? `status → ${operation.changes.nextStatus}`
        : 'criterion marked complete';
      logger?.log?.(`  • ${operation.gate} — ${operation.criterion}: ${statusNote}`);
      continue;
    }

    logger?.log?.(`  • ${operation.gate} — ${operation.criterion}: no changes required`);
  }

  return { updated: true, operations };
}
