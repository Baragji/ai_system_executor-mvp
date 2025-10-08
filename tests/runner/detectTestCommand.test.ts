import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectTestCommand } from "../../src/runner/detectTestCommand.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

async function withPackageJson(data: object): Promise<string> {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "detect-command-"));
  tempDirs.push(projectRoot);
  await fs.writeFile(path.join(projectRoot, "package.json"), JSON.stringify(data), "utf-8");
  return projectRoot;
}

describe("detectTestCommand", () => {
  it("returns npm test when script defined", async () => {
    const root = await withPackageJson({
      scripts: { test: "vitest run" }
    });

    expect(detectTestCommand(root)).toBe("npm test");
  });

  it("prefers vitest when available", async () => {
    const root = await withPackageJson({
      devDependencies: { vitest: "^1.0.0" }
    });

    expect(detectTestCommand(root)).toBe("vitest run");
  });

  it("falls back to jest when vitest absent", async () => {
    const root = await withPackageJson({
      devDependencies: { jest: "^29.0.0" }
    });

    expect(detectTestCommand(root)).toBe("jest");
  });

  it("uses node --test when no hints found", async () => {
    const root = await withPackageJson({});

    expect(detectTestCommand(root)).toBe("node --test");
  });

  it("handles missing package.json", () => {
    const root = path.join(os.tmpdir(), "missing-project");

    expect(detectTestCommand(root)).toBe("node --test");
  });
});
