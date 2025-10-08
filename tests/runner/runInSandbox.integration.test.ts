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
const { ensureDependenciesMock } = vi.hoisted(() => ({
  ensureDependenciesMock: vi.fn()
}));
const { detectTestCommandMock } = vi.hoisted(() => ({
  detectTestCommandMock: vi.fn()
}));

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args)
}));
vi.mock("../../src/runner/installDeps.js", () => ({
  ensureDependencies: (...args: unknown[]) => ensureDependenciesMock(...args)
}));
vi.mock("../../src/runner/detectTestCommand.js", () => ({
  detectTestCommand: (...args: unknown[]) => detectTestCommandMock(...args)
}));

import { runInSandbox } from "../../src/runner/runInSandbox.js";

const tempDirs: string[] = [];

beforeEach(() => {
  spawnMock.mockImplementation(() => {
    const child = new MockChildProcess();
    setTimeout(() => {
      child.emit("exit", 0, null);
    }, 0).unref?.();
    return child as unknown as ReturnType<typeof spawnMock>;
  });
  ensureDependenciesMock.mockResolvedValue({
    installed: false,
    command: null
  });
  detectTestCommandMock.mockReturnValue("npm test");
});

afterEach(async () => {
  spawnMock.mockReset();
  ensureDependenciesMock.mockReset();
  detectTestCommandMock.mockReset();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe("runInSandbox integration", () => {
  async function createProject(withPackageJson = true): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-run-"));
    tempDirs.push(root);
    if (withPackageJson) {
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "demo", version: "0.0.0" }),
        "utf-8"
      );
    }
    return root;
  }

  it("installs dependencies then runs detected command", async () => {
    const projectRoot = await createProject();
    ensureDependenciesMock.mockResolvedValueOnce({
      installed: true,
      command: "npm ci --ignore-scripts",
      stdout: "",
      stderr: ""
    });
    detectTestCommandMock.mockReturnValueOnce("vitest run");

    const result = await runInSandbox({
      projectRoot,
      projectSlug: "demo",
      timeoutMs: 1500
    });

    expect(ensureDependenciesMock).toHaveBeenCalledWith(projectRoot, expect.any(Number));
    expect(detectTestCommandMock).toHaveBeenCalledWith(projectRoot);
    expect(spawnMock).toHaveBeenCalled();
    const [command, options] = spawnMock.mock.calls[0]!;
    expect(command).toBe("vitest run");
    expect(options?.env?.CI).toBe("1");
    expect(result.command).toBe("vitest run");
    expect(ensureDependenciesMock.mock.invocationCallOrder[0]).toBeLessThan(
      spawnMock.mock.invocationCallOrder[0]!
    );
  });

  it("respects provided command without detection", async () => {
    const projectRoot = await createProject(false);

    const result = await runInSandbox({
      projectRoot,
      projectSlug: "demo",
      command: "npm test -- --run",
      timeoutMs: 1000
    });

    expect(ensureDependenciesMock).toHaveBeenCalled();
    expect(detectTestCommandMock).not.toHaveBeenCalled();
    const [command] = spawnMock.mock.calls[0]!;
    expect(command).toBe("npm test -- --run");
    expect(result.command).toBe("npm test -- --run");
  });
});
