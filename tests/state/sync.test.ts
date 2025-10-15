import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import fsSync from "node:fs";

const execSyncMock = vi.fn();

vi.mock("node:child_process", () => ({
  execSync: execSyncMock,
}));

function contractPath(rootDir: string) {
  return path.join(rootDir, "contracts", "Roadmap_execution", "19_phase19_autonomous_transition_contract.json");
}

describe("state:sync contract updater", () => {
  let tmpDir: string;
  let syncContract: (args: { phaseId?: string; rootDir?: string; silent?: boolean }) => Promise<{ updated: number }>;

  beforeEach(async () => {
    vi.resetModules();
    execSyncMock.mockReset();
    const mod = await import("../../scripts/sync-contract-status.js");
    syncContract = mod.syncContract;

    tmpDir = await mkdtemp(path.join(os.tmpdir(), "state-sync-"));
    await mkdir(path.join(tmpDir, "contracts", "Roadmap_execution"), { recursive: true });
    await mkdir(path.join(tmpDir, "src", "telemetry"), { recursive: true });
    await mkdir(path.join(tmpDir, "src", "middleware"), { recursive: true });
    await mkdir(path.join(tmpDir, ".automation", "evidence", "G2"), { recursive: true });

    for (let i = 0; i < 5; i += 1) {
      await writeFile(path.join(tmpDir, ".automation", "evidence", "G2", `artifact-${i}.txt`), "ok");
    }
    await writeFile(path.join(tmpDir, ".automation", "GATES_LEDGER.md"), "## Gate G2\n**Status:** ✅ PASSED\n");
    await writeFile(path.join(tmpDir, "src", "telemetry", "events.ts"), "export const FLAG = process.env.ACTION_LOG_JSONL;\n");
    await writeFile(path.join(tmpDir, "src", "telemetry", "otel.ts"), "export const sdk = new NodeSDK({});\n");
    await writeFile(
      path.join(tmpDir, "src", "middleware", "problemDetails.ts"),
      "export function toValidationProblem() { return { occurred_at: new Date(), title: getHttpReasonPhrase(200) }; }\n",
    );
  });

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("marks Phase 19 tasks complete when evidence checks pass", async () => {
    execSyncMock.mockImplementation((command: string) => {
      if (command.startsWith("node -e")) {
        return "";
      }
      if (command.includes("sbom:cyclonedx")) {
        fsSync.writeFileSync(path.join(tmpDir, "sbom.cdx.json"), "a".repeat(1_000_100));
        return "";
      }
      if (command.includes("provenance")) {
        fsSync.writeFileSync(path.join(tmpDir, "provenance.intoto.jsonl"), "slsa.dev/provenance\n");
        return "";
      }
      if (command.startsWith("npm test")) {
        return "Tests 350 passed";
      }
      return "";
    });

    const tasks = [
      {
        id: "T0-DOC-1",
        status: "pending",
        validation: [{ cmd: "node -e \"process.exit(0)\"", expect_exit_code: 0 }],
      },
      { id: "T0-IMPL-1", status: "pending" },
      { id: "T0-IMPL-2", status: "pending" },
      { id: "T0-IMPL-3", status: "pending" },
      { id: "T0-IMPL-4", status: "pending" },
      { id: "T0-IMPL-5", status: "pending" },
      { id: "T0-TEST-1", status: "pending" },
      { id: "T0-EVID-1", status: "pending" },
      { id: "T0-GATE-1", status: "pending" },
    ];

    await writeFile(
      contractPath(tmpDir),
      JSON.stringify({ contract_version: "19.0.0", tasks }, null, 2),
      "utf8",
    );

    const result = await syncContract({ phaseId: "19", rootDir: tmpDir, silent: true });
    expect(result.updated).toBeGreaterThan(0);

    const updated = JSON.parse(await readFile(contractPath(tmpDir), "utf8"));
    expect(updated.tasks.every((task: { status: string }) => task.status === "complete")).toBe(true);
    expect(
      updated.tasks.every(
        (task: { completed_at?: string }) => typeof task.completed_at === "string" && task.completed_at.length > 0,
      ),
    ).toBe(true);

    updated.tasks
      .filter((task: { validation?: unknown }) => Array.isArray(task.validation) && task.validation.length > 0)
      .forEach((task: { id: string; validation_results: unknown }) => {
        expect(Array.isArray(task.validation_results)).toBe(true);
        expect((task.validation_results as unknown[]).length).toBeGreaterThan(0);
      });

    const docTask = updated.tasks.find((task: { id: string }) => task.id === "T0-DOC-1");
    if (!docTask) {
      throw new Error("Expected T0-DOC-1 to be present in contract tasks");
    }
    expect(Array.isArray(docTask.validation_results)).toBe(true);
    const validationResults = docTask.validation_results as Array<{
      cmd: string;
      exit_code: number;
      ok: boolean;
      executed_at: string;
      stdout: string;
      stderr: string;
    }>;
    expect(validationResults.length).toBeGreaterThan(0);
    validationResults.forEach(
      (
        result: {
          cmd: string;
          exit_code: number;
          ok: boolean;
          executed_at: string;
          stdout: string;
          stderr: string;
        },
      ) => {
        expect(result.cmd).toBe("node -e \"process.exit(0)\"");
        expect(result.exit_code).toBe(0);
        expect(result.ok).toBe(true);
        expect(typeof result.executed_at).toBe("string");
        expect(typeof result.stdout).toBe("string");
        expect(typeof result.stderr).toBe("string");
      },
    );
  });

  it("is idempotent when contract already synced", async () => {
    execSyncMock.mockImplementation((command: string) => {
      if (command.startsWith("node -e")) {
        return "";
      }
      if (command.includes("sbom:cyclonedx")) {
        fsSync.writeFileSync(path.join(tmpDir, "sbom.cdx.json"), "a".repeat(1_000_100));
        return "";
      }
      if (command.includes("provenance")) {
        fsSync.writeFileSync(path.join(tmpDir, "provenance.intoto.jsonl"), "slsa.dev/provenance\n");
        return "";
      }
      if (command.startsWith("npm test")) {
        return "Tests 350 passed";
      }
      return "";
    });

    const tasks = [
      { id: "T0-IMPL-1", status: "pending" },
      { id: "T0-IMPL-2", status: "pending" },
    ];

    await writeFile(
      contractPath(tmpDir),
      JSON.stringify({ contract_version: "19.0.0", tasks }, null, 2),
      "utf8",
    );

    await syncContract({ phaseId: "19", rootDir: tmpDir, silent: true });
    const syncedOnce = JSON.parse(await readFile(contractPath(tmpDir), "utf8"));
    const firstTimestamps = syncedOnce.tasks.map((task: { completed_at?: string }) => task.completed_at);

    const second = await syncContract({ phaseId: "19", rootDir: tmpDir, silent: true });
    expect(second.updated).toBe(0);
    const syncedTwice = JSON.parse(await readFile(contractPath(tmpDir), "utf8"));
    expect(syncedTwice.tasks.map((task: { completed_at?: string }) => task.completed_at)).toEqual(firstTimestamps);
  });
});
