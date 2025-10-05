import { describe, expect, it } from "vitest";

import { generateDiff } from "../../src/repair/generateDiff.js";

describe("generateDiff", () => {
  it("marks a small change as minor and counts additions/removals", () => {
    const original = [
      "function add(a, b) {",
      "  return a + b;",
      "}",
      ""
    ].join("\n");

    const updated = [
      "function add(a, b) {",
      "  // Ensure rounding",
      "  return Math.round(a + b);",
      "}",
      ""
    ].join("\n");

    const diff = generateDiff(original, updated, "src/math.ts");

    expect(diff.file).toBe("src/math.ts");
    expect(diff.linesAdded).toBe(2);
    expect(diff.linesRemoved).toBe(1);
    expect(diff.isMinor).toBe(true);
    expect(diff.diffText).toContain("@@");
    expect(diff.diffText).toContain("function add(a, b) {");
  });

  it("classifies medium changes correctly", () => {
    const original = Array.from({ length: 20 }, (_, index) => `line ${index}`).join("\n");
    const updated = Array.from({ length: 20 }, (_, index) => `line ${index} updated`).join("\n");

    const diff = generateDiff(original, updated, "src/medium.ts");

    expect(diff.linesAdded).toBe(20);
    expect(diff.linesRemoved).toBe(20);
    expect(diff.isMinor).toBe(false);
  });

  it("handles large changes over twenty lines", () => {
    const original = Array.from({ length: 40 }, (_, index) => `alpha ${index}`).join("\n");
    const updated = [
      ...Array.from({ length: 10 }, (_, index) => `alpha ${index}`),
      ...Array.from({ length: 25 }, (_, index) => `beta ${index}`),
      ...Array.from({ length: 5 }, (_, index) => `omega ${index}`)
    ].join("\n");

    const diff = generateDiff(original, updated, "src/large.ts");

    expect(diff.linesAdded).toBeGreaterThan(20);
    expect(diff.linesRemoved).toBeGreaterThan(0);
    expect(diff.isMinor).toBe(false);
    const contextMatches = diff.diffText.match(/@@/g) ?? [];
    expect(contextMatches.length).toBeGreaterThan(0);
  });
});
