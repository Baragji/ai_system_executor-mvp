import { defineConfig } from "vitest/config";

const minLines = Number(process.env.VITEST_MIN_LINES ?? "80");
const minBranches = Number(process.env.VITEST_MIN_BRANCHES ?? "75");
const minFunctions = Number(process.env.VITEST_MIN_FUNCTIONS ?? "80");
const minStatements = Number(process.env.VITEST_MIN_STATEMENTS ?? "80");

export default defineConfig({
  test: {
    environment: "node",
    maxConcurrency: 1,
    sequence: {
      concurrent: false
    },
    exclude: ["tests/fixtures/**", "node_modules/**", "output/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html"],
      thresholds: {
        lines: minLines,
        branches: minBranches,
        functions: minFunctions,
        statements: minStatements
      },
      include: ["src/contracts/**/*.ts", "src/runner/**/*.ts", "src/utils/**/*.ts"],
      exclude: [
        "public/**"
      ]
    }
  }
});
