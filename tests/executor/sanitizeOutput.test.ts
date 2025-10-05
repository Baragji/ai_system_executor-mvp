import { describe, it, expect } from "vitest";
import { sanitizeExecutorOutput } from "../../src/server.js";

describe("sanitizeExecutorOutput", () => {
  it("drops unknown properties and normalizes leading ./ in file paths", () => {
    const input = {
      project_name: "demo",
      hasTests: true,
      files: [
        { path: "./src/index.ts", contents: "code" },
        { path: "./tests/index.test.ts", contents: "test" }
      ],
      notes: ["n1"],
      extra: { foo: 1 }
    };

    const out = sanitizeExecutorOutput(input) as {
      project_name?: string;
      hasTests?: boolean;
      notes?: string[];
      files?: { path: string; contents: string }[];
      extra?: unknown;
    };
    expect(out.project_name).toBe("demo");
    expect(out.hasTests).toBe(true);
    expect(out.notes).toEqual(["n1"]);
    expect(out.extra).toBeUndefined();
    expect(out.files?.length).toBe(2);
    expect(out.files?.[0]?.path).toBe("src/index.ts");
    expect(out.files?.[1]?.path).toBe("tests/index.test.ts");
  });
});