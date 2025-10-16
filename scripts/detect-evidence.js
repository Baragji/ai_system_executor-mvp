#!/usr/bin/env node
/**
<<<<<<< ours
<<<<<<< ours
 * Phase 5.1 – Evidence Detector (Read-Only)
 *
 * Scans workflow action logs and surfaces gate evidence without mutating
 * .automation/GATES_LEDGER.md. Designed to run safely even when action logs
 * are disabled or partially populated.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_SOURCES = [
  { path: path.resolve('.automation/actions.jsonl'), label: '.automation/actions.jsonl' },
  { path: path.resolve('.automation/execution_trace.jsonl'), label: '.automation/execution_trace.jsonl' }
];

const SUCCESS_STATUSES = new Set(['pass', 'passed', 'success', 'completed']);

/**
 * @typedef {Object} NormalizedActionEntry
 * @property {string | undefined} timestamp
 * @property {string | undefined} command
 * @property {number | undefined} exitCode
 * @property {string | undefined} status
 * @property {string} source
 * @property {Record<string, unknown>} raw
 */

/**
 * @typedef {Object} EvidenceMatch
 * @property {string} gate
 * @property {string} criterion
 * @property {string | undefined} timestamp
 * @property {string | undefined} command
 * @property {string} source
 * @property {Record<string, unknown>} details
 */

/**
 * Parse JSONL file into objects.
 * @param {string} filePath
 * @returns {Promise<{ entries: Record<string, unknown>[], warnings: string[], missing: boolean }>}
 */
