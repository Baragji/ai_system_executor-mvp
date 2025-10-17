import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const langgraphStub = resolve(__dirname, "tests/setup/langgraph-runtime-stub.ts");
const yazlStub = resolve(__dirname, "tests/setup/yazl-stub.ts");
const bullmqStub = resolve(__dirname, "tests/setup/bullmq-stub.ts");
const ioredisStub = resolve(__dirname, "tests/setup/ioredis-stub.ts");
const otelSdkStub = resolve(__dirname, "tests/setup/opentelemetry-sdk-node-stub.ts");
const otelExporterStub = resolve(__dirname, "tests/setup/opentelemetry-exporter-stub.ts");
const otelHttpStub = resolve(__dirname, "tests/setup/opentelemetry-http-stub.ts");
const otelResourcesStub = resolve(__dirname, "tests/setup/opentelemetry-resources-stub.ts");
const otelSemanticStub = resolve(__dirname, "tests/setup/opentelemetry-semantic-stub.ts");

export default defineConfig({
  test: {
    environment: "node",
    maxConcurrency: 1,
    sequence: {
      concurrent: false
    },
    exclude: [
      "tests/fixtures/**",
      "tests/ui/**",
      "ui-tests/**",
      "node_modules/**",
      "output/**"
    ],
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
  },
  resolve: {
    alias: {
      "@langchain/langgraph": langgraphStub,
      yazl: yazlStub,
      bullmq: bullmqStub,
      ioredis: ioredisStub,
      "@opentelemetry/sdk-node": otelSdkStub,
      "@opentelemetry/exporter-trace-otlp-http": otelExporterStub,
      "@opentelemetry/instrumentation-http": otelHttpStub,
      "@opentelemetry/resources": otelResourcesStub,
      "@opentelemetry/semantic-conventions": otelSemanticStub
    }
  }
});
