#!/usr/bin/env node

/**
 * Capture a real OpenTelemetry trace from the executor service
 * Used to generate genuine evidence for Gate G2
 *
 * Usage: OTEL_ENABLED=1 node scripts/capture-otel-trace.js
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const OTLP_PORT = 4318;
const SERVER_PORT = 3334 + Math.floor(Math.random() * 100);  // Random port to avoid conflicts
const OUTPUT_FILE = '.automation/evidence/G2/otel_trace_export.json';

// In-memory trace storage
const traces = [];

/**
 * Simple OTLP HTTP receiver
 */
async function startOTLPReceiver() {
  const { createServer } = await import('http');

  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/v1/traces') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const trace = JSON.parse(body);
          traces.push(trace);
          console.log(`[OTLP] Received trace with ${trace.resourceSpans?.length || 0} resourceSpans`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ partialSuccess: {} }));
        } catch (error) {
          console.error('[OTLP] Failed to parse trace:', error.message);
          res.writeHead(400);
          res.end();
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return new Promise((resolve) => {
    server.listen(OTLP_PORT, () => {
      console.log(`[OTLP] Receiver listening on http://localhost:${OTLP_PORT}`);
      resolve(server);
    });
  });
}

/**
 * Start the executor server with OTel enabled
 */
function startExecutorServer() {
  console.log('[Server] Starting executor with OTEL_ENABLED=1...');

  const server = spawn('node', ['dist/server.js'], {
    env: {
      ...process.env,
      OTEL_ENABLED: '1',
      OTEL_EXPORTER_OTLP_ENDPOINT: `http://localhost:${OTLP_PORT}/v1/traces`,
      PORT: SERVER_PORT.toString(),
      NODE_ENV: 'development',
    },
    stdio: 'pipe',
  });

  server.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
  });

  return server;
}

/**
 * Make a test request to generate trace data
 */
async function makeTestRequest() {
  console.log('[Test] Waiting 2s for server to start...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`[Test] Making HTTP request to http://localhost:${SERVER_PORT}/healthz`);

  try {
    const response = await fetch(`http://localhost:${SERVER_PORT}/healthz`);
    const data = await response.text();
    console.log(`[Test] Response: ${response.status} ${data}`);
  } catch (error) {
    console.error(`[Test] Request failed: ${error.message}`);
  }

  // Wait for trace to be exported
  console.log('[Test] Waiting 2s for trace export...');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Main execution
 */
async function main() {
  if (!process.env.OTEL_ENABLED) {
    console.error('ERROR: OTEL_ENABLED must be set to 1');
    console.error('Usage: OTEL_ENABLED=1 node scripts/capture-otel-trace.js');
    process.exit(1);
  }

  console.log('[Capture] Starting OTel trace capture...');

  // Start OTLP receiver
  const otlpServer = await startOTLPReceiver();

  // Start executor server
  const executorServer = startExecutorServer();

  try {
    // Make test request
    await makeTestRequest();

    // Check if we captured traces
    if (traces.length === 0) {
      console.error('[Capture] No traces captured!');
      process.exit(1);
    }

    // Save first trace
    const trace = traces[0];
    mkdirSync('.automation/evidence/G2', { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(trace, null, 2), 'utf-8');

    console.log(`[Capture] ✅ Trace saved to ${OUTPUT_FILE}`);
    console.log(`[Capture] Resource spans: ${trace.resourceSpans?.length || 0}`);

    if (trace.resourceSpans && trace.resourceSpans[0]) {
      const attrs = trace.resourceSpans[0].resource?.attributes || [];
      console.log(`[Capture] Resource attributes: ${attrs.length}`);
      attrs.forEach(attr => {
        const value = attr.value.stringValue || attr.value.intValue || attr.value;
        console.log(`[Capture]   - ${attr.key}: ${value}`);
      });
    }

    process.exit(0);
  } finally {
    // Cleanup
    console.log('[Cleanup] Shutting down servers...');
    executorServer.kill('SIGTERM');
    otlpServer.close();
  }
}

main().catch(error => {
  console.error('[Fatal]', error);
  process.exit(1);
});
