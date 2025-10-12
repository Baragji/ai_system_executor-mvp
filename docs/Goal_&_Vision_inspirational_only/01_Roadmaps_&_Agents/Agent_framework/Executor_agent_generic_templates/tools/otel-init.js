/**
 * Executor AI OpenTelemetry Initializer
 *
 * This script bootstraps the OpenTelemetry (OTel) SDK for the Executor AI.
 * It configures a simple span processor that writes trace data to a local
 * NDJSON (Newline Delimited JSON) file. This provides an essential,
- * machine-readable log of the AI's operations for metrics calculation,
 * debugging, and auditing.
 *
 * It is required by the AI's system prompt to ensure observability by default.
 */
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
const fs = require('fs');
const path = require('path');

// Set up a logger for OTel's internal diagnostics
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

// --- Configuration ---
const LOGS_DIR = path.resolve(__dirname, '..', 'logs');
const SPANS_FILE = path.join(LOGS_DIR, 'otel-spans.ndjson');
// ---

/**
 * A custom OpenTelemetry exporter that writes spans to a local file.
 */
class NDJSONFileExporter {
  constructor(filePath) {
    this.filePath = filePath;
    // Ensure the log directory exists
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  export(spans, resultCallback) {
    const lines = spans.map(s => JSON.stringify({
      name: s.name,
      traceId: s.spanContext().traceId,
      spanId: s.spanContext().spanId,
      parentSpanId: s.parentSpanId,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      attributes: s.attributes,
      status: s.status,
    })).join('\n') + '\n';

    fs.appendFile(this.filePath, lines, (err) => {
      if (err) {
        return resultCallback({ code: 1, error: err });
      }
      resultCallback({ code: 0 });
    });
  }

  shutdown() {
    // No-op for file-based exporter
    return Promise.resolve();
  }
}

const sdk = new NodeSDK({
  // Configure the tracer provider
  traceExporter: new NDJSONFileExporter(SPANS_FILE),
});

// Add a simple span processor
sdk.configureTracerProvider((tp) => {
  tp.addSpanProcessor(new SimpleSpanProcessor(new NDJSONFileExporter(SPANS_FILE)));
});

// Start the SDK
sdk.start();

console.log('OpenTelemetry SDK initialized. Spans will be written to:', SPANS_FILE);

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
