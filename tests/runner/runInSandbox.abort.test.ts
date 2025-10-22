import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn(() => true);
  pid = 4321;
}

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}));
import { runInSandbox } from "../../src/runner/runInSandbox.js";
import {
  createAbortSignal,
  abortSession,
  cleanupAbortSignal,
  PausedError
} from "../../src/orchestrator/abortSignal.js";
import * as installDepsModule from "../../src/runner/installDeps.js";
import * as detectTestCommandModule from "../../src/runner/detectTestCommand.js";

describe("runInSandbox abort handling", () => {
  const tempDirs: string[] = [];
  let processKillSpy: ReturnType<typeof vi.spyOn<typeof process, "kill">>;
  let ensureDependenciesSpy: ReturnType<typeof vi.spyOn> | undefined;
  let detectTestCommandSpy: ReturnType<typeof vi.spyOn> | undefined;
  let onSpawn: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    spawnMock.mockImplementation(() => {
      const child = new MockChildProcess();
      setTimeout(() => {
        child.stdout.emit("data", Buffer.from("running\n"));
      }, 1).unref?.();
      onSpawn?.();
      return child as unknown as ReturnType<typeof spawnMock>;
    });
    ensureDependenciesSpy = vi
      .spyOn(installDepsModule, "ensureDependencies")
      .mockResolvedValue({ installed: false, command: null });
    detectTestCommandSpy = vi
      .spyOn(detectTestCommandModule, "detectTestCommand")
      .mockReturnValue("npm test");
    processKillSpy = vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterEach(async () => {
    vi.useRealTimers();
    spawnMock.mockReset();
    ensureDependenciesSpy?.mockRestore();
    detectTestCommandSpy?.mockRestore();
    ensureDependenciesSpy = undefined;
    detectTestCommandSpy = undefined;
    onSpawn = undefined;
    processKillSpy.mockRestore();
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      if (dir) await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("terminates child process promptly when paused", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-abort-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", version: "0.0.0" }),
      "utf-8"
    );

    const sessionId = "sandbox-session";
    createAbortSignal(sessionId);

    const promise = runInSandbox({ projectRoot: root, projectSlug: "demo", sessionId, timeoutMs: 5000 });

    await new Promise<void>(resolve => {
      if (spawnMock.mock.calls.length > 0) {
        resolve();
      } else {
        onSpawn = resolve;
      }
    });

    const child = spawnMock.mock.results[0]?.value as unknown as MockChildProcess | undefined;
    expect(child).toBeDefined();
    if (!child) throw new Error("child process was not spawned");

    try {
      abortSession(sessionId);

      await vi.advanceTimersByTimeAsync(5);
      expect(child.kill).toHaveBeenCalledWith("SIGTERM");

      setTimeout(() => {
        child.emit("exit", null, null);
      }, 5100).unref?.();

      await vi.advanceTimersByTimeAsync(5100);

      expect(child.kill).toHaveBeenCalledWith("SIGKILL");
      expect(processKillSpy).toHaveBeenCalledWith(-child.pid, "SIGKILL");

      await expect(promise).rejects.toBeInstanceOf(PausedError);
    } finally {
      cleanupAbortSignal(sessionId);
    }
  });
});
