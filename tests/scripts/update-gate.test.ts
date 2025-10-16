import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { updateGateMarkdown, isAutoUpdateEnabled } from "../../scripts/update-gate.js";

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

  it("returns true for truthy flag values", () => {
    process.env.GATE_AUTO_UPDATE = "true";
    expect(isAutoUpdateEnabled()).toBe(true);
  });

  it("returns false when flag is unset", () => {
    delete process.env.GATE_AUTO_UPDATE;
    expect(isAutoUpdateEnabled()).toBe(false);
  });
});
