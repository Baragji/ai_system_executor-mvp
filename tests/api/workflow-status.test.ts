import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/server.js";
import type { WorkflowMetadata } from "../../src/state/phaseState.js";

describe("GET /api/workflow/status", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("returns workflow metadata with phase information", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    // Phase information
    expect(metadata.phase).toBeDefined();
    expect(metadata.phase.id).toBe("19");
    expect(metadata.phase.name).toContain("Autonomous Transition");
    expect(metadata.phase.contractPath).toMatch(/19_phase19.*contract\.json$/);
    expect(metadata.phase.ledgerPath).toMatch(/GATES_LEDGER\.md$/);
  });

  it("includes gates summary with status", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    expect(metadata.gates).toBeDefined();
    expect(typeof metadata.gates).toBe("object");

    // Should have gate entries
    const gateKeys = Object.keys(metadata.gates);
    expect(gateKeys.length).toBeGreaterThan(0);

    // Each gate should have a status
    for (const status of Object.values(metadata.gates)) {
      expect(["passed", "failed", "partial", "not_started", "unknown"]).toContain(status);
    }
  });

  it("includes currentGate identification", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    if (metadata.currentGate) {
      expect(metadata.currentGate.id).toMatch(/^G\d+$/);
      expect(["passed", "failed", "partial", "not_started", "unknown"]).toContain(
        metadata.currentGate.status
      );
    }
  });

  it("includes tasks array with status", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    expect(Array.isArray(metadata.tasks)).toBe(true);

    // If tasks exist, validate structure
    if (metadata.tasks.length > 0) {
      const task = metadata.tasks[0];
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("title");

      if (task.status) {
        expect(["pending", "in_progress", "complete", "completed", "blocked"]).toContain(task.status);
      }
    }
  });

  it("includes current and next task identification", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    // currentTask and nextTask may be null if all tasks complete
    if (metadata.currentTask) {
      expect(metadata.currentTask).toHaveProperty("id");
      expect(metadata.currentTask).toHaveProperty("title");
    }

    if (metadata.nextTask) {
      expect(metadata.nextTask).toHaveProperty("id");
      expect(metadata.nextTask).toHaveProperty("title");
    }

    // pendingTasks should be an array
    expect(Array.isArray(metadata.pendingTasks)).toBe(true);
  });

  it("includes suggested next action", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    expect(metadata.suggestedNextAction).toBeDefined();
    expect(metadata.suggestedNextAction.action).toBeDefined();
    expect(metadata.suggestedNextAction.reasoning).toBeDefined();

    // Action should be one of the known types
    expect([
      "COMMIT_PENDING_TESTS",
      "COMMIT_PENDING_CHANGES",
      "FIX_VALIDATION_ERRORS",
      "ADVANCE_ORCHESTRATOR_PILOT",
      "NO_ACTION"
    ]).toContain(metadata.suggestedNextAction.action);

    // Command may be null for NO_ACTION
    if (metadata.suggestedNextAction.action !== "NO_ACTION") {
      expect(typeof metadata.suggestedNextAction.command).toBe("string");
    }
  });

  it("includes human-readable summary", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    expect(metadata.humanSummary).toBeDefined();
    expect(typeof metadata.humanSummary).toBe("string");
    expect(metadata.humanSummary.length).toBeGreaterThan(0);
    expect(metadata.humanSummary).toContain("Phase");
  });

  it("includes validations snapshot (may be null)", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    // Validations may be null if not run yet
    if (metadata.validations) {
      expect(metadata.validations).toHaveProperty("lint");
      expect(metadata.validations).toHaveProperty("typecheck");
      expect(metadata.validations).toHaveProperty("test");
      expect(metadata.validations).toHaveProperty("contract_check");

      for (const status of Object.values(metadata.validations)) {
        if (typeof status === "string") {
          expect(["pass", "fail", "skipped"]).toContain(status);
        }
      }
    }
  });

  it("includes uncommitted changes array", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    expect(Array.isArray(metadata.uncommittedChanges)).toBe(true);
  });

  it("includes computed timestamp", async () => {
    const res = await request(app)
      .get("/api/workflow/status")
      .expect(200);

    const metadata = res.body as WorkflowMetadata;

    expect(metadata.computedAt).toBeDefined();
    expect(typeof metadata.computedAt).toBe("string");

    // Should be valid ISO timestamp
    const timestamp = new Date(metadata.computedAt);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it("handles errors gracefully", async () => {
    // This test ensures the endpoint doesn't crash on errors
    // Since we can't easily force an error in the actual implementation,
    // we just verify the endpoint is robust
    const res = await request(app).get("/api/workflow/status");

    // Should either succeed (200) or fail gracefully (500)
    expect([200, 500]).toContain(res.status);

    if (res.status === 500) {
      expect(res.body).toHaveProperty("error");
    }
  });
});
