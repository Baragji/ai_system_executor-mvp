#!/usr/bin/env node
/**
 * Phase 5.3 — Safe Gate Updates (Feature-Flagged)
 *
 * Applies structured updates to `.automation/GATES_LEDGER.md` after
 * validation evidence has been confirmed. All writes are guarded by the
 * `GATE_AUTO_UPDATE` feature flag; when the flag is disabled the script can
 * still be executed in `--dry-run` mode to preview the changes that would be
 * made.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LEDGER_PATH = path.resolve(".automation/GATES_LEDGER.md");

const STATUS_COMPLETE = "✅ PASSED";
const STATUS_PARTIAL = "🟡 PARTIAL";

function parseGateSections(content) {
  const lines = content.split(/\r?\n/);
  const sections = new Map();
  const order = [];

  let currentGate = null;
  let buffer = [];

  for (const line of lines) {
    const match = line.match(/^##\s+Gate\s+(G\d+)\b/);
    if (match) {
      if (currentGate) {
        sections.set(currentGate, buffer.join("\n"));
        order.push(currentGate);
      }
      currentGate = match[1];
      buffer = [line];
    } else if (currentGate) {
      buffer.push(line);
    }
  }

  if (currentGate) {
    sections.set(currentGate, buffer.join("\n"));
    order.push(currentGate);
  }

  return { sections, order };
}

export function validateLedgerUpdate(originalContent, updatedContent, targetGate) {
  const original = parseGateSections(originalContent);
  const updated = parseGateSections(updatedContent);

  if (original.order.length !== updated.order.length) {
    throw new Error("Gate ledger integrity check failed: gate count mismatch");
  }

  for (let index = 0; index < original.order.length; index++) {
    if (original.order[index] !== updated.order[index]) {
      throw new Error("Gate ledger integrity check failed: gate order changed");
    }
  }

  const targetOriginal = original.sections.get(targetGate);
  if (!targetOriginal) {
    throw new Error(`Gate ${targetGate} not found in ledger`);
  }

  const targetUpdated = updated.sections.get(targetGate);
  if (!targetUpdated) {
    throw new Error(`Gate ${targetGate} missing after update`);
  }

  for (const gate of original.order) {
    if (!updated.sections.has(gate)) {
      throw new Error(`Gate ledger integrity check failed: missing gate ${gate}`);
    }
  }

  for (const gate of updated.order) {
    if (!original.sections.has(gate)) {
      throw new Error(`Gate ledger integrity check failed: unexpected gate ${gate}`);
    }
  }

  for (const gate of original.order) {
    if (gate === targetGate) continue;
    const before = original.sections.get(gate);
    const after = updated.sections.get(gate);
    if (before !== after) {
      throw new Error(`Unexpected modifications detected in ${gate}`);
    }
  }

  return {
    targetGate,
    changed: targetOriginal !== targetUpdated
  };
}

function isExplicitOptOut(value) {
  if (value == null) return false;
  const trimmed = String(value).trim();
  if (trimmed === "") return false;
  return /^(0|false|off|no)$/i.test(trimmed);
}

export function isAutoUpdateEnabled(env = process.env) {
  const raw = env.GATE_AUTO_UPDATE;
  return !isExplicitOptOut(raw);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const positional = [];
  const options = {
    dryRun: false,
    evidencePath: undefined,
    evidenceNote: undefined,
    command: undefined,
    timestamp: undefined,
    completedDate: undefined
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "-n") {
      options.dryRun = true;
    } else if (arg === "--evidence" && args[i + 1]) {
      options.evidencePath = args[++i];
    } else if (arg === "--note" && args[i + 1]) {
      options.evidenceNote = args[++i];
    } else if (arg === "--command" && args[i + 1]) {
      options.command = args[++i];
    } else if (arg === "--timestamp" && args[i + 1]) {
      options.timestamp = args[++i];
    } else if (arg === "--completed" && args[i + 1]) {
      options.completedDate = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length < 2) {
    throw new Error("Usage: npm run gate:update <GATE_ID> <CRITERION> [options]");
  }

  const [gateId, ...criterionParts] = positional;
  const criterion = criterionParts.join(" ");

  if (!/^G\d+$/.test(gateId)) {
    throw new Error(`Invalid gate identifier: ${gateId}`);
  }

  if (!criterion.trim()) {
    throw new Error("Criterion must be provided");
  }

  return {
    gateId,
    criterion,
    dryRun: options.dryRun,
    evidencePath: options.evidencePath,
    evidenceNote: options.evidenceNote,
    command: options.command,
    timestamp: options.timestamp,
    completedDate: options.completedDate
  };
}

function buildEvidenceLine({ timestamp, command, evidencePath, note }) {
  const parts = [];
  if (command) {
    parts.push(`Command: \`${command}\``);
  }
  if (evidencePath) {
    parts.push(`Artifact: \`${evidencePath}\``);
  }
  if (note) {
    parts.push(note);
  }

  if (parts.length === 0) return undefined;

  const prefix = timestamp ? `${timestamp} — ` : "";
  return `- ${prefix}${parts.join("; ")}`;
}

function evidenceSignature(line) {
  if (!line) return undefined;
  const trimmed = line.trim();
  if (!trimmed.startsWith("-")) return undefined;

  const withoutMarker = trimmed.slice(1).trim();
  const separatorIndex = withoutMarker.indexOf("—");
  const payload =
    separatorIndex === -1
      ? withoutMarker
      : withoutMarker.slice(separatorIndex + 1).trim();

  return payload;
}

function findGateSection(lines, gateId) {
  const headingRegex = new RegExp(`^##\\s+Gate\\s+${gateId}\\b`);
  const startIndex = lines.findIndex(line => headingRegex.test(line));
  if (startIndex === -1) {
    throw new Error(`Gate section ${gateId} not found in ledger`);
  }

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^##\s+Gate\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  return { startIndex, endIndex };
}

function locateAcceptanceCriteria(lines, section) {
  const headingIndex = lines
    .slice(section.startIndex, section.endIndex)
    .findIndex(line => /^###\s+Acceptance Criteria/.test(line));

  if (headingIndex === -1) {
    throw new Error("Acceptance criteria section not found");
  }

  const absoluteHeading = section.startIndex + headingIndex;
  const criteriaIndices = [];

  for (let i = absoluteHeading + 1; i < section.endIndex; i++) {
    const line = lines[i];
    if (/^###\s+/.test(line) || /^##\s+/.test(line)) break;
    if (line.trim().startsWith("- ")) {
      criteriaIndices.push(i);
    }
  }

  return { headingIndex: absoluteHeading, criteriaIndices };
}

function markCriterionLine(line, criterion) {
  if (!line.includes(criterion)) {
    return { line, matched: false, alreadyComplete: false };
  }

  const alreadyComplete = /^-\s+✅\s/.test(line.trim());
  if (alreadyComplete) {
    return { line, matched: true, alreadyComplete: true };
  }

  const updatedLine = line.replace(/^-\s+[^\s]+\s+/, "- ✅ ");
  return { line: updatedLine, matched: true, alreadyComplete: false };
}

function computeGateStatus(lines, criteriaIndices) {
  if (criteriaIndices.length === 0) return STATUS_PARTIAL;
  const allComplete = criteriaIndices.every(index => lines[index].trim().startsWith("- ✅"));
  return allComplete ? STATUS_COMPLETE : STATUS_PARTIAL;
}

function updateStatusLine(lines, section, nextStatus) {
  const relativeStatusIndex = lines
    .slice(section.startIndex, section.endIndex)
    .findIndex(line => /^\*\*Status:\*\*/.test(line));

  if (relativeStatusIndex === -1) {
    return { updated: false };
  }

  const absoluteStatusIndex = section.startIndex + relativeStatusIndex;
  const currentLine = lines[absoluteStatusIndex];
  if (currentLine.includes(nextStatus)) {
    return { updated: false };
  }

  lines[absoluteStatusIndex] = currentLine.replace(/\*\*Status:\*\*.*$/, `**Status:** ${nextStatus}`);
  return { updated: true };
}

