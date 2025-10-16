import { describe, it, expect } from "vitest";
import {
  detectEvidence,
  detectEvidenceForEntry,
  normalizeActionEntry
} from "../../scripts/detect-evidence.js";

describe("detect-evidence utilities", () => {
  it("normalizes raw action entries", () => {
    const raw = {
      timestamp: "2025-10-15T00:00:00Z",
      cmd: "npm run lint",
      exit_code: 0
    };

    const normalized = normalizeActionEntry(raw, "test-source");

    expect(normalized).toBeDefined();
    expect(normalized?.command).toBe("npm run lint");
    expect(normalized?.exitCode).toBe(0);
    expect(normalized?.success).toBe(true);
    expect(normalized?.source).toBe("test-source");
    expect(normalized?.timestamp).toBe("2025-10-15T00:00:00.000Z");
  });

  it("detects lint evidence on success", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-15T00:00:00Z",
        cmd: "npm run lint",
        exit_code: 0
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      gate: "G0",
      criterion: "Lint passing"
    });
  });

  it("ignores failed commands", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-15T00:00:00Z",
        cmd: "npm run lint",
        exit_code: 1
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    expect(matches).toHaveLength(0);
  });

  it("detects LangGraph parity test evidence", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-15T00:00:00Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts",
        exit_code: 0
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    expect(matches.some(match => match.gate === "G3")).toBe(true);
  });

  it("returns latest evidence when aggregating entries", () => {
    const older = normalizeActionEntry(
      {
        timestamp: "2025-10-15T00:00:00Z",
        cmd: "npm run lint",
        exit_code: 0
      },
      "unit-test"
    );

    const newer = normalizeActionEntry(
      {
        timestamp: "2025-10-16T00:00:00Z",
        cmd: "npm run lint",
        exit_code: 0
      },
      "unit-test"
    );

    const evidence = detectEvidence([older, newer]);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].timestamp).toBe("2025-10-16T00:00:00.000Z");
  });
});