export async function readJsonLines(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const lines = raw
      .split(/\r?\n/g)
      .map(line => line.trim())
      .filter(Boolean);

    const entries = [];
    const warnings = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      try {
        entries.push(JSON.parse(line));
      } catch (error) {
        warnings.push(`Line ${i + 1} is not valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { entries, warnings, missing: false };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { entries: [], warnings: [], missing: true };
    }
    throw error;
  }
}

/**
 * Normalize an action log entry for downstream processing.
 * @param {Record<string, unknown>} rawEntry
 * @param {string} source
 * @returns {NormalizedActionEntry}
 */
export function normalizeActionEntry(rawEntry, source) {
  const command = extractCommand(rawEntry);
  const exitCode = extractExitCode(rawEntry);
  const timestamp = typeof rawEntry.timestamp === 'string' ? rawEntry.timestamp : undefined;
  const status = typeof rawEntry.status === 'string' ? rawEntry.status.trim().toLowerCase() : undefined;

  return {
    command,
    exitCode,
    timestamp,
    status,
    source,
    raw: rawEntry
  };
}

function extractCommand(rawEntry) {
  if (!rawEntry) return undefined;
  const candidate = typeof rawEntry.cmd === 'string' ? rawEntry.cmd : typeof rawEntry.command === 'string' ? rawEntry.command : undefined;
  if (!candidate) return undefined;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractExitCode(rawEntry) {
  const exitCodeValue = rawEntry && typeof rawEntry === 'object'
    ? ('exit_code' in rawEntry ? rawEntry.exit_code : 'exitCode' in rawEntry ? rawEntry.exitCode : undefined)
    : undefined;

  if (typeof exitCodeValue === 'number' && Number.isFinite(exitCodeValue)) {
    return exitCodeValue;
  }

  if (typeof exitCodeValue === 'string') {
    const parsed = Number(exitCodeValue);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}

function isSuccessful(entry) {
  if (entry.exitCode !== undefined) {
    return entry.exitCode === 0;
  }
  if (entry.status) {
    return SUCCESS_STATUSES.has(entry.status);
  }
  return false;
}

function commandIncludes(command, text) {
  if (!command) return false;
  return command.includes(text);
}

function buildEvidence(entry, gate, criterion, details = {}) {
  return {
    gate,
    criterion,
    timestamp: entry.timestamp,
    command: entry.command,
    source: entry.source,
    details: { exitCode: entry.exitCode, status: entry.status, ...details }
  };
}

const SIMPLE_RULES = [
  {
    gate: 'G3',
    criterion: 'LangGraph parity tests passing',
    match(entry) {
      return isSuccessful(entry) && entry.command && commandIncludes(entry.command, 'npm test') && commandIncludes(entry.command, 'tests/api/executions.test.ts');
    }
  },
  {
    gate: 'G0',
    criterion: 'Lint passing',
    match(entry) {
      return isSuccessful(entry) && entry.command && commandIncludes(entry.command, 'npm run lint');
    }
  },
  {
    gate: 'G0',
    criterion: 'TypeScript typecheck passing',
    match(entry) {
      return isSuccessful(entry) && entry.command && commandIncludes(entry.command, 'npm run typecheck');
    }
  },
  {
    gate: 'G0',
    criterion: 'Test suite passing',
    match(entry) {
      if (!isSuccessful(entry) || !entry.command) return false;
      if (!commandIncludes(entry.command, 'npm test')) return false;
      return !commandIncludes(entry.command, 'tests/api/');
    }
  },
  {
    gate: 'G1',
    criterion: 'Contracts validated',
    match(entry) {
      return isSuccessful(entry) && entry.command && commandIncludes(entry.command, 'npm run contract:check');
    }
  }
];

/**
 * Detect evidence for Trust Spine artifacts (SBOM + provenance).
 * @param {NormalizedActionEntry[]} entries
 * @returns {EvidenceMatch | null}
 */
function detectTrustSpineArtifacts(entries) {
  let sbomEntry;
  let provenanceEntry;

  for (const entry of entries) {
    if (!isSuccessful(entry) || !entry.command) continue;

    if (commandIncludes(entry.command, 'npm run sbom')) {
      sbomEntry = entry;
    }

    if (commandIncludes(entry.command, 'npm run provenance')) {
      provenanceEntry = entry;
    }
  }

  if (!sbomEntry || !provenanceEntry) {
    return null;
  }

  const latestTimestamp = selectLatestTimestamp([sbomEntry.timestamp, provenanceEntry.timestamp]);

  return {
    gate: 'G2',
    criterion: 'Trust Spine artifacts generated (SBOM + provenance)',
    timestamp: latestTimestamp,
    command: `${sbomEntry.command} && ${provenanceEntry.command}`,
    source: sbomEntry.source,
    details: {
      sbomCommand: sbomEntry.command,
      provenanceCommand: provenanceEntry.command,
      sbomExitCode: sbomEntry.exitCode,
      provenanceExitCode: provenanceEntry.exitCode
    }
  };
}

function selectLatestTimestamp(timestamps) {
  const valid = timestamps.filter(ts => typeof ts === 'string');
  if (valid.length === 0) return undefined;
  return valid.sort().at(-1);
}

/**
 * Detect evidence from normalized entries.
 * @param {NormalizedActionEntry[]} entries
 * @returns {EvidenceMatch[]}
 */
export function detectEvidence(entries) {
  const matches = new Map();

  for (const entry of entries) {
    for (const rule of SIMPLE_RULES) {
      if (!rule.match(entry)) continue;
      const key = `${rule.gate}::${rule.criterion}`;
      const current = matches.get(key);
      if (!current || isNewer(entry.timestamp, current.timestamp)) {
        matches.set(key, buildEvidence(entry, rule.gate, rule.criterion));
      }
    }
  }

  const trustSpine = detectTrustSpineArtifacts(entries);
  if (trustSpine) {
    const key = `${trustSpine.gate}::${trustSpine.criterion}`;
    const current = matches.get(key);
    if (!current || isNewer(trustSpine.timestamp, current.timestamp)) {
      matches.set(key, trustSpine);
    }
  }

  return Array.from(matches.values()).sort((a, b) => compareTimestamps(a.timestamp, b.timestamp));
}

function isNewer(candidate, baseline) {
  if (!candidate) return false;
  if (!baseline) return true;
  return candidate > baseline;
}

function compareTimestamps(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}

function parseArgs(argv) {
  const options = {
    file: undefined,
    json: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--file' || arg === '-f') {
      const next = argv[i + 1];
      if (next) {
        options.file = path.resolve(next);
        i++;
      }
    } else if (arg === '--json' || arg === '-j') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Phase 5.1 Evidence Detector\n\nUsage:\n  npm run evidence:detect           # Human-readable summary\n  npm run evidence:detect -- --json # JSON output\n  npm run evidence:detect -- --file ./path/to/log.jsonl\n`);
}

async function loadNormalizedEntries(options) {
  const sources = options.file ? [{ path: options.file, label: options.file }] : DEFAULT_SOURCES;

  const warnings = [];

  for (const source of sources) {
    const result = await readJsonLines(source.path);
    warnings.push(...result.warnings.map(message => `${source.label}: ${message}`));

    if (result.entries.length === 0) {
      if (result.missing) continue;
      // File exists but empty, still return empty result for reporting.
      return { entries: [], source: source.label, warnings };
    }

    const normalized = result.entries.map(entry => normalizeActionEntry(entry, source.label));
    return { entries: normalized, source: source.label, warnings };
  }

  const fallbackLabel = options.file ? options.file : DEFAULT_SOURCES.at(-1)?.label ?? 'unknown';
  return { entries: [], source: fallbackLabel, warnings };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { entries, source, warnings } = await loadNormalizedEntries(options);

  if (!options.json) {
    console.log('🔍 Evidence Detector (Phase 5.1)');
    console.log(`Source: ${source}`);
  }

  if (warnings.length > 0 && !options.json) {
    for (const warning of warnings) {
      console.warn(`⚠️  ${warning}`);
    }
  }

  if (entries.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ source, evidence: [], warnings }, null, 2));
    } else {
      console.log('ℹ️  No log entries found. Ensure telemetry logging is enabled or run a workflow command first.');
    }
    return;
  }

  const evidence = detectEvidence(entries);

  if (options.json) {
    console.log(JSON.stringify({ source, evidence, warnings }, null, 2));
    return;
  }

  if (evidence.length === 0) {
    console.log('ℹ️  No matching evidence detected in recent log entries.');
    return;
  }

  console.log('\nDetected Evidence:');
  for (const item of evidence) {
    const when = item.timestamp ? ` @ ${item.timestamp}` : '';
    console.log(`• ${item.gate}: ${item.criterion}${when}`);
    if (item.command) {
      console.log(`  Command: ${item.command}`);
    }
  }
}

