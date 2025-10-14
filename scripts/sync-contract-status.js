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

async function ensureCycloneDx(rootDir) {
  runCommand("npm run sbom:cyclonedx", rootDir);
  const sbomPath = path.join(rootDir, "sbom.cdx.json");
  try {
    const stat = await fs.stat(sbomPath);
    if (stat.size <= MIN_CYCLONEDX_BYTES) return false;
    const evidenceDir = path.join(rootDir, ".automation", "evidence", "G2");
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.copyFile(sbomPath, path.join(evidenceDir, "sbom.cdx.json"));
    return true;
  } catch {
    return false;
  }
}

async function ensureProvenance(rootDir) {
  runCommand("npm run provenance", rootDir);
  try {
    const provenancePath = path.join(rootDir, "provenance.intoto.jsonl");
    const content = await fs.readFile(provenancePath, "utf8");
    if (!content.includes("slsa.dev/provenance")) return false;
    const evidenceDir = path.join(rootDir, ".automation", "evidence", "G2");
    await fs.mkdir(evidenceDir, { recursive: true });
    await fs.copyFile(provenancePath, path.join(evidenceDir, "provenance.intoto.jsonl"));
    return true;
  } catch {
    return false;
  }
}

async function checkFileContains(rootDir, relativePath, needles) {
  try {
    const file = await fs.readFile(path.join(rootDir, relativePath), "utf8");
    return needles.every((needle) => file.includes(needle));
  } catch {
    return false;
  }
}

async function runTaskValidations(task, rootDir) {
  if (!Array.isArray(task.validation) || task.validation.length === 0) {
    return true;
  }
  try {
    for (const entry of task.validation) {
      if (!entry || typeof entry.cmd !== "string" || entry.cmd.length === 0) continue;
      runCommand(entry.cmd, rootDir);
    }
    return true;
  } catch {
    return false;
  }
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

  switch (task.id) {
    case "T0-DOC-1":
    case "T0-DOC-2":
    case "T0-DOC-3":
    case "T0-DOC-4": {
      const ok = await runTaskValidations(task, rootDir);
      return ok ? { status: "complete", completed_at: now } : { status: "pending" };
    }
    case "T0-IMPL-1": {
      const ok = await ensureCycloneDx(rootDir);
      return ok ? { status: "complete", completed_at: now } : { status: "blocked" };
    }
    case "T0-IMPL-2": {
      const ok = await ensureProvenance(rootDir);
      return ok ? { status: "complete", completed_at: now } : { status: "blocked" };
    }
    case "T0-IMPL-3": {
      const ok = await checkFileContains(rootDir, "src/telemetry/events.ts", ["ACTION_LOG_JSONL"]);
      return ok ? { status: "complete", completed_at: now } : { status: "pending" };
    }
    case "T0-IMPL-4": {
      const ok = await checkFileContains(rootDir, "src/telemetry/otel.ts", ["NodeSDK"]);
      return ok ? { status: "complete", completed_at: now } : { status: "pending" };
    }
    case "T0-IMPL-5": {
      const ok = await checkFileContains(rootDir, "src/middleware/problemDetails.ts", ["occurred_at", "getHttpReasonPhrase", "toValidationProblem"]);
      return ok ? { status: "complete", completed_at: now } : { status: "pending" };
    }
    case "T0-TEST-1": {
      const ok = await checkTests(rootDir);
      return ok ? { status: "complete", completed_at: now } : { status: "blocked" };
    }
    case "T0-EVID-1": {
      const count = await countEvidenceFiles(rootDir);
      return count >= 5 ? { status: "complete", completed_at: now } : { status: "blocked" };
    }
    case "T0-GATE-1": {
      const ok = await ledgerHasGate(rootDir);
      return ok ? { status: "complete", completed_at: now } : { status: "pending" };
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

  if (updated > 0) {
    const updatedJson = `${JSON.stringify(contract, null, 2)}\n`;
    await fs.writeFile(filePath, updatedJson, "utf8");
    log(`\n✅ Updated ${updated} task(s)`, silent);
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
