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

  it("detects G2 SBOM evidence on success", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-15T00:00:00Z",
        cmd: "npm run sbom:cyclonedx",
        exit_code: 0
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      gate: "G2",
      criterion: "CycloneDX 1.6 SBOM generated via `npm run sbom:cyclonedx`"
    });
  });

  it("ignores failed commands", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-15T00:00:00Z",
        cmd: "npm run sbom:cyclonedx",
        exit_code: 1
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    expect(matches).toHaveLength(0);
  });

  it("detects LangGraph parity test evidence (combined command)", () => {
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
    const g3Match = matches.find(m => m.gate === "G3");
    expect(g3Match?.criterion).toBe("POST `/api/execute` LangGraph integration (awaits G2 Trust Spine completion)");
  });

  it("detects deterministic replay validation evidence", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-17T00:00:00Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/orchestrator/replay.test.ts",
        exit_code: 0
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    const replayMatch = matches.find(match => match.criterion?.includes("Deterministic replay validation"));
    expect(replayMatch).toBeDefined();
    expect(replayMatch?.gate).toBe("G3");
    expect(replayMatch?.command).toContain("tests/orchestrator/replay.test.ts");
  });

  it("detects parity validation evidence", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-17T00:01:00Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/orchestrator/parity.test.ts",
        exit_code: 0
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    const parityMatch = matches.find(match => match.criterion?.includes("Parity tests"));
    expect(parityMatch).toBeDefined();
    expect(parityMatch?.gate).toBe("G3");
    expect(parityMatch?.command).toContain("tests/orchestrator/parity.test.ts");
  });

  it("detects performance benchmark evidence", () => {
    const normalized = normalizeActionEntry(
      {
        timestamp: "2025-10-17T00:02:00Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/benchmarks/perf-overhead.test.ts",
        exit_code: 0
      },
      "unit-test"
    );

    const matches = detectEvidenceForEntry(normalized);
    const perfMatch = matches.find(match => match.criterion?.includes("Performance benchmarks"));
    expect(perfMatch).toBeDefined();
    expect(perfMatch?.gate).toBe("G3");
    expect(perfMatch?.command).toContain("tests/benchmarks/perf-overhead.test.ts");
  });

  it("aggregates G3 evidence from separate /api/execute and parity test entries", () => {
    const apiExecuteEntry = normalizeActionEntry(
      {
        timestamp: "2025-10-15T10:00:00Z",
        cmd: "curl -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{\"input\":\"test\"}'",
        exit_code: 0
      },
      "manual-test"
    );

    const parityTestEntry = normalizeActionEntry(
      {
        timestamp: "2025-10-15T10:05:00Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts",
        exit_code: 0
      },
      "manual-test"
    );

    // Detect evidence across both entries (aggregation scenario)
    const evidence = detectEvidence([apiExecuteEntry!, parityTestEntry!], { latestPerCriterion: true });

    const g3Matches = evidence.filter(m => m.gate === "G3");
    expect(g3Matches.length).toBeGreaterThan(0);

    const g3Match = g3Matches[0];
    expect(g3Match.criterion).toBe("POST `/api/execute` LangGraph integration (awaits G2 Trust Spine completion)");
    // Command should be the real /api/execute curl, not a placeholder
    expect(g3Match.command).toContain("curl");
    expect(g3Match.command).toContain("/api/execute");
    expect(g3Match.command).not.toContain("both succeeded"); // No placeholder
  });

  it("keeps parity command when only the test ran", () => {
    const parityTestEntry = normalizeActionEntry(
      {
        timestamp: "2025-10-15T11:00:00Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts",
        exit_code: 0
      },
      "manual-test"
    );

    const evidence = detectEvidence([parityTestEntry!]);
    const g3Match = evidence.find(match => match.gate === "G3");
    expect(g3Match?.command).toBe("AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts");
  });

  it("prefers aggregated curl when curl runs before parity test", () => {
    const apiExecuteEntry = normalizeActionEntry(
      {
        timestamp: "2025-10-17T09:13:30.000Z",
        cmd: "curl -sfS -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{\"input\":\"ping\"}'",
        exit_code: 0
      },
      "manual-test"
    );

    const parityTestEntry = normalizeActionEntry(
      {
        timestamp: "2025-10-17T09:13:41.000Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts",
        exit_code: 0
      },
      "manual-test"
    );

    const evidence = detectEvidence([apiExecuteEntry!, parityTestEntry!], { latestPerCriterion: true });
    const g3Match = evidence.find(match => match.gate === "G3");
    expect(g3Match?.command).toContain("curl -sfS -X POST http://localhost:3000/api/execute");
    expect(g3Match?.source).toBe("aggregated");
  });

  it("prefers aggregated curl even when parity test logged first", () => {
    const parityTestEntry = normalizeActionEntry(
      {
        timestamp: "2025-10-17T09:13:30.000Z",
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts",
        exit_code: 0
      },
      "manual-test"
    );

    const apiExecuteEntry = normalizeActionEntry(
      {
        timestamp: "2025-10-17T09:13:41.000Z",
        cmd: "curl -sfS -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{\"input\":\"ping\"}'",
        exit_code: 0
      },
      "manual-test"
    );

    const evidence = detectEvidence([parityTestEntry!, apiExecuteEntry!], { latestPerCriterion: true });
    const g3Match = evidence.find(match => match.gate === "G3");
    expect(g3Match?.command).toContain("curl -sfS -X POST http://localhost:3000/api/execute");
    expect(g3Match?.source).toBe("aggregated");
  });

  it("prefers aggregated curl when timestamps tie", () => {
    const timestamp = "2025-10-17T09:13:41.000Z";
    const parityTestEntry = normalizeActionEntry(
      {
        timestamp,
        cmd: "AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts",
        exit_code: 0
      },
      "manual-test"
    );

    const apiExecuteEntry = normalizeActionEntry(
      {
        timestamp,
        cmd: "curl -sfS -X POST http://localhost:3000/api/execute -H 'content-type: application/json' -d '{\"input\":\"ping\"}'",
        exit_code: 0
      },
      "manual-test"
    );

    const evidence = detectEvidence([parityTestEntry!, apiExecuteEntry!], { latestPerCriterion: true });
    const g3Match = evidence.find(match => match.gate === "G3");
    expect(g3Match?.command).toContain("curl -sfS -X POST http://localhost:3000/api/execute");
    expect(g3Match?.source).toBe("aggregated");
  });

  it("returns latest evidence when aggregating entries", () => {
    const older = normalizeActionEntry(
      {
        timestamp: "2025-10-15T00:00:00Z",
        cmd: "npm run sbom:cyclonedx",
        exit_code: 0
      },
      "unit-test"
    );

    const newer = normalizeActionEntry(
      {
        timestamp: "2025-10-16T00:00:00Z",
        cmd: "npm run sbom:cyclonedx",
        exit_code: 0
      },
      "unit-test"
    );

    const evidence = detectEvidence([older!, newer!]);
    expect(evidence).toHaveLength(1);
    expect(evidence[0].timestamp).toBe("2025-10-16T00:00:00.000Z");
  });
});
