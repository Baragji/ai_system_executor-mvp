#!/usr/bin/env node
/**
 * Phase 5.1 — Evidence Detection (Read-Only)
 *
 * Scans workflow action logs to detect validation evidence that can later be
 * used to auto-update gate status. This script intentionally performs no
 * writes; it only reports what evidence exists.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { tryRequireCriterionText } from "../workflow/lib/gateCriteria.js";

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

const SUCCESS_STATUSES = new Set(["pass", "passed", "success", "completed"]);

// Canonical criteria from .automation/GATES_LEDGER.md via gateCriteria
const CRITERIA = {
  sbom: tryRequireCriterionText({ gateId: "G2", includes: ["npm run sbom:cyclonedx"] }),
  provenance: tryRequireCriterionText({ gateId: "G2", includes: ["npm run provenance"] }),
  langgraph: tryRequireCriterionText({ gateId: "G3", includes: ["/api/execute", "LangGraph integration"] })
};

// Build detection rules only from non-null canonical criteria
const DETECTION_RULES = [];

// G2: SBOM (only if canonical criterion exists)
if (CRITERIA.sbom) {
  DETECTION_RULES.push({
    gate: "G2",
    criterion: CRITERIA.sbom,
    matches: entry =>
      entry.success &&
      commandContainsAny(entry.command, [["npm run sbom"], ["npm run sbom:cyclonedx"], ["scripts/generate-cyclonedx.js"]])
  });
}

// G2: Provenance (only if canonical criterion exists)
if (CRITERIA.provenance) {
  DETECTION_RULES.push({
    gate: "G2",
    criterion: CRITERIA.provenance,
    matches: entry =>
      entry.success &&
      commandContainsAny(entry.command, [["npm run provenance"], ["scripts/generate-provenance.js"]])
  });
}

// G3: LangGraph parity tests (only if canonical criterion exists)
if (CRITERIA.langgraph) {
  DETECTION_RULES.push({
    gate: "G3",
    criterion: CRITERIA.langgraph,
    matches: entry =>
      entry.success &&
      commandContainsAll(entry.command, [
        "AGENTS_RUNTIME=langgraph",
        "npm test",
        "tests/api/executions.test.ts"
      ])
  });
}

// Log warning for any missing canonical criteria (one-time)
if (!CRITERIA.sbom) {
  console.warn("Warning: G2 SBOM criterion not found in ledger; skipping detection rule");
}
if (!CRITERIA.provenance) {
  console.warn("Warning: G2 Provenance criterion not found in ledger; skipping detection rule");
}
if (!CRITERIA.langgraph) {
  console.warn("Warning: G3 LangGraph criterion not found in ledger; skipping detection rule");
}

function normalizeCommand(command) {
  return command.replace(/\s+/g, " ").trim();
}

function commandContainsAll(command, fragments) {
  if (!command) return false;
  const normalized = normalizeCommand(command);
  return fragments.every(fragment => normalized.includes(fragment));
}

function commandContainsAny(command, fragmentGroups) {
  if (!command) return false;
  const normalized = normalizeCommand(command);
  return fragmentGroups.some(group => group.every(fragment => normalized.includes(fragment)));
}

function parseTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
}

function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function normalizeActionEntry(raw, sourceLabel = "unknown") {
  if (!raw || typeof raw !== "object") return undefined;

  const commandCandidate =
    typeof raw.command === "string" && raw.command.trim().length > 0
      ? raw.command
      : typeof raw.cmd === "string" && raw.cmd.trim().length > 0
        ? raw.cmd
        : undefined;

  const exitCodeCandidate =
    toFiniteNumber(raw.exit_code) ??
    toFiniteNumber(raw.exitCode) ??
    undefined;

  const status = typeof raw.status === "string" ? raw.status.trim().toLowerCase() : undefined;
  const timestamp =
    parseTimestamp(raw.timestamp) ??
    parseTimestamp(raw.ts) ??
    parseTimestamp(raw.time);

  if (!commandCandidate) {
    return undefined;
  }

  const success = exitCodeCandidate !== undefined
    ? exitCodeCandidate === 0
    : status
      ? SUCCESS_STATUSES.has(status)
      : false;

  const normalizedTimestamp = timestamp ?? new Date().toISOString();
  const ms = new Date(normalizedTimestamp).getTime();

  return {
    command: normalizeCommand(commandCandidate),
    exitCode: exitCodeCandidate,
    status,
    success,
    timestamp: normalizedTimestamp,
    ms: Number.isFinite(ms) ? ms : Date.now(),
    source: sourceLabel,
    raw
  };
}

export async function readJsonLines(filePath, limit = 500) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const slice = Number.isFinite(limit) && limit > 0 ? lines.slice(-limit) : lines;
    const entries = [];
    const warnings = [];

    slice.forEach((line, index) => {
      try {
        entries.push(JSON.parse(line));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        warnings.push(`Line ${lines.length - slice.length + index + 1} is not valid JSON: ${message}`);
      }
    });

    return { entries, warnings, missing: false };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { entries: [], warnings: [], missing: true };
    }
    throw error;
  }
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

// Removed buildEvidence, detectTrustSpineArtifacts, and selectLatestTimestamp
// SBOM and Provenance now handled as separate criteria via DETECTION_RULES

export function detectEvidence(entries, { latestPerCriterion = true } = {}) {
  const matches = [];

  for (const entry of entries) {
    if (!entry) continue;
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

  // G3 Aggregation: Detect when /api/execute and executions parity test run in separate entries
  if (CRITERIA.langgraph) {
    const apiExecuteEntries = entries.filter(entry =>
      entry?.success &&
      entry.command &&
      commandContainsAll(entry.command, ["/api/execute"]) &&
      (commandContainsAll(entry.command, ["curl"]) || commandContainsAll(entry.command, ["POST"]))
    );

    const parityTestEntries = entries.filter(entry =>
      entry?.success &&
      entry.command &&
      commandContainsAll(entry.command, ["npm test", "tests/api/executions.test.ts"])
    );

    // If both exist (even as separate entries), emit aggregated G3 evidence
    if (apiExecuteEntries.length > 0 && parityTestEntries.length > 0) {
      // Get the latest entries for each signal
      const latestApiExecute = apiExecuteEntries
        .slice()
        .sort((a, b) => compareTimestamps(a.timestamp, b.timestamp))
        .at(-1);
      const latestParityTest = parityTestEntries
        .slice()
        .sort((a, b) => compareTimestamps(a.timestamp, b.timestamp))
        .at(-1);

      // Use the later of the two timestamps
      const timestamp = [latestApiExecute?.timestamp, latestParityTest?.timestamp]
        .filter(Boolean)
        .sort((a, b) => compareTimestamps(a, b))
        .at(-1);

      matches.push({
        gate: "G3",
        criterion: CRITERIA.langgraph,
        command: latestApiExecute?.command ?? undefined, // Prefer real /api/execute curl; undefined => fallback
        timestamp,
        source: "aggregated",
        exitCode: 0
      });
    }
  }

  if (!latestPerCriterion) {
    return matches;
  }

  const latest = new Map();

  for (const match of matches) {
    const key = `${match.gate}|${match.criterion}`;
    const current = latest.get(key);
    if (!current || isNewer(match.timestamp, current.timestamp)) {
      latest.set(key, match);
    }
  }

  return Array.from(latest.values()).sort((a, b) => compareTimestamps(b.timestamp, a.timestamp));
}

export function detectEvidenceForEntry(entry) {
  if (!entry) return [];
  return detectEvidence([entry], { latestPerCriterion: false });
}

/**
 * Context-aware evidence detection for a single entry with recent history.
 * Loads recent action log entries to enable aggregation across separate commands.
 * @param {object} entry - The primary entry to detect evidence for
 * @param {object} options - Options
 * @param {number} options.recentLimit - Number of recent entries to load for context (default: 50)
 * @returns {Promise<Array>} Evidence matches
 */