const isMainModule = () => {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
};

if (isMainModule()) {
  main().catch(error => {
    console.error('❌ Evidence detection failed:', error);
=======
=======
>>>>>>> theirs
 * Phase 5.1 — Evidence Detection (Read-Only)
 *
 * Scans workflow action logs to detect validation evidence that can later be
 * used to auto-update gate status. This script intentionally performs no
 * writes; it only reports what evidence exists.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ACTION_LOG_SOURCES = [
  {
    path: path.resolve(".automation/actions.jsonl"),
    label: ".automation/actions.jsonl"
  },
  {
    path: path.resolve(".automation/workflow_phase1-4_remediation_trace.jsonl"),
    label: ".automation/workflow_phase1-4_remediation_trace.jsonl"
  },
  {
    path: path.resolve(".automation/execution_trace.jsonl"),
    label: ".automation/execution_trace.jsonl"
  }
];

const DETECTION_RULES = [
  {
    gate: "G0",
    criterion: "Lint passing",
    matches: entry =>
      entry.success &&
      commandContains(entry.command, ["npm run lint", "eslint ."])
  },
  {
    gate: "G0",
    criterion: "TypeScript typecheck passing",
    matches: entry =>
      entry.success &&
      commandContains(entry.command, ["npm run typecheck", "tsc -p"])
  },
  {
    gate: "G0",
    criterion: "Unit tests passing",
    matches: entry =>
      entry.success &&
      (commandContains(entry.command, ["npm test"])
        || commandContains(entry.command, ["vitest run", "node scripts/run-vitest-with-rollup-shim.mjs"]))
  },
  {
    gate: "G1",
    criterion: "Contract validation passing",
    matches: entry =>
      entry.success &&
      commandContains(entry.command, ["npm run contract:check", "scripts/validate-contract.js"])
  },
  {
    gate: "G2",
    criterion: "SBOM + provenance artifacts generated",
    matches: entry =>
      entry.success &&
      (commandContains(entry.command, ["npm run sbom:all"]) ||
        commandContains(entry.command, ["npm run sbom", "npm run sbom:cyclonedx"]) ||
        commandContains(entry.command, ["npm run provenance", "scripts/generate-provenance.js"]))
  },
  {
    gate: "G3",
    criterion: "LangGraph parity tests passing",
    matches: entry =>
      entry.success &&
      commandContains(entry.command, [
        "AGENTS_RUNTIME=langgraph",
        "npm test",
        "tests/api/executions.test.ts"
      ])
  }
];

function commandContains(command, fragments) {
  const normalized = command.replace(/\s+/g, " ").trim();
  return fragments.every(fragment => normalized.includes(fragment));
}

function parseTimestamp(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (typeof raw === "string") {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
}

export function normalizeActionEntry(raw, sourceLabel = "unknown") {
  if (!raw || typeof raw !== "object") return undefined;

  const candidateCommand =
    typeof raw.command === "string" && raw.command.trim().length > 0
      ? raw.command
      : typeof raw.cmd === "string" && raw.cmd.trim().length > 0
        ? raw.cmd
        : undefined;

  const exitCodeValue =
    typeof raw.exit_code === "number" && Number.isFinite(raw.exit_code)
      ? raw.exit_code
      : typeof raw.exitCode === "number" && Number.isFinite(raw.exitCode)
        ? raw.exitCode
        : undefined;

  if (!candidateCommand || exitCodeValue === undefined) {
    return undefined;
  }

  const timestamp =
    parseTimestamp(raw.timestamp) ??
    parseTimestamp(raw.time) ??
    parseTimestamp(raw.ts) ??
    new Date().toISOString();

  const normalized = {
    command: candidateCommand,
    exitCode: exitCodeValue,
    success: exitCodeValue === 0,
    timestamp,
    ms: new Date(timestamp).getTime(),
    source: sourceLabel,
    raw
  };

  return normalized;
}

async function readJsonLines(filePath, limit = 500) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const sliceStart = Math.max(0, lines.length - limit);
    return lines.slice(sliceStart).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return undefined;
      }
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function loadActionEntries(limit = 500) {
  const entries = [];
  const seen = new Set();

  for (const source of ACTION_LOG_SOURCES) {
    const rawLines = await readJsonLines(source.path, limit);

    for (const raw of rawLines) {
      if (!raw) continue;
      const normalized = normalizeActionEntry(raw, source.label);
      if (!normalized) continue;

      const key = `${normalized.timestamp}|${normalized.command}|${normalized.source}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(normalized);
    }
  }

  return entries.sort((a, b) => b.ms - a.ms);
}

export function detectEvidence(entries, { latestPerCriterion = true } = {}) {
  const matches = [];

  for (const entry of entries) {
    for (const rule of DETECTION_RULES) {
      if (rule.matches(entry)) {
        matches.push({
          gate: rule.gate,
          criterion: rule.criterion,
          command: entry.command,
          timestamp: entry.timestamp,
          source: entry.source,
          exitCode: entry.exitCode
        });
      }
    }
  }

  if (!latestPerCriterion) {
    return matches;
  }

  const latest = new Map();

  for (const match of matches) {
    const key = `${match.gate}|${match.criterion}`;
    const existing = latest.get(key);
    if (!existing) {
      latest.set(key, match);
      continue;
    }

    const existingTime = new Date(existing.timestamp).getTime();
    const candidateTime = new Date(match.timestamp).getTime();
    if (candidateTime >= existingTime) {
      latest.set(key, match);
    }
  }

  return Array.from(latest.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function detectEvidenceForEntry(entry) {
  if (!entry) return [];
  return detectEvidence([entry], { latestPerCriterion: false });
}

async function runCli() {
  const jsonOutput = process.argv.includes("--json");
  const limitArgIndex = process.argv.findIndex(arg => arg === "--limit");
  const limit = limitArgIndex !== -1 ? Number.parseInt(process.argv[limitArgIndex + 1] ?? "", 10) : undefined;

  const entries = await loadActionEntries(Number.isFinite(limit) ? limit : undefined);
  const evidence = detectEvidence(entries);

  if (jsonOutput) {
    console.log(JSON.stringify({ evidence }, null, 2));
    return;
  }

  console.log("🔍 Evidence Detection Report\n");

  if (evidence.length === 0) {
    console.log("No qualifying evidence found in recent action logs.");
    return;
  }

  for (const item of evidence) {
    console.log(`• ${item.gate} — ${item.criterion}`);
    console.log(`  Command: ${item.command}`);
    console.log(`  Timestamp: ${item.timestamp}`);
    console.log(`  Source: ${item.source}`);
    console.log("");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch(error => {
    console.error("Failed to detect evidence:", error);
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
    process.exit(1);
  });
}
