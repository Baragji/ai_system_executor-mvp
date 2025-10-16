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

const DETECTION_RULES = [
  {
    gate: "G0",
    criterion: "Lint passing",
    matches: entry =>
      entry.success &&
      commandContainsAny(entry.command, [["npm run lint"], ["eslint"]])
  },
  {
    gate: "G0",
    criterion: "TypeScript typecheck passing",
    matches: entry =>
      entry.success &&
      commandContainsAny(entry.command, [["npm run typecheck"], ["tsc -p"]])
  },
  {
    gate: "G0",
    criterion: "Test suite passing",
    matches: entry =>
      entry.success &&
      commandContainsAny(entry.command, [["npm test"], ["vitest run"], ["node scripts/run-vitest-with-rollup-shim.mjs"]]) &&
      !commandContainsAll(entry.command, ["tests/api/"])
  },
  {
    gate: "G1",
    criterion: "Contracts validated",
    matches: entry =>
      entry.success &&
      commandContainsAny(entry.command, [["npm run contract:check"], ["scripts/validate-contract.js"]])
  },
  {
    gate: "G2",
    criterion: "Trust Spine artifacts generated (SBOM + provenance)",
    matches: entry =>
      entry.success &&
      (commandContainsAll(entry.command, ["npm run sbom", "npm run provenance"]) ||
        commandContainsAll(entry.command, ["npm run sbom:all"]) ||
        commandContainsAll(entry.command, ["scripts/generate-provenance.js", "scripts/generate-cyclonedx.js"]))
  },
  {
    gate: "G3",
    criterion: "LangGraph parity tests passing",
    matches: entry =>
      entry.success &&
      commandContainsAll(entry.command, [
        "AGENTS_RUNTIME=langgraph",
        "npm test",
        "tests/api/executions.test.ts"
      ])
  }
];

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

function buildEvidence(entry, gate, criterion, details = {}) {
  return {
    gate,
    criterion,
    timestamp: entry?.timestamp,
    command: entry?.command,
    source: entry?.source,
    details
  };
}

function detectTrustSpineArtifacts(entries) {
  const combined = entries.find(entry =>
    entry.success &&
    entry.command &&
    (commandContainsAll(entry.command, ["npm run sbom", "npm run provenance"]) ||
      commandContainsAll(entry.command, ["npm run sbom:all"]))
  );

  if (combined) {
    return buildEvidence(combined, "G2", "Trust Spine artifacts generated (SBOM + provenance)", {
      exitCode: combined.exitCode
    });
  }

  const sbomEntries = entries.filter(entry =>
    entry.success && entry.command && commandContainsAny(entry.command, [["npm run sbom"], ["npm run sbom:cyclonedx"]])
  );

  const provenanceEntries = entries.filter(entry =>
    entry.success && entry.command && commandContainsAny(entry.command, [["npm run provenance"], ["scripts/generate-provenance.js"]])
  );

  if (sbomEntries.length === 0 || provenanceEntries.length === 0) {
    return null;
  }

  const latestTimestamp = selectLatestTimestamp([
    ...sbomEntries.map(entry => entry.timestamp),
    ...provenanceEntries.map(entry => entry.timestamp)
  ]);

  const latestSbom = sbomEntries.sort((a, b) => compareTimestamps(a.timestamp, b.timestamp)).at(-1);
  const latestProvenance = provenanceEntries.sort((a, b) => compareTimestamps(a.timestamp, b.timestamp)).at(-1);

  return {
    gate: "G2",
    criterion: "Trust Spine artifacts generated (SBOM + provenance)",
    timestamp: latestTimestamp,
    command: latestProvenance?.command ?? latestSbom?.command,
    source: latestProvenance?.source ?? latestSbom?.source,
    details: {
      sbomCommand: latestSbom?.command,
      provenanceCommand: latestProvenance?.command,
      sbomExitCode: latestSbom?.exitCode,
      provenanceExitCode: latestProvenance?.exitCode
    }
  };
}

function selectLatestTimestamp(timestamps) {
  const valid = timestamps.filter(value => typeof value === "string");
  if (valid.length === 0) return undefined;
  return valid.sort().at(-1);
}

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

  const trustSpine = detectTrustSpineArtifacts(entries);
  if (trustSpine) {
    matches.push(trustSpine);
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
