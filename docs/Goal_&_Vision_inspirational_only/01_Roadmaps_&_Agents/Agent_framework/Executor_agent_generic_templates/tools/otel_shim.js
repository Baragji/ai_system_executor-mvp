// Node OTel quick init: write spans to NDJSON file for CI metrics
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const fs = require('fs');
const path = require('path');

class NDJSONFileExporter {
  constructor(outPath) { this.out = outPath; fs.mkdirSync(path.dirname(outPath), { recursive: true }); }
  export(spans, cb) {
    const lines = spans.map(s => JSON.stringify({
      name: s.name, traceId: s.spanContext().traceId, spanId: s.spanContext().spanId,
      parentSpanId: s.parentSpanId, startTime: s.startTime, endTime: s.endTime,
      attributes: s.attributes
    })).join('\n') + '\n';
    fs.appendFile(this.out, lines, () => cb({ code: 0 }));
  }
  shutdown() { return Promise.resolve(); }
}
const sdk = new NodeSDK();
sdk.configureTracerProvider((tp) => {
  tp.addSpanProcessor(new SimpleSpanProcessor(new NDJSONFileExporter(
    'Ai_Dev_frameworks/Executor_AI/logs/otel-spans.ndjson'
  )));
});
sdk.start();
