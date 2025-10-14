import fs from "node:fs/promises";
import path from "node:path";

export type GateStatus = "passed" | "failed" | "partial" | "not_started" | "unknown";

export interface PhaseTask {
  id: string;
  title: string;
  status?: "pending" | "in_progress" | "complete" | "blocked";
  started_at?: string;
  completed_at?: string;
  validation_results?: Array<{
    cmd: string;
    exit_code: number;
    timestamp: string;
    notes?: string;
  }>;
}

export interface PhaseState {
  phaseId: string;
  phaseName: string;
  contractPath: string | null;
  ledgerPath: string | null;
  gates: Record<string, GateStatus>;
  tasks: PhaseTask[];
}

export interface ValidationSnapshot {
  last_run: string | null;
  lint: "pass" | "fail" | "skipped";
  typecheck: "pass" | "fail" | "skipped";
  test: "pass" | "fail" | "skipped";
  contract_check: "pass" | "fail" | "skipped";
}

export interface NextAction {
  action:
    | "COMMIT_PENDING_TESTS"
    | "COMMIT_PENDING_CHANGES"
    | "FIX_VALIDATION_ERRORS"
    | "ADVANCE_ORCHESTRATOR_PILOT"
    | "NO_ACTION";
  reasoning: string;
  command: string | null;
}

export function normalizeGateStatus(input?: string): GateStatus {
  const s = (input || "").toUpperCase();
  if (s.includes("PASSED") || s.includes("✅")) return "passed";
  if (s.includes("PARTIAL") || s.includes("🟡")) return "partial";
  if (s.includes("FAILED") || s.includes("❌")) return "failed";
  if (s.includes("NOT STARTED") || s.includes("⏳")) return "not_started";
  return "unknown";
}

export function parseGatesLedger(markdown: string): Record<string, GateStatus> {
  const summary: Record<string, GateStatus> = {};
  if (!markdown || !markdown.trim()) return summary;
  const blocks = markdown.split(/\n(?=##\s+Gate\s+)/);
  for (const block of blocks) {
    const gateMatch = block.match(/##\s+Gate\s+(G\d+)/i);
    if (!gateMatch || !gateMatch[1]) continue;
    const statusMatch = block.match(/\*\*Status:\*\*\s*([^\n]+)/i);
    const status = normalizeGateStatus(statusMatch ? statusMatch[1] : undefined);
    const gateId = gateMatch[1] as string;
    summary[gateId] = status;
  }
  return summary;
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    return null;
  }
}

export async function loadPhaseState(options: { rootDir?: string } = {}): Promise<PhaseState> {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const ledgerPath = path.join(rootDir, ".automation", "GATES_LEDGER.md");
  const ledgerText = await readIfExists(ledgerPath);
  const gates = parseGatesLedger(ledgerText ?? "");

  // Resolve contract path; if missing, keep null but continue
  const contractDir = path.join(rootDir, "contracts", "Roadmap_execution");
  let contractPath: string | null = null;
  try {
    const entries = await fs.readdir(contractDir).catch(() => []);
    const name = entries.find(f => /19_phase19_autonomous_transition_contract\.json$/.test(f));
    contractPath = name ? path.join(contractDir, name) : null;
  } catch {
    contractPath = null;
  }

  let phaseName = "Autonomous Transition";
  let tasks: PhaseTask[] = [];
  if (contractPath) {
    try {
      const raw = await fs.readFile(contractPath, "utf-8");
      const json = JSON.parse(raw) as { contract_meta?: { phase_name?: string }; tasks?: PhaseTask[] };
      phaseName = json.contract_meta?.phase_name || phaseName;
      if (Array.isArray((json as { tasks?: unknown }).tasks)) {
        tasks = (json.tasks as PhaseTask[]).map(t => ({
          id: String(t.id),
          title: String(t.title),
          status: t.status,
          started_at: t.started_at,
          completed_at: t.completed_at,
          validation_results: Array.isArray(t.validation_results)
            ? t.validation_results.map(result => ({
                cmd: String(result.cmd),
                exit_code: Number(result.exit_code),
                timestamp: String(result.timestamp),
                ...(result.notes ? { notes: String(result.notes) } : {})
              }))
            : undefined
        }));
      }
    } catch {
      // fall back to defaults
    }
  }

  return {
    phaseId: "19",
    phaseName,
    contractPath,
    ledgerPath,
    gates,
    tasks
  };
}

export function determineCurrentTask(state: PhaseState): PhaseTask | null {
  for (const t of state.tasks) {
    if (t.status !== "complete") return t;
  }
  return null;
}

export function determineNextTask(state: PhaseState): PhaseTask | null {
  const current = determineCurrentTask(state);
  if (!current) return null;
  const idx = state.tasks.findIndex(t => t.id === current.id);
  if (idx >= 0 && idx + 1 < state.tasks.length) {
    const candidate = state.tasks[idx + 1];
    return candidate ?? null;
  }
  return null;
}

export function canAdvanceToNextTask(state: PhaseState): boolean {
  // Simple rule: cannot advance while there is a non-complete current task
  return determineCurrentTask(state) === null;
}

export function suggestNextAction(
  state: PhaseState,
  options: { uncommittedChanges?: string[]; validations?: ValidationSnapshot }
): NextAction {
  const uncommitted = options.uncommittedChanges ?? [];
  const validations = options.validations;

  if (uncommitted.length > 0) {
    const containsTests = uncommitted.some(line => /\btests\//.test(line));
    return {
      action: containsTests ? "COMMIT_PENDING_TESTS" : "COMMIT_PENDING_CHANGES",
      reasoning: "Uncommitted changes detected. Commit to persist progress.",
      command: "git add -A && git commit -m 'chore: persist progress'"
    };
  }
  if (validations && [validations.lint, validations.typecheck, validations.test, validations.contract_check].some(v => v === "fail")) {
    return {
      action: "FIX_VALIDATION_ERRORS",
      reasoning: "One or more validations failing.",
      command: "npm run validate:all"
    };
  }
  const g2 = state.gates["G2"]; const g3 = state.gates["G3"];
  if (g2 === "passed" && (g3 === "partial" || g3 === "not_started" || !g3)) {
    return {
      action: "ADVANCE_ORCHESTRATOR_PILOT",
      reasoning: "Trust Spine (G2) passed; G3 is partial.",
      command: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts"
    };
  }
  return { action: "NO_ACTION", reasoning: "Repository is clean and validations are not flagged.", command: null };
}

export function formatHumanSummary(
  state: PhaseState,
  next: NextAction,
  options: { validations?: ValidationSnapshot; uncommittedChanges?: string[] }
): string {
  const gates = Object.entries(state.gates).map(([k, v]) => `${k}=${v}`).join(", ");
  const uncommitted = options.uncommittedChanges?.length ?? 0;
  const v = options.validations;
  const val = v ? `lint=${v.lint}, type=${v.typecheck}, test=${v.test}, contract=${v.contract_check}` : "not_run";
  return `Phase ${state.phaseId} — ${state.phaseName} | Gates: ${gates || "none"} | Validations: ${val} | Uncommitted: ${uncommitted} | Next: ${next.action}`;
}
