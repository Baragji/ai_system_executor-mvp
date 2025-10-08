import { defineConfig } from "vitest/config";

const minLines = Number(process.env.VITEST_MIN_LINES ?? "80");
const minBranches = Number(process.env.VITEST_MIN_BRANCHES ?? "75");
const minFunctions = Number(process.env.VITEST_MIN_FUNCTIONS ?? "80");
const minStatements = Number(process.env.VITEST_MIN_STATEMENTS ?? "80");

const isFocusedRun = process.argv.some(arg => {
  return arg === "--run" || /\.test\.(t|j)sx?$/.test(arg);
});

const thresholds = isFocusedRun
  ? { lines: 0, branches: 0, functions: 0, statements: 0 }
  : {
      lines: minLines,
      branches: minBranches,
      functions: minFunctions,
      statements: minStatements
    };

export default defineConfig({
  test: {
    environment: "node",
    maxConcurrency: 1,
    sequence: {
      concurrent: false
    },
    exclude: ["tests/fixtures/**", "tests/ui/**", "node_modules/**", "output/**"],
    exclude: ["tests/fixtures/**", "node_modules/**", "output/**", "ui-tests/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html"],
      thresholds,
      include: ["src/contracts/**/*.ts", "src/runner/**/*.ts", "src/utils/**/*.ts"],
      exclude: [
        "public/**",
        "src/runner/runUIValidation.ts"
      ]
    }
  }
});
