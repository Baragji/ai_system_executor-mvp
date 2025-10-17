import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn(() => true);
}

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn()
}));

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}));

import { ensureDependencies } from "../../src/runner/installDeps.js";

const tempDirs: string[] = [];
let nextExitCode = 0;

beforeEach(() => {
  spawnMock.mockImplementation(() => {
    const child = new MockChildProcess();
    setTimeout(() => {
      child.emit("exit", nextExitCode, null);
    }, 0).unref?.();
    return child as unknown as ReturnType<typeof spawnMock>;
  });
  nextExitCode = 0;
});

afterEach(async () => {
  spawnMock.mockReset();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe("ensureDependencies", () => {
  async function createTempProject(): Promise<string> {
    const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "install-deps-"));
    tempDirs.push(projectRoot);
    return projectRoot;
  }

  async function writePackageJson(projectRoot: string): Promise<void> {
    await fs.writeFile(
      path.join(projectRoot, "package.json"),
      JSON.stringify({ name: "sample", version: "0.0.0" }),
      "utf-8"
    );
  }

  async function writeLockfile(projectRoot: string): Promise<void> {
    await fs.writeFile(path.join(projectRoot, "package-lock.json"), "{}", "utf-8");
  }

  it("skips install when package.json missing", async () => {
    const projectRoot = await createTempProject();

    const result = await ensureDependencies(projectRoot);

    expect(result.installed).toBe(false);
    expect(result.command).toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("skips install when node_modules already present and no deps declared", async () => {
    const projectRoot = await createTempProject();
    await writePackageJson(projectRoot);
    await fs.mkdir(path.join(projectRoot, "node_modules"));

    const result = await ensureDependencies(projectRoot);

    expect(result.installed).toBe(false);
    expect(result.command).toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("runs npm ci with --ignore-scripts when modules missing", async () => {
    const projectRoot = await createTempProject();
    // Declare a dependency to trigger installation
    await fs.writeFile(
      path.join(projectRoot, "package.json"),
      JSON.stringify({ name: "sample", version: "0.0.0", dependencies: { express: "^4.0.0" } }),
      "utf-8"
    );
    await writeLockfile(projectRoot);

    const result = await ensureDependencies(projectRoot);

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args] = spawnMock.mock.calls[0]!;
    expect(command).toBe("npm");
    expect(args).toContain("ci");
    expect(args).toContain("--ignore-scripts");
    expect(result.installed).toBe(true);
    expect(result.command).toBe("npm ci --ignore-scripts");
  });

  it("skips install when no deps declared even if node_modules missing", async () => {
    const projectRoot = await createTempProject();
    await writePackageJson(projectRoot);

    const result = await ensureDependencies(projectRoot);

    expect(result.installed).toBe(false);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("runs npm ci when deps are missing despite node_modules present (lockfile present)", async () => {
    const projectRoot = await createTempProject();
    await writePackageJson(projectRoot);
    await writeLockfile(projectRoot);
    await fs.mkdir(path.join(projectRoot, "node_modules"));
    // Declare a dep that is not installed
    const pkgPath = path.join(projectRoot, "package.json");
    await fs.writeFile(pkgPath, JSON.stringify({ name: "x", version: "0.0.0", devDependencies: { vitest: "^2.0.0" } }), "utf-8");

    const result = await ensureDependencies(projectRoot);

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args] = spawnMock.mock.calls[0]!;
    expect(command).toBe("npm");
    expect(args).toContain("ci");
    expect(result.installed).toBe(true);
    expect(result.command).toBe("npm ci --ignore-scripts");
  });

  it("runs npm install when no lockfile and deps missing", async () => {
    const projectRoot = await createTempProject();
    await writePackageJson(projectRoot);
    await fs.mkdir(path.join(projectRoot, "node_modules"));
    const pkgPath = path.join(projectRoot, "package.json");
    await fs.writeFile(pkgPath, JSON.stringify({ name: "x", version: "0.0.0", dependencies: { express: "^4.0.0" } }), "utf-8");

    const result = await ensureDependencies(projectRoot);

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args] = spawnMock.mock.calls[0]!;
    expect(command).toBe("npm");
    expect(args[0]).toBe("install");
    expect(result.installed).toBe(true);
    expect(result.command?.startsWith("npm install --ignore-scripts")).toBe(true);
  });

  it("falls back to npm install when npm ci reports lockfile mismatch", async () => {
    const projectRoot = await createTempProject();
    // prepare package.json with a dep and create a lockfile to trigger ci path
    await fs.writeFile(
      path.join(projectRoot, "package.json"),
      JSON.stringify({ name: "x", version: "0.0.0", devDependencies: { tailwindcss: "^3.4.0" } }),
      "utf-8"
    );
    await writeLockfile(projectRoot);

    // First spawn: simulate npm ci failing with EUSAGE / mismatch
    const first = new MockChildProcess();
    const second = new MockChildProcess();
    spawnMock.mockImplementationOnce(() => {
      setTimeout(() => {
        first.stderr.emit("data", Buffer.from("npm ci can only install packages when your package.json and package-lock.json are in sync"));
        first.emit("exit", 1, null);
      }, 0).unref?.();
      return first as unknown as ReturnType<typeof spawnMock>;
    });
    // Second spawn: simulate npm install success
    spawnMock.mockImplementationOnce(() => {
      setTimeout(() => {
        second.emit("exit", 0, null);
      }, 0).unref?.();
      return second as unknown as ReturnType<typeof spawnMock>;
    });

    const result = await ensureDependencies(projectRoot);

    expect(spawnMock).toHaveBeenCalledTimes(2);
    const firstCall = spawnMock.mock.calls[0]!;
    const secondCall = spawnMock.mock.calls[1]!;
    expect(firstCall[1]).toContain("ci");
    expect(secondCall[1][0]).toBe("install");
    expect(result.installed).toBe(true);
    expect(result.command?.startsWith("npm install --ignore-scripts")).toBe(true);
  });

  it("throws when install command exits with error", async () => {
    const projectRoot = await createTempProject();
    await fs.writeFile(
      path.join(projectRoot, "package.json"),
      JSON.stringify({ name: "sample", version: "0.0.0", devDependencies: { vitest: "^2.0.0" } }),
      "utf-8"
    );
    await writeLockfile(projectRoot);
    nextExitCode = 1;

    await expect(ensureDependencies(projectRoot)).rejects.toThrow(/failed/);
  });
});
