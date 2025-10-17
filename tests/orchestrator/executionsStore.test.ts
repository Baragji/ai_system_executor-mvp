import { describe, it, expect, beforeEach } from "vitest";
import { __test as execTest, createExecution, getExecution, updateExecution, completeExecution, failExecution, listExecutions } from "../../src/orchestrator/executionsStore.js";

describe("executionsStore", () => {
  beforeEach(() => execTest.clear());

  it("creates, gets, updates and completes an execution", () => {
    const id = "x-1";
    const rec = createExecution(id);
    expect(rec.id).toBe(id);
    expect(rec.status).toBe("started");
    const fetched = getExecution(id);
    expect(fetched?.id).toBe(id);
    const upd = updateExecution(id, { status: "failed", error: "oops" });
    expect(upd?.status).toBe("failed");
    expect(upd?.error).toBe("oops");
    const done = completeExecution(id, { ok: true });
    expect(done?.status).toBe("completed");
    expect((done as any).result?.ok).toBe(true);
    expect(listExecutions().length).toBe(1);
  });

  it("fails an execution with error message normalization", () => {
    const id = "x-2";
    createExecution(id);
    const failed = failExecution(id, new Error("boom"));
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("boom");
  });
});
