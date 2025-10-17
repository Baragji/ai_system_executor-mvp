import { describe, expect, it } from "vitest";

import { formatWorkspaceSummary } from "../../src/workspace/manifest.js";

describe("formatWorkspaceSummary", () => {
  it("summarizes totals and top files", () => {
    const summary = {
      totalFiles: 3,
      totalSize: 2048,
      topFiles: [
        { path: "src/index.ts", size: 1024, hash: "abcd1234", modified: "2025-10-10T00:00:00.000Z" },
        { path: "README.md", size: 512, hash: "efgh5678", modified: "2025-10-10T00:00:00.000Z" },
        { path: "tests/app.test.ts", size: 512, hash: "ijkl9012", modified: "2025-10-10T00:00:00.000Z" }
      ],
      tree: {}
    };

    const text = formatWorkspaceSummary(summary, { topFileCount: 2 });

    expect(text).toContain("Total files: 3");
    expect(text).toContain("Total size: 2 KB");
    expect(text).toContain("1. src/index.ts (1 KB, hash abcd1234)");
    expect(text).toContain("2. README.md (512 B, hash efgh5678)");
    expect(text).toContain("… 1 more files");
  });

  it("handles empty summaries", () => {
    const summary = {
      totalFiles: 0,
      totalSize: 0,
      topFiles: [],
      tree: {}
    };

    const text = formatWorkspaceSummary(summary);

    expect(text).toContain("Total files: 0");
    expect(text).toContain("Total size: 0 B");
    expect(text).toContain("No files captured in workspace manifest.");
  });
});
