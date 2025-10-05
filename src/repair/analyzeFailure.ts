import {
  type FailureAnalysis,
  type FailedTestSummary,
  type FailureCategory
} from "../contracts/repairHistoryValidator.js";

const MAX_STACK_LINES = 5;
const MAX_MESSAGE_LENGTH = 1200;

interface FailureBlock {
  name: string;
  messageLines: string[];
  stackLines: string[];
}

// eslint-disable-next-line no-control-regex -- Needed to strip ANSI escape sequences from test output logs.
const ANSI_PATTERN = /\u001B\[[0-9;]*m/g;

function stripAnsi(input: string): string {
  return input.replace(ANSI_PATTERN, "");
}

function clampMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= MAX_MESSAGE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_MESSAGE_LENGTH)}…`;
}

function detectFailureType(block: FailureBlock): Exclude<FailureCategory, "multiple"> {
  const combined = [...block.messageLines, ...block.stackLines]
    .join("\n")
    .toLowerCase();

  if (/syntaxerror|unexpected token|failed to parse|parsing error/.test(combined)) {
    return "syntax";
  }

  if (/timed out|timeout|exceeded timeout|did not finish in time/.test(combined)) {
    return "timeout";
  }

  if (/expect\s*\(|assertionerror|assert\b/.test(combined)) {
    return "assertion";
  }

  return "exception";
}

function finalizeBlock(block: FailureBlock | null, results: FailedTestSummary[]): void {
  if (!block) return;

  const message = clampMessage(block.messageLines.join("\n"));
  const stackSnippet = block.stackLines.slice(0, MAX_STACK_LINES).map(line => line.trim());
  const type = detectFailureType(block);

  results.push({
    name: block.name,
    message,
    stackSnippet,
    type
  });
}

function parseFailureBlocks(testOutput: string): FailedTestSummary[] {
  const lines = stripAnsi(testOutput).split(/\r?\n/);
  const summaries: FailedTestSummary[] = [];
  let current: FailureBlock | null = null;
  let capturingStack = false;

  const pushSyntheticBlock = () => {
    if (!current && lines.some(line => line.includes("Test suite failed to run"))) {
      const messageLines: string[] = [];
      const stackLines: string[] = [];
      for (const raw of lines) {
        const line = raw.trimEnd();
        if (line.trim().startsWith("at ")) {
          if (stackLines.length < MAX_STACK_LINES) {
            stackLines.push(line.trim());
          }
        } else if (line.length > 0) {
          messageLines.push(line.trim());
        }
      }

      summaries.push({
        name: "Test suite failed to run",
        message: clampMessage(messageLines.join("\n")),
        stackSnippet: stackLines,
        type: detectFailureType({
          name: "Test suite failed to run",
          messageLines,
          stackLines
        })
      });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    const failureHeader = trimmed.match(/^●\s+(.+)$/);
    if (failureHeader) {
      const [, name] = failureHeader;
      if (!name) {
        continue;
      }

      finalizeBlock(current, summaries);
      current = {
        name,
        messageLines: [],
        stackLines: []
      };
      capturingStack = false;
      continue;
    }

    if (!current) {
      continue;
    }

    if (trimmed.length === 0) {
      if (!capturingStack) {
        continue;
      }
    }

    if (/^at\s+/.test(trimmed)) {
      capturingStack = true;
      if (current.stackLines.length < MAX_STACK_LINES) {
        current.stackLines.push(trimmed);
      }
      continue;
    }

    if (capturingStack && !/^at\s+/.test(trimmed)) {
      // End of stack trace; treat subsequent lines as additional message context.
      capturingStack = false;
    }

    if (trimmed.length > 0) {
      current.messageLines.push(trimmed);
    }
  }

  finalizeBlock(current, summaries);
  if (summaries.length === 0) {
    pushSyntheticBlock();
  }

  return summaries;
}

function determineOverallCategory(entries: FailedTestSummary[]): FailureCategory {
  const categories = new Set(entries.map(entry => entry.type));
  if (categories.size === 0) {
    return "exception";
  }

  if (categories.size === 1) {
    return categories.values().next().value as FailureCategory;
  }

  return "multiple";
}

export function analyzeFailure(testOutput: string): FailureAnalysis {
  const failedTests = parseFailureBlocks(testOutput);

  return {
    failedTests,
    totalFailed: failedTests.length,
    category: determineOverallCategory(failedTests)
  };
}