export async function detectEvidenceForEntryWithContext(entry, { recentLimit = 50 } = {}) {
  if (!entry) return [];
  const recent = await loadActionEntries(recentLimit);
  // Use detectEvidence over the union of current entry + recent context
  return detectEvidence([entry, ...recent], { latestPerCriterion: true });
}

export async function loadActionEntries(limit = 500) {
  const entries = [];
  const seen = new Set();

  for (const source of ACTION_LOG_SOURCES) {
    const result = await readJsonLines(source.path, limit);
    if (result.entries.length === 0) {
      continue;
    }

    for (const raw of result.entries) {
      const normalized = normalizeActionEntry(raw, source.label);
      if (!normalized) continue;
      const key = `${normalized.timestamp}|${normalized.command}|${source.label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(normalized);
    }
  }

  return entries.sort((a, b) => b.ms - a.ms);
}

function parseCliArgs(argv) {
  const options = {
    json: false,
    limit: 500,
    file: undefined
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json" || arg === "-j") {
      options.json = true;
    } else if (arg === "--limit" && argv[i + 1]) {
      const parsed = Number.parseInt(argv[++i], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
    } else if (arg === "--file" && argv[i + 1]) {
      options.file = path.resolve(argv[++i]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Phase 5.1 Evidence Detector\n\nUsage:\n  npm run evidence:detect             # Human-readable output\n  npm run evidence:detect -- --json    # JSON output\n  npm run evidence:detect -- --limit 50# Limit parsed entries\n  npm run evidence:detect -- --file ./path/to/log.jsonl\n`);
}

async function gatherEntries(options) {
  if (options.file) {
    const result = await readJsonLines(options.file, options.limit);
    const entries = result.entries
      .map(entry => normalizeActionEntry(entry, options.file ?? "custom-log"))
      .filter(Boolean);
    return { entries, warnings: result.warnings, source: options.file, missing: result.missing };
  }

  const entries = await loadActionEntries(options.limit);
  return { entries, warnings: [], source: "auto", missing: entries.length === 0 };
}

async function runCli() {
  const options = parseCliArgs(process.argv.slice(2));
  const { entries, warnings, source, missing } = await gatherEntries(options);

  if (options.json) {
    const evidence = detectEvidence(entries);
    console.log(JSON.stringify({ source, evidence, warnings }, null, 2));
    return;
  }

  console.log("🔍 Evidence Detection Report\n");
  console.log(`Source: ${source}`);

  for (const warning of warnings) {
    console.warn(`⚠️  ${warning}`);
  }

  if (entries.length === 0) {
    const message = missing
      ? "No action logs found. Run workflow commands to generate telemetry."
      : "No entries available in the selected logs.";
    console.log(message);
    return;
  }

  const evidence = detectEvidence(entries);

  if (evidence.length === 0) {
    console.log("No qualifying evidence found in recent action logs.");
    return;
  }

  for (const item of evidence) {
    const when = item.timestamp ? ` @ ${item.timestamp}` : "";
    console.log(`• ${item.gate} — ${item.criterion}${when}`);
    if (item.command) {
      console.log(`  Command: ${item.command}`);
    }
    if (item.source) {
      console.log(`  Source: ${item.source}`);
    }
    console.log("");
  }
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  runCli().catch(error => {
    console.error("Failed to detect evidence:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
