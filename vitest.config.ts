import { defineConfig } from "vitest/config";

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
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80
      },
      include: ["src/contracts/**/*.ts", "src/runner/**/*.ts", "src/utils/**/*.ts"],
      exclude: [
        "public/**"
      ]
    }
  }
});
