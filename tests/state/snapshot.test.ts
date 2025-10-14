import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import path from "node:path";

function runNode(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(process.execPath, args, { timeout: 20000 }, (error, stdout, stderr) => {
      const code = (error && typeof (error as { code?: number }).code === "number") ? (error as { code?: number }).code as number : 0;
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

describe("state snapshot (read-only)", () => {
  it("prints a valid JSON snapshot with expected keys", async () => {
    const script = path.resolve("scripts/snapshot-state.js");
    const res = await runNode([script, "--print", "--no-validate"]);
    expect(res.code).toBe(0);
    // Ensure JSON parses
    const json = JSON.parse(res.stdout);
    expect(typeof json.generated_at).toBe("string");
    expect(json).toHaveProperty("data_sources");
    expect(json).toHaveProperty("current_phase");
    expect(json).toHaveProperty("gates_summary");
    expect(json).toHaveProperty("validation_summary");
    expect(json).toHaveProperty("uncommitted_changes");
    expect(json).toHaveProperty("sync_status");
    expect(typeof json.sync_status.contract_stale).toBe("boolean");
    expect(Array.isArray(json.sync_status.stale_tasks)).toBe(true);
    expect(json).toHaveProperty("suggested_next_action");
    expect(typeof json.suggested_next_action.action).toBe("string");
    expect(Array.isArray(json.tasks) || json.tasks === undefined).toBe(true);
  });
});