function updateCompletedLine(lines, section, completedDate) {
  if (!completedDate) {
    return { updated: false };
  }

  const relativeCompletedIndex = lines
    .slice(section.startIndex, section.endIndex)
    .findIndex(line => /^\*\*Completed:\*\*/.test(line));

  if (relativeCompletedIndex === -1) {
    return { updated: false };
  }

  const absolute = section.startIndex + relativeCompletedIndex;
  const current = lines[absolute];
  const replacement = `**Completed:** ${completedDate}`;
  if (current === replacement) {
    return { updated: false };
  }

  lines[absolute] = replacement;
  return { updated: true };
}

function appendEvidenceLine(lines, section, evidenceLine) {
  if (!evidenceLine) {
    return { appended: false };
  }

  const relativeEvidenceIndex = lines
    .slice(section.startIndex, section.endIndex)
    .findIndex(line => /^###\s+Evidence/.test(line));

  if (relativeEvidenceIndex === -1) {
    return { appended: false };
  }

  const absoluteEvidenceIndex = section.startIndex + relativeEvidenceIndex;

  let insertIndex = absoluteEvidenceIndex + 1;
  let lastEvidenceLineIndex = null;

  const targetSignature = evidenceSignature(evidenceLine);

  for (let i = insertIndex; i < section.endIndex; i++) {
    const line = lines[i];
    if (/^###\s+/.test(line) || /^##\s+/.test(line)) break;
    if (line.trim().startsWith("- ")) {
      if (targetSignature && evidenceSignature(line) === targetSignature) {
        return { appended: false, alreadyPresent: true };
      }

      lastEvidenceLineIndex = i;
    }
  }

  if (targetSignature) {
    for (let i = section.startIndex; i < section.endIndex; i++) {
      const line = lines[i];
      if (line.trim().startsWith("- ") && evidenceSignature(line) === targetSignature) {
        return { appended: false, alreadyPresent: true };
      }
    }
  }

  if (lastEvidenceLineIndex !== null) {
    insertIndex = lastEvidenceLineIndex + 1;
  }

  if (lines[insertIndex] && lines[insertIndex].trim().length > 0) {
    lines.splice(insertIndex, 0, evidenceLine);
  } else {
    lines.splice(insertIndex, 0, evidenceLine);
  }

  return { appended: true };
}

export function updateGateMarkdown(content, {
  gateId,
  criterion,
  timestamp,
  command,
  evidencePath,
  evidenceNote,
  completedDate
}) {
  const lines = content.split(/\r?\n/);
  const section = findGateSection(lines, gateId);
  const { criteriaIndices } = locateAcceptanceCriteria(lines, section);

  let criterionUpdated = false;
  let alreadyComplete = false;

  for (const index of criteriaIndices) {
    const result = markCriterionLine(lines[index], criterion);
    if (!result.matched) continue;
    alreadyComplete = result.alreadyComplete;
    if (alreadyComplete) {
      break;
    }
    lines[index] = result.line;
    criterionUpdated = true;
    break;
  }

  if (!criterionUpdated && !alreadyComplete) {
    throw new Error(`Criterion not found for gate ${gateId}: ${criterion}`);
  }

  let evidenceResult = { appended: false };
  if (criterionUpdated) {
    const evidenceLine = buildEvidenceLine({
      timestamp: timestamp ?? new Date().toISOString(),
      command,
      evidencePath,
      note: evidenceNote
    });
    evidenceResult = appendEvidenceLine(lines, section, evidenceLine);
  }

  const nextStatus = computeGateStatus(lines, criteriaIndices);
  const statusResult = updateStatusLine(lines, section, nextStatus);

  let derivedDate;
  if (timestamp) {
    const parsed = new Date(timestamp);
    if (!Number.isNaN(parsed.getTime())) {
      derivedDate = parsed.toISOString().slice(0, 10);
    }
  }

  const completionDate = completedDate ?? derivedDate ?? new Date().toISOString().slice(0, 10);

  const completedResult = nextStatus === STATUS_COMPLETE && criterionUpdated
    ? updateCompletedLine(lines, section, completionDate)
    : { updated: false };

  return {
    content: lines.join("\n"),
    changes: {
      criterionUpdated,
      alreadyComplete,
      statusUpdated: statusResult.updated,
      evidenceAdded: Boolean(evidenceResult.appended),
      completedUpdated: completedResult.updated,
      nextStatus
    }
  };
}

function printHelp() {
  console.log(`Gate Updater (Phase 5.3)\n\n` +
    "Usage:\n" +
    "  npm run gate:update <GATE_ID> <CRITERION> [options]\n\n" +
    "Options:\n" +
    "  --dry-run, -n           Preview changes without writing\n" +
    "  --command <cmd>         Record the command that produced evidence\n" +
    "  --evidence <path>       Reference an evidence artifact path\n" +
    "  --note <text>           Additional note to append\n" +
    "  --timestamp <iso>       Override evidence timestamp (ISO string)\n" +
    "  --completed <date>      Override completed date when gate passes\n" +
    "  --help, -h              Show this message\n\n" +
    "Environment:\n" +
    "  Gate auto-update is enabled by default. Set GATE_AUTO_UPDATE=false (or 0/off/no) to disable writes. Dry runs are always allowed.\n");
}

async function runCli() {
  const options = parseArgs(process.argv);
  const originalContent = await fs.readFile(LEDGER_PATH, "utf-8");

  const result = updateGateMarkdown(originalContent, {
    gateId: options.gateId,
    criterion: options.criterion,
    timestamp: options.timestamp,
    command: options.command,
    evidencePath: options.evidencePath,
    evidenceNote: options.evidenceNote,
    completedDate: options.completedDate
  });

  if (result.changes.alreadyComplete) {
    console.log(`Criterion already complete for ${options.gateId}: ${options.criterion}`);
    return;
  }

  if (!result.changes.criterionUpdated) {
    console.log("No changes required.");
    return;
  }

  const validation = validateLedgerUpdate(originalContent, result.content, options.gateId);

  if (!validation.changed) {
    console.log("No ledger differences detected after update attempt.");
    return;
  }

  if (options.dryRun) {
    console.log("[DRY RUN] Gate ledger would be updated with the following changes:");
    console.log(JSON.stringify(result.changes, null, 2));
    return;
  }

  if (!isAutoUpdateEnabled()) {
    throw new Error("GATE_AUTO_UPDATE opt-out is active. Refusing to modify ledger.");
  }

  await fs.writeFile(LEDGER_PATH, result.content, "utf-8");
  console.log(`✅ Updated ${options.gateId} — ${options.criterion}`);
  console.log(JSON.stringify(result.changes, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch(error => {
    console.error("Failed to update gate:", error.message ?? error);
    process.exit(1);
  });
}
