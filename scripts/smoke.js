#!/usr/bin/env node
/**
 * Smoke test script for AGENTS.md Rule 9 (API/Contract Stability)
 *
 * Usage:
 *   node scripts/smoke.js > .automation/evidence/$TASK/api_smoke.txt
 *
 * Validates critical API endpoints still respond correctly after changes.
 * Exit 0 = all smoke tests pass
 * Exit 1 = smoke test failure
 */

import http from 'http';

const SMOKE_TESTS = [
  { name: 'Health Check', path: '/healthz', expectedStatus: 200 },
  { name: 'Root', path: '/', expectedStatus: 200 },
  { name: 'API Docs', path: '/api-docs', expectedStatus: 200 },
];

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runSmokeTests() {
  console.log(`Smoke Testing API at ${HOST}:${PORT}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');

  let allPassed = true;

  for (const test of SMOKE_TESTS) {
    try {
      const result = await makeRequest(test.path);
      const passed = result.statusCode === test.expectedStatus;

      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${test.name}`);
      console.log(`  Path: ${test.path}`);
      console.log(`  Expected: ${test.expectedStatus}, Got: ${result.statusCode}`);

      if (!passed) {
        console.log(`  Body preview: ${result.body.substring(0, 200)}`);
        allPassed = false;
      }
      console.log('');
    } catch (err) {
      console.log(`[FAIL] ${test.name}`);
      console.log(`  Path: ${test.path}`);
      console.log(`  Error: ${err.message}`);
      console.log('');
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('✓ All smoke tests passed');
    process.exit(0);
  } else {
    console.log('❌ Some smoke tests failed');
    process.exit(1);
  }
}

// Check if server is likely running
console.log('Checking if server is running...');
makeRequest('/healthz')
  .then(() => {
    console.log('Server detected, running smoke tests...\n');
    runSmokeTests();
  })
  .catch((err) => {
    console.error('ERROR: Server not responding. Start server first:');
    console.error('  npm run dev');
    console.error('');
    console.error(`Connection error: ${err.message}`);
    process.exit(1);
  });
