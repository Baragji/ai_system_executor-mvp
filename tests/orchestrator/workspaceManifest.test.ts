import fs from "node:fs/promises";
import path from "node:path";

import { beforeAll, afterAll, describe, it, expect } from "vitest";

import { captureManifest, getManifest } from "../../src/orchestrator/workspaceManifest.js";

const TEST_SESSION = "manifest-test-session";
const TEST_SLUG = "manifest-test-slug";
const OUTPUT_ROOT = path.resolve("output");
const PROJECT_ROOT = path.join(OUTPUT_ROOT, TEST_SLUG);
const MANIFESTS_DIR = path.resolve(".automation", "manifests");

async function ensureSampleWorkspace() {
  await fs.rm(PROJECT_ROOT, { recursive: true, force: true });
  await fs.mkdir(PROJECT_ROOT, { recursive: true });
  await fs.writeFile(path.join(PROJECT_ROOT, "index.ts"), "export const value = 42;", "utf-8");
  await fs.writeFile(path.join(PROJECT_ROOT, "README.md"), "# Sample", "utf-8");
}

describe("workspaceManifest", () => {
  beforeAll(async () => {
    await ensureSampleWorkspace();
    await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(PROJECT_ROOT, { recursive: true, force: true });
    await fs.rm(path.join(MANIFESTS_DIR, `${TEST_SESSION}.json`), { force: true });
  });

  it("captures and retrieves a workspace manifest", async () => {
    const manifest = await captureManifest(TEST_SESSION, TEST_SLUG);
    expect(manifest.sessionId).toBe(TEST_SESSION);
    expect(manifest.projectSlug).toBe(TEST_SLUG);
    expect(manifest.files.length).toBeGreaterThanOrEqual(2);
    expect(manifest.summary.totalFiles).toBe(manifest.files.length);
    expect(manifest.digest).toMatch(/^[A-F0-9]{8,16}$/i);

    const stored = await getManifest(TEST_SESSION);
    expect(stored).not.toBeNull();
    expect(stored?.summary.totalFiles).toBe(manifest.summary.totalFiles);
    expect(stored?.files[0]?.path).toBeDefined();
    expect(stored?.digest).toBe(manifest.digest);
  });
});
