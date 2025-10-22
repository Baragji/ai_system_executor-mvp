import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn(() => true);
}

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
const { ensureDependenciesMock } = vi.hoisted(() => ({ ensureDependenciesMock: vi.fn() }));
const { detectTestCommandMock } = vi.hoisted(() => ({ detectTestCommandMock: vi.fn() }));
const { createWriteStreamMock } = vi.hoisted(() => ({ createWriteStreamMock: vi.fn() }));

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}));
vi.mock("../../src/runner/installDeps.js", () => ({
  ensureDependencies: (...args: unknown[]) => ensureDependenciesMock(...args)
}));
vi.mock("../../src/runner/detectTestCommand.js", () => ({
  detectTestCommand: (...args: unknown[]) => detectTestCommandMock(...args)
}));
vi.mock("node:fs", async (orig) => {
  const real = await (orig() as Promise<typeof import("node:fs")>);
  return {
    ...real,
    createWriteStream: (...args: unknown[]) => createWriteStreamMock(...args)
  };
});

import { runInSandbox } from "../../src/runner/runInSandbox.js";

describe("runInSandbox log stream error handling", () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    // child exits 0 after emitting some output
    spawnMock.mockImplementation(() => {
      const child = new MockChildProcess();
      setTimeout(() => {
        child.stdout.emit("data", Buffer.from("ok\n"));
        child.emit("exit", 0, null);
      }, 0).unref?.();
      return child as unknown as ReturnType<typeof spawnMock>;
    });
    ensureDependenciesMock.mockResolvedValue({ installed: false, command: null });
    detectTestCommandMock.mockReturnValue("npm test");
    // createWriteStream emits error immediately
    createWriteStreamMock.mockImplementation(() => {
      const stream = new EventEmitter();
      setTimeout(() => stream.emit("error", new Error("disk full")), 0).unref?.();
      // @ts-expect-error minimal mock with write method
      stream.write = () => true;
      // @ts-expect-error minimal mock with end method
      stream.end = () => void 0;
      return stream;
    });
  });

  afterEach(async () => {
    spawnMock.mockReset();
    ensureDependenciesMock.mockReset();
    detectTestCommandMock.mockReset();
    createWriteStreamMock.mockReset();
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir) await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("returns results even if log stream fails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-log-"));
    tempDirs.push(root);
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "demo", version: "0.0.0" }), "utf-8");

    const result = await runInSandbox({ projectRoot: root, projectSlug: "demo" });
    expect(result.status).toBe("pass");
    expect(result.logsPath).toMatch(/last_test_run_/);
  });
});

