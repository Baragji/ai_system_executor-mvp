import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  updateGateMarkdown,
  isAutoUpdateEnabled,
  validateLedgerUpdate
} from "../../scripts/update-gate.js";
import { autoUpdateLedgerWithEvidence } from "../../scripts/gate-auto-update.js";

const SAMPLE_LEDGER = `## Gate G3: LangGraph Pilot\n\n**Status:** 🟡 PARTIAL\n**Completed:** 2025-10-10\n\n### Acceptance Criteria\n- ✅ Baseline infrastructure established\n- ⏳ LangGraph parity tests passing\n\n### Evidence\n- placeholder evidence\n\n### Next Steps\n- Continue pilot rollout`;

describe("update-gate script", () => {
  let baseLedger: string;

  beforeEach(() => {
    baseLedger = `## Gate G9: Sample Gate\n\n**Status:** 🟡 PARTIAL\n**Completed:** 2025-10-10\n\n### Acceptance Criteria\n- ✅ Initial milestone complete\n- ⏳ Implement automation hook\n- ⏳ Capture coverage report\n\n### Evidence\n- existing artifact\n\n### Next Steps\n- Do something else`;
  });

  it("marks the requested criterion as complete", () => {
    const { content, changes } = updateGateMarkdown(baseLedger, {
      gateId: "G9",
      criterion: "Implement automation hook",
      timestamp: "2025-10-15T00:00:00.000Z",
      command: "npm run lint",
      evidencePath: "./artifacts/lint.json"
    });

    expect(changes.criterionUpdated).toBe(true);
    expect(changes.alreadyComplete).toBe(false);
    expect(content).toContain("- ✅ Implement automation hook");
    expect(content).toContain("2025-10-15T00:00:00.000Z — Command: `npm run lint`; Artifact: `./artifacts/lint.json`");
    expect(changes.nextStatus).toBe("🟡 PARTIAL");
  });

  it("marks gate as passed when all criteria complete", () => {
    const partialLedger = baseLedger.replace("- ⏳ Capture coverage report", "- ✅ Capture coverage report");

    const { content, changes } = updateGateMarkdown(partialLedger, {
      gateId: "G9",
      criterion: "Implement automation hook",
      timestamp: "2025-10-16T00:00:00.000Z",
      command: "npm test"
    });

    expect(changes.statusUpdated).toBe(true);
    expect(changes.nextStatus).toBe("✅ PASSED");
    expect(content).toContain("**Status:** ✅ PASSED");
    expect(content).toContain("**Completed:** 2025-10-16");
  });

  it("does not duplicate evidence entries", () => {
    const ledgerWithEvidence = `${baseLedger}\n- 2025-10-15T00:00:00.000Z — Command: \`npm run lint\`; Artifact: \`./artifacts/lint.json\``;

    const { content, changes } = updateGateMarkdown(ledgerWithEvidence, {
      gateId: "G9",
      criterion: "Implement automation hook",
      timestamp: "2025-10-15T00:00:00.000Z",
      command: "npm run lint",
      evidencePath: "./artifacts/lint.json"
    });

    const occurrences = content.match(/Command: `npm run lint`/g) ?? [];
    expect(occurrences.length).toBe(1);
    expect(changes.evidenceAdded).toBe(false);
  });

  it("throws when criterion not found", () => {
    expect(() =>
      updateGateMarkdown(baseLedger, {
        gateId: "G9",
        criterion: "Non-existent criterion"
      })
    ).toThrow(/Criterion not found/);
  });

  it("validates that only the target gate changed", () => {
    const multiGateLedger = `${baseLedger}\n\n## Gate G10: Another Gate\n\n**Status:** 🟡 PARTIAL\n**Completed:** 2025-10-09\n\n### Acceptance Criteria\n- ⏳ Collect audit logs\n\n### Evidence\n- placeholder`;

    const updated = updateGateMarkdown(multiGateLedger, {
      gateId: "G9",
      criterion: "Implement automation hook",
      timestamp: "2025-10-17T00:00:00.000Z",
      command: "npm run lint"
    });

    expect(() => validateLedgerUpdate(multiGateLedger, updated.content, "G9")).not.toThrow();
  });

  it("detects unexpected changes to other gates", () => {
    const multiGateLedger = `${baseLedger}\n\n## Gate G10: Another Gate\n\n**Status:** 🟡 PARTIAL\n**Completed:** 2025-10-09\n\n### Acceptance Criteria\n- ⏳ Collect audit logs\n\n### Evidence\n- placeholder`;

    const updated = updateGateMarkdown(multiGateLedger, {
      gateId: "G9",
      criterion: "Implement automation hook",
      timestamp: "2025-10-17T00:00:00.000Z",
      command: "npm run lint"
    });

    const tampered = updated.content.replace("- ⏳ Collect audit logs", "- ✅ Collect audit logs");

    expect(() => validateLedgerUpdate(multiGateLedger, tampered, "G9")).toThrow(/Unexpected modifications/);
  });
});

