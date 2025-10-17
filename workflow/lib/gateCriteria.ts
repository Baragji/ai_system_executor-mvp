import fs from "node:fs";
import path from "node:path";

export interface GateCriterion {
  gateId: string;
  text: string;
  status: string;
  lineNumber: number;
}

export type GateCriteriaIndex = Record<string, GateCriterion[]>;

export const LEDGER_PATH = path.resolve(".automation/GATES_LEDGER.md");

interface LoadOptions {
  ledgerPath?: string;
  force?: boolean;
}

interface CriterionSearchOptions {
  gateId: string;
  includes: string[];
  ledgerPath?: string;
}

interface GateCriteriaCache {
  ledgerPath: string;
  mtimeMs: number;
  index: GateCriteriaIndex;
}

let cache: GateCriteriaCache | null = null;

function readLedger(pathToLedger: string): { content: string; mtimeMs: number } {
  const resolved = path.resolve(pathToLedger);
  const stat = fs.statSync(resolved);
  const content = fs.readFileSync(resolved, "utf-8");
  return { content, mtimeMs: stat.mtimeMs };
}

export function parseGateCriteria(content: string): GateCriteriaIndex {
  const lines = content.split(/\r?\n/);
  const index: GateCriteriaIndex = {};

  let currentGate: string | null = null;
  let inAcceptance = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const gateMatch = line.match(/^##\s+Gate\s+(G\d+)\b/);
    if (gateMatch) {
      currentGate = gateMatch[1];
      if (!index[currentGate]) {
        index[currentGate] = [];
      }
      inAcceptance = false;
      continue;
    }

    if (!currentGate) {
      continue;
    }

    const headingMatch = line.match(/^###\s+(.+)/);
    if (headingMatch) {
      inAcceptance = headingMatch[1].trim().toLowerCase() === "acceptance criteria";
      continue;
    }

    if (!inAcceptance) {
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed.startsWith("-")) {
      continue;
    }

    const bulletMatch = trimmed.match(/^-+\s*(✅|🟡|⏳|❌|☑️|⚪️|🔲|▪️|✳️|⬜️|➡️)?\s*(.*)$/u);
    if (!bulletMatch) {
      continue;
    }

    const status = bulletMatch[1] ?? "";
    const text = bulletMatch[2].trim();
    if (!text) {
      continue;
    }

    index[currentGate].push({
      gateId: currentGate,
      text,
      status,
      lineNumber: i + 1
    });
  }

  return index;
}

export function loadGateCriteria(options: LoadOptions = {}): GateCriteriaIndex {
  const { ledgerPath = LEDGER_PATH, force = false } = options;
  const resolved = path.resolve(ledgerPath);

  if (!force && cache && cache.ledgerPath === resolved) {
    try {
      const stat = fs.statSync(resolved);
      if (stat.mtimeMs === cache.mtimeMs) {
        return cache.index;
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }
    }
  }

  const { content, mtimeMs } = readLedger(resolved);
  const index = parseGateCriteria(content);
  cache = { ledgerPath: resolved, mtimeMs, index };
  return index;
}

export function refreshGateCriteria(options: LoadOptions = {}): GateCriteriaIndex {
  cache = null;
  return loadGateCriteria({ ...options, force: true });
}

export function findCriterion(options: CriterionSearchOptions): GateCriterion | undefined {
  const { gateId, includes, ledgerPath } = options;
  if (!gateId) {
    throw new Error("gateId is required to find a criterion");
  }
  if (!Array.isArray(includes) || includes.length === 0) {
    throw new Error("includes must be a non-empty array");
  }

  const criteria = loadGateCriteria({ ledgerPath })[gateId];
  if (!criteria) {
    return undefined;
  }

  return criteria.find(entry => includes.every(token => entry.text.includes(token)));
}

export function requireCriterion(options: CriterionSearchOptions): GateCriterion {
  const found = findCriterion(options);
  if (!found) {
    const needles = options.includes.map(token => `"${token}"`).join(", ");
    throw new Error(`Criterion not found for ${options.gateId}: expected text containing ${needles}`);
  }
  return found;
}

export function requireCriterionText(options: CriterionSearchOptions): string {
  return requireCriterion(options).text;
}

export function tryRequireCriterionText(
  options: CriterionSearchOptions,
  onMissing?: (error: Error) => void
): string | null {
  try {
    return requireCriterionText(options);
  } catch (error) {
    if (error instanceof Error) {
      onMissing?.(error);
    }
    return null;
  }
}
