import fs from "node:fs/promises";
import path from "node:path";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { fsTools } from "../../../src/llm/tools/fsTools.js";
import type { ToolExecutionContext } from "../../../src/llm/types.js";

const TEST_SLUG = "fs-tools-test";
const OUTPUT_ROOT = path.resolve("output");
const PROJECT_ROOT = path.join(OUTPUT_ROOT, TEST_SLUG);

async function writeFile(relPath: string, contents: string) {
  const absolute = path.join(PROJECT_ROOT, relPath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, contents, "utf-8");
}

describe("fsTools", () => {
  const context: ToolExecutionContext = { projectSlug: TEST_SLUG };

  beforeAll(async () => {
    await fs.rm(PROJECT_ROOT, { recursive: true, force: true });
    await writeFile("README.md", "hello world");
    await writeFile("nested/info.txt", "nested content");
    await writeFile("nested/big.txt", "x".repeat(100));
  });

  afterAll(async () => {
    await fs.rm(PROJECT_ROOT, { recursive: true, force: true });
  });

  it("lists directory entries", async () => {
    const result = await fsTools.listDirectory.execute({ path: "." }, context);
    const names = result.entries.map(entry => entry.name).sort();
    expect(names).toContain("README.md");
    expect(names).toContain("nested");
  });

  it("reads file contents with truncation metadata", async () => {
    const output = await fsTools.readFile.execute({ path: "nested/big.txt", maxBytes: 10 }, context);
    expect(output.path).toBe("nested/big.txt");
    expect(output.content.length).toBe(10);
    expect(output.truncated).toBe(true);
    expect(output.hash).toHaveLength(16);
  });

  it("rejects paths outside the workspace", async () => {
    await expect(
      fsTools.readFile.execute({ path: "../outside.txt" }, context)
    ).rejects.toThrow("Path outside project workspace");
  });

  it("summarizes the workspace", async () => {
    const summary = await fsTools.workspaceSummary.execute({}, context);
    expect(summary.project).toBe(TEST_SLUG);
    expect(summary.totalFiles).toBe(3);
    expect(Array.isArray(summary.topFiles)).toBe(true);
    expect(summary.tree).toBeTruthy();
  });
});
