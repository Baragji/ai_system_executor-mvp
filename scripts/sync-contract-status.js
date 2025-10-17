#!/usr/bin/env node
/**
 * Phase 19 – Contract Sync & Evidence Regeneration (Phase 2B)
 *
 * Regenerates ephemeral evidence (CycloneDX, SLSA provenance) and updates
 * Phase 19 contract task statuses to reflect the live repository state.
 *
 * Usage:
 *   node scripts/sync-contract-status.js [phaseId] [--root <dir>] [--silent]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_PHASE = "19";
const MIN_CYCLONEDX_BYTES = 1_000_000;
const MAX_VALIDATION_OUTPUT = 4_000;
const ANSI_ESCAPE = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(`${ANSI_ESCAPE}\\[[0-9;]*m`, "g");

function parseArgs(argv) {
  let phaseId = DEFAULT_PHASE;
  let rootDir = process.cwd();
  let silent = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === "--root") {
      const next = argv[i + 1];
      if (!next) {
        throw new Error("--root requires a directory argument");
      }
      rootDir = path.resolve(next);
      i += 1;
    } else if (arg === "--silent") {
      silent = true;
    } else if (!arg.startsWith("--") && phaseId === DEFAULT_PHASE) {
      phaseId = arg;
    }
  }
  return { phaseId, rootDir, silent };
}

function contractFilePath(rootDir, phaseId) {
  const contractsDir = path.join(rootDir, "contracts", "Roadmap_execution");
  return path.join(contractsDir, `${phaseId}_phase${phaseId}_autonomous_transition_contract.json`);
}

function runCommand(cmd, cwd) {
  execSync(cmd, {
    cwd,
    stdio: "ignore",
    env: process.env,
  });
}

function normalizeOutput(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return String(value);
}

function stripAnsi(value) {
  return normalizeOutput(value).replace(ANSI_PATTERN, "");
}

function truncateOutput(value) {
  const cleaned = stripAnsi(value).replace(/\r\n/g, "\n");
  if (cleaned.length <= MAX_VALIDATION_OUTPUT) {
    return cleaned.trimEnd();
  }
  return `${cleaned.slice(0, MAX_VALIDATION_OUTPUT)}…`;
}

function mergePreviousResults(results, previousResults = []) {
  if (!Array.isArray(previousResults) || previousResults.length === 0) {
    return results;
  }

  return results.map((result) => {
    const prior = previousResults.find((entry) => entry?.cmd === result.cmd);
    if (
      prior &&
      prior.exit_code === result.exit_code &&
      prior.ok === result.ok &&
      (prior.stdout ?? "") === (result.stdout ?? "") &&
      (prior.stderr ?? "") === (result.stderr ?? "")
    ) {
      return { ...result, executed_at: prior.executed_at ?? result.executed_at };
    }
    return result;
  });
}

async function ensureCycloneDx(rootDir) {
  const sbomPath = path.join(rootDir, "sbom.cdx.json");

  async function hasValidSbom() {
    try {
      const stat = await fs.stat(sbomPath);
      return stat.size > MIN_CYCLONEDX_BYTES;
    } catch {
      return false;
    }
  }

  if (!(await hasValidSbom())) {
    runCommand("npm run sbom:cyclonedx", rootDir);
    if (!(await hasValidSbom())) {
      return false;
    }
  }

  const evidenceDir = path.join(rootDir, ".automation", "evidence", "G2");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.copyFile(sbomPath, path.join(evidenceDir, "sbom.cdx.json"));
  return true;
}

async function ensureProvenance(rootDir) {
  const provenancePath = path.join(rootDir, "provenance.intoto.jsonl");

  async function hasValidProvenance() {
    try {
      const content = await fs.readFile(provenancePath, "utf8");
      return content.includes("slsa.dev/provenance");
    } catch {
      return false;
    }
  }

  if (!(await hasValidProvenance())) {
    runCommand("npm run provenance", rootDir);
    if (!(await hasValidProvenance())) {
      return false;
    }
  }

  const evidenceDir = path.join(rootDir, ".automation", "evidence", "G2");
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.copyFile(provenancePath, path.join(evidenceDir, "provenance.intoto.jsonl"));
  return true;
}

async function checkFileContains(rootDir, relativePath, needles) {
  try {
    const file = await fs.readFile(path.join(rootDir, relativePath), "utf8");
    return needles.every((needle) => file.includes(needle));
  } catch {
    return false;
  }
}

async function runTaskValidations(task, rootDir, previousResults = []) {
  if (!Array.isArray(task.validation) || task.validation.length === 0) {
    return { ok: true, results: [] };
  }

  const results = [];
  let allOk = true;

  for (const entry of task.validation) {
    if (!entry || typeof entry.cmd !== "string" || entry.cmd.length === 0) {
      continue;
    }

    const expected = typeof entry.expect_exit_code === "number" ? entry.expect_exit_code : 0;
    const executedAt = new Date().toISOString();

    try {
      const stdout = execSync(entry.cmd, {
        cwd: rootDir,
        stdio: "pipe",
        env: process.env,
        encoding: "utf8",
      });
      const ok = expected === 0;
      results.push({
        cmd: entry.cmd,
        exit_code: 0,
        ok,
        executed_at: executedAt,
        stdout: truncateOutput(stdout),
        stderr: "",
      });
      if (!ok) {
        allOk = false;
        break;
      }
    } catch (error) {
      const exitCode = typeof error?.status === "number" ? error.status : 1;
      const stdout = truncateOutput(error?.stdout);
      const stderr = truncateOutput(error?.stderr ?? error?.message ?? "");
      const ok = exitCode === expected;
      results.push({
        cmd: entry.cmd,
        exit_code: exitCode,
        ok,
        executed_at: executedAt,
        stdout,
        stderr,
      });
      if (!ok) {
        allOk = false;
        break;
      }
    }
  }

  const merged = mergePreviousResults(results, previousResults);
  return { ok: allOk, results: merged };
}

function createSummaryResult(cmd, ok, message, executedAt) {
  return {
    cmd,
    exit_code: ok ? 0 : 1,
    ok,
    executed_at: executedAt,
    stdout: truncateOutput(message),
    stderr: "",
  };
}

async function checkTests(rootDir) {
  try {
    const output = execSync("npm test", {
      cwd: rootDir,
      stdio: "pipe",
      env: process.env,
      encoding: "utf8",
    });
    const match = output.match(/Tests\s+(\d+)\s+passed/i);
    if (!match) return false;
    const passed = Number.parseInt(match[1] ?? "0", 10);
    return Number.isFinite(passed) && passed >= 350;
  } catch {
    return false;
  }
}

async function countEvidenceFiles(rootDir) {
  try {
    const dir = path.join(rootDir, ".automation", "evidence", "G2");
    const entries = await fs.readdir(dir);
    return entries.length;
  } catch {
    return 0;
  }
}

async function ledgerHasGate(rootDir) {
  try {
    const ledger = await fs.readFile(path.join(rootDir, ".automation", "GATES_LEDGER.md"), "utf8");
    const blocks = ledger.split(/\n---\n/g);
    for (const block of blocks) {
      if (!/Gate\s+G2/i.test(block)) continue;
      const statusLine = block.match(/\*\*Status:\*\*\s*([^\n]+)/i);
      if (!statusLine) continue;
      const statusText = statusLine[1]?.toUpperCase() ?? "";
      if (statusText.includes("PASSED") || statusText.includes("✅")) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function validateTask(task, context) {
  const now = context.now ?? new Date().toISOString();
  const rootDir = context.rootDir;
  const isDocTask = /^T0-DOC-/i.test(task.id);
  if (isDocTask) {
    const previousValidationResults = Array.isArray(task.validation_results) ? task.validation_results : [];
    const { ok, results } = await runTaskValidations(task, rootDir, previousValidationResults);
    return ok
      ? { status: "complete", completed_at: now, validation_results: results }
      : { status: "pending", validation_results: results };
  }

  switch (task.id) {
    case "T0-IMPL-1": {
      const ok = await ensureCycloneDx(rootDir);
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "ensureCycloneDx",
        ok,
        ok ? "sbom.cdx.json present (>1MB) and copied to evidence." : "sbom.cdx.json missing or below size threshold.",
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "blocked", validation_results: [summary] };
    }
    case "T0-IMPL-2": {
      const ok = await ensureProvenance(rootDir);
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "ensureProvenance",
        ok,
        ok ? "provenance.intoto.jsonl contains slsa.dev/provenance and was copied to evidence." : "provenance.intoto.jsonl missing or invalid.",
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "blocked", validation_results: [summary] };
    }
    case "T0-IMPL-3": {
      const ok = await checkFileContains(rootDir, "src/telemetry/events.ts", ["ACTION_LOG_JSONL"]);
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "check ACTION_LOG_JSONL flag",
        ok,
        ok ? "src/telemetry/events.ts references ACTION_LOG_JSONL flag." : "ACTION_LOG_JSONL flag missing from events telemetry.",
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "pending", validation_results: [summary] };
    }
    case "T0-IMPL-4": {
      const ok = await checkFileContains(rootDir, "src/telemetry/otel.ts", ["NodeSDK"]);
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "check OpenTelemetry NodeSDK",
        ok,
        ok ? "src/telemetry/otel.ts initializes NodeSDK." : "NodeSDK initialization missing from telemetry setup.",
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "pending", validation_results: [summary] };
    }
    case "T0-IMPL-5": {
      const ok = await checkFileContains(rootDir, "src/middleware/problemDetails.ts", ["occurred_at", "getHttpReasonPhrase", "toValidationProblem"]);
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "check problem details helpers",
        ok,
        ok ? "problemDetails.ts includes occurred_at, getHttpReasonPhrase, and toValidationProblem." : "problemDetails.ts missing required RFC 9457 helpers.",
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "pending", validation_results: [summary] };
    }
    case "T0-TEST-1": {
      const ok = await checkTests(rootDir);
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "npm test",
        ok,
        ok ? "npm test run meets minimum passing threshold (>=350 tests)." : "npm test run did not meet expected passing threshold.",
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "blocked", validation_results: [summary] };
    }
    case "T0-EVID-1": {
      const count = await countEvidenceFiles(rootDir);
      const ok = count >= 5;
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "count evidence artifacts",
        ok,
        ok ? `Located ${count} evidence artifact(s) in .automation/evidence/G2.` : `Only ${count} evidence artifact(s) present in .automation/evidence/G2.`,
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "blocked", validation_results: [summary] };
    }
    case "T0-GATE-1": {
      const ok = await ledgerHasGate(rootDir);
      const summary = createSummaryResult(
        task.validation?.[0]?.cmd ?? "check Gate G2 ledger entry",
        ok,
        ok ? "Gate G2 marked as passed in .automation/GATES_LEDGER.md." : "Gate G2 not marked as passed in .automation/GATES_LEDGER.md.",
        now,
      );
      if (ok) {
        return { status: "complete", completed_at: now, validation_results: [summary] };
      }
      return { status: "pending", validation_results: [summary] };
    }
    default:
      return { status: task.status ?? "pending" };
  }
}

function log(message, silent) {
  if (!silent) {
    process.stdout.write(`${message}\n`);
  }
}

export async function syncContract(options = {}) {
  const { phaseId = DEFAULT_PHASE, rootDir = process.cwd(), silent = false } = options;
  const filePath = contractFilePath(rootDir, phaseId);
  const raw = await fs.readFile(filePath, "utf8");
  const contract = JSON.parse(raw);
  const now = new Date().toISOString();
  let updated = 0;
  let validationUpdates = 0;

  log(`Syncing contract ${path.relative(rootDir, filePath)} (${phaseId})...`, silent);

  if (!Array.isArray(contract.tasks)) {
    log("  ⚠️  No tasks found in contract", silent);
    return { updated: 0, filePath };
  }

  for (const task of contract.tasks) {
    const result = await validateTask(task, { rootDir, now });
    if (!result || typeof result.status !== "string") continue;

    const nextStatus = result.status;
    const prevStatus = task.status ?? "pending";

    if (Array.isArray(result.validation_results)) {
      const previousResults = Array.isArray(task.validation_results) ? task.validation_results : [];
      const prevJson = JSON.stringify(previousResults);
      const nextJson = JSON.stringify(result.validation_results);
      if (prevJson !== nextJson) {
        task.validation_results = result.validation_results;
        validationUpdates += 1;
        log(`  📝 ${task.id}: refreshed validation evidence`, silent);
      }
    }

    if (nextStatus !== prevStatus) {
      task.status = nextStatus;
      if (nextStatus === "complete") {
        task.completed_at = result.completed_at ?? now;
      }
      updated += 1;
      log(`  ✅ ${task.id}: ${prevStatus} → ${nextStatus}`, silent);
    } else if (nextStatus === "complete" && !task.completed_at && result.completed_at) {
      task.completed_at = result.completed_at;
      log(`  🕒 ${task.id}: added completion timestamp`, silent);
      updated += 1;
    }
  }

  if (updated > 0 || validationUpdates > 0) {
    const summaryParts = [];
    if (updated > 0) {
      summaryParts.push(`${updated} task status${updated === 1 ? "" : "es"}`);
    }
    if (validationUpdates > 0) {
      summaryParts.push(`${validationUpdates} validation evidence set${validationUpdates === 1 ? "" : "s"}`);
    }
    const updatedJson = `${JSON.stringify(contract, null, 2)}\n`;
    await fs.writeFile(filePath, updatedJson, "utf8");
    log(`\n✅ Updated ${summaryParts.join(" + ")}`, silent);
  } else {
    log("\n✅ Contract already in sync", silent);
  }

  return { updated, filePath };
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    await syncContract(args);
  } catch (error) {
    console.error("[state:sync] ERROR", error);
    process.exitCode = 1;
  }
}

const directInvocation = (() => {
  try {
    const invoked = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
    return invoked === import.meta.url;
  } catch {
    return false;
  }
})();

if (directInvocation) {
  await main();
}
