import { describe, expect, it } from "vitest";

import { analyzeFailure } from "../../src/repair/analyzeFailure.js";

const wrapLog = (content: string): string => content
  .split("\n")
  .map(line => line.trimEnd())
  .join("\n");

describe("analyzeFailure", () => {
  it("extracts assertion failures with message and stack", () => {
    const log = wrapLog(`
      FAIL  src/math.test.ts > math operations
        ● math operations › adds numbers

          expect(received).toBe(expected) // Object.is equality

          Expected: 4
          Received: 5

          at Object.<anonymous> (src/math.ts:10:11)
          at runTest (node_modules/vitest/dist/index.js:100:10)

      Tests:       1 failed, 1 total
      `);

    const result = analyzeFailure(log);

    expect(result.totalFailed).toBe(1);
    expect(result.category).toBe("assertion");
    expect(result.failedTests[0]).toMatchObject({
      name: "math operations › adds numbers",
      type: "assertion"
    });
    expect(result.failedTests[0].stackSnippet.length).toBeGreaterThan(0);
  });

  it("identifies exception failures", () => {
    const log = wrapLog(`
      FAIL  src/user.test.ts > user module
        ● user module › loads profile

          TypeError: Cannot read properties of undefined (reading 'profile')
              at Object.loadProfile (src/user.ts:42:17)
              at runTest (node_modules/vitest/dist/index.js:100:10)

      Tests:       1 failed, 1 total
      `);

    const result = analyzeFailure(log);

    expect(result.category).toBe("exception");
    expect(result.failedTests[0].type).toBe("exception");
    expect(result.failedTests[0].message).toContain("TypeError");
  });

  it("detects timeout failures", () => {
    const log = wrapLog(`
      FAIL  src/timeout.test.ts > long running suite
        ● long running suite › waits for event

          Error: Exceeded timeout of 5000 ms for a test.
              at Timeout._onTimeout (src/timeout.test.ts:20:15)
              at listOnTimeout (node:internal/timers:575:11)
              at processTimers (node:internal/timers:514:7)

      Tests:       1 failed, 1 total
      `);

    const result = analyzeFailure(log);

    expect(result.category).toBe("timeout");
    expect(result.failedTests[0].type).toBe("timeout");
  });

  it("returns multiple category when failures differ", () => {
    const log = wrapLog(`
      FAIL  src/multi.test.ts > multi failure suite
        ● multi failure suite › assertion case

          expect(received).toEqual(expected)

          Expected: 2
          Received: 3

          at Object.<anonymous> (src/multi.ts:12:5)

        ● multi failure suite › exception case

          ReferenceError: value is not defined
              at Object.<anonymous> (src/multi.ts:30:5)

      Tests:       2 failed, 2 total
      `);

    const result = analyzeFailure(log);

    expect(result.totalFailed).toBe(2);
    expect(result.category).toBe("multiple");
    const categories = new Set(result.failedTests.map(test => test.type));
    expect(categories.size).toBe(2);
  });

  it("truncates stack traces to five lines", () => {
    const log = wrapLog(`
      FAIL  src/stack.test.ts > stack suite
        ● stack suite › deep stack

          Error: Something broke
              at level1 (stack.ts:10:1)
              at level2 (stack.ts:20:1)
              at level3 (stack.ts:30:1)
              at level4 (stack.ts:40:1)
              at level5 (stack.ts:50:1)
              at level6 (stack.ts:60:1)
              at level7 (stack.ts:70:1)

      Tests:       1 failed, 1 total
      `);

    const result = analyzeFailure(log);
    expect(result.failedTests[0].stackSnippet).toHaveLength(5);
    expect(result.failedTests[0].stackSnippet[4]).toContain("level5");
    expect(result.failedTests[0].stackSnippet.join("\n")).not.toContain("level6");
  });

  it("keeps output concise", () => {
    const verboseMessage = Array.from({ length: 200 }, (_, index) => `Line ${index}`).join("\n");
    const log = wrapLog(`
      FAIL  src/verbose.test.ts > verbose suite
        ● verbose suite › noisy test

          ${verboseMessage}
              at noisy (src/verbose.ts:10:1)
              at runner (node:internal/modules/cjs:100:10)

      Tests:       1 failed, 1 total
      `);

    const result = analyzeFailure(log);
    const messageLength = result.failedTests[0].message.length;

    expect(messageLength).toBeLessThanOrEqual(1201);
  });

  it("summarizes suite-level failures when no individual tests are reported", () => {
    const log = wrapLog(`
      FAIL  src/setup.test.ts > suite setup
        Test suite failed to run

      ReferenceError: beforeAll is not defined
          at Object.<anonymous> (src/setup.ts:3:1)
          at runTest (node_modules/vitest/dist/index.js:100:10)

      Tests:       0 total
      `);

    const result = analyzeFailure(log);

    expect(result.totalFailed).toBe(1);
    expect(result.failedTests[0].name).toContain("Test suite failed to run");
    expect(result.failedTests[0].stackSnippet.length).toBeGreaterThan(0);
  });
});
