import { describe, expect, it } from "vitest";
import path from "node:path";

import {
  canAdvanceToNextTask,
  determineCurrentTask,
  determineNextTask,
  formatHumanSummary,
  loadPhaseState,
  suggestNextAction,
  type PhaseState,
  type ValidationSnapshot
} from "../../src/state/phaseState.js";

describe("phaseState shared module", () => {
  it("loads basic phase and gate info from the repository", async () => {
    const state = await loadPhaseState({ rootDir: path.resolve(".") });
    expect(state.phaseId).toBe("19");
    expect(state.phaseName.length).toBeGreaterThan(0);
    expect(state.gates && typeof state.gates).toBe("object");
    expect(Array.isArray(state.tasks)).toBe(true);
  });

  it("suggests committing when uncommitted changes exist", () => {
    const state: PhaseState = {
      phaseId: "19",
      phaseName: "Test Phase",
      contractPath: null,
      ledgerPath: null,
      tasks: [],
      gates: {}
    };
    const next = suggestNextAction(state, { uncommittedChanges: [" M scripts/example.ts"] });
    expect(next.action).toBe("COMMIT_PENDING_CHANGES");
  });

  it("summarizes state with validation info", () => {
    const state: PhaseState = {
      phaseId: "19",
      phaseName: "Test Phase",
      contractPath: null,
      ledgerPath: null,
      tasks: [],
      gates: { G2: "passed", G3: "partial" }
    };
    const validations: ValidationSnapshot = {
      last_run: "2025-10-14T00:00:00Z",
      lint: "pass",
      typecheck: "pass",
      test: "pass",
      contract_check: "pass"
    };
    const next = suggestNextAction(state, { validations, uncommittedChanges: [] });
    const summary = formatHumanSummary(state, next, { validations, uncommittedChanges: [] });
    expect(typeof summary).toBe("string");
    expect(summary.includes("Phase 19")).toBe(true);
  });

  it("derives current and next tasks", () => {
    const state: PhaseState = {
      phaseId: "19",
      phaseName: "Test",
      contractPath: null,
      ledgerPath: null,
      gates: { G1: "passed" },
      tasks: [
        { id: "T1", title: "Do work", status: "complete" },
        { id: "T2", title: "Continue" },
        { id: "T3", title: "Finish" }
      ]
    };
    const current = determineCurrentTask(state);
    const next = determineNextTask(state);
    expect(current?.id).toBe("T2");
    expect(next?.id).toBe("T3");
    expect(canAdvanceToNextTask(state)).toBe(false);
  });
});