describe("autoUpdateLedgerWithEvidence", () => {
  const originalEnv = process.env.GATE_AUTO_UPDATE;
  let tempDir: string;
  let ledgerPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ledger-test-"));
    ledgerPath = path.join(tempDir, "GATES_LEDGER.md");
    await fs.writeFile(ledgerPath, SAMPLE_LEDGER, "utf-8");
    process.env.GATE_AUTO_UPDATE = "true";
  });

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.GATE_AUTO_UPDATE;
    } else {
      process.env.GATE_AUTO_UPDATE = originalEnv;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("marks criteria complete and appends evidence", async () => {
    const match = {
      gate: "G3",
      criterion: "LangGraph parity tests passing",
      timestamp: "2025-10-15T00:00:00.000Z",
      command: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts",
      source: "state:next"
    };

    const logger = { log: vi.fn(), warn: vi.fn() };
    const result = await autoUpdateLedgerWithEvidence([match], match, {
      ledgerPath,
      logger
    });

    expect(result.updated).toBe(true);
    expect(logger.log).toHaveBeenCalled();

    const updated = await fs.readFile(ledgerPath, "utf-8");
    expect(updated).toContain("- ✅ LangGraph parity tests passing");
    expect(updated).toMatch(/Command: `AGENTS_RUNTIME=langgraph npm test tests\/api\/executions\.test\.ts`/);
  });

  it("skips updates when flag disabled", async () => {
    process.env.GATE_AUTO_UPDATE = "false";
    const match = {
      gate: "G3",
      criterion: "LangGraph parity tests passing",
      timestamp: "2025-10-15T00:00:00.000Z",
      command: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts"
    };

    const logger = { log: vi.fn(), warn: vi.fn() };
    const result = await autoUpdateLedgerWithEvidence([match], match, {
      ledgerPath,
      logger
    });

    expect(result.updated).toBe(false);
    const updated = await fs.readFile(ledgerPath, "utf-8");
    expect(updated).toBe(SAMPLE_LEDGER);
  });

  it("does not duplicate evidence when run twice", async () => {
    const match = {
      gate: "G3",
      criterion: "LangGraph parity tests passing",
      timestamp: "2025-10-15T00:00:00.000Z",
      command: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts"
    };

    await autoUpdateLedgerWithEvidence([match], match, { ledgerPath, logger: { log: () => {}, warn: () => {} } });
    const first = await fs.readFile(ledgerPath, "utf-8");

    await autoUpdateLedgerWithEvidence([match], match, { ledgerPath, logger: { log: () => {}, warn: () => {} } });
    const second = await fs.readFile(ledgerPath, "utf-8");

    const occurrenceCount = (second.match(/Command: `AGENTS_RUNTIME=langgraph npm test tests\/api\/executions\.test\.ts`/g) || [])
      .length;

    expect(second).toBe(first);
    expect(occurrenceCount).toBe(1);
  });

  it("records real /api/execute curl command for aggregated G3 evidence", async () => {
    const match = {
      gate: "G3",
      criterion: "LangGraph parity tests passing",
      timestamp: "2025-10-15T10:05:00.000Z",
      command: "curl -sfS -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{\"input\":\"test\"}'",
      source: "aggregated"
    };

    const logger = { log: vi.fn(), warn: vi.fn() };
    const result = await autoUpdateLedgerWithEvidence([match], match, {
      ledgerPath,
      logger
    });

    expect(result.updated).toBe(true);

    const updated = await fs.readFile(ledgerPath, "utf-8");
    expect(updated).toContain("- ✅ LangGraph parity tests passing");
    // Verify the real curl command is recorded, not a placeholder or test command
    expect(updated).toMatch(/Command: `curl -sfS -X POST http:\/\/localhost:3000\/api\/execute[^\n]*`/);
    expect(updated).not.toContain("both succeeded"); // No placeholder
    expect(updated).not.toContain("npm test tests/api/executions.test.ts"); // Not the test command
  });
});

describe("isAutoUpdateEnabled", () => {
  const original = process.env.GATE_AUTO_UPDATE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.GATE_AUTO_UPDATE;
    } else {
      process.env.GATE_AUTO_UPDATE = original;
    }
  });

  it("defaults to enabled when unset", () => {
    delete process.env.GATE_AUTO_UPDATE;
    expect(isAutoUpdateEnabled()).toBe(true);
  });

  it.each(["", "   ", "1", "true", "TRUE", "on", "yes"])('treats %j as enabled', value => {
    process.env.GATE_AUTO_UPDATE = value;
    expect(isAutoUpdateEnabled()).toBe(true);
  });

  it.each(["0", "false", "FALSE", "off", "OFF", "no", "No"])('treats %j as disabled', value => {
    process.env.GATE_AUTO_UPDATE = value;
    expect(isAutoUpdateEnabled()).toBe(false);
  });
});
