import { describe, expect, it } from "vitest";

import {
  selectStrategy,
  strategyGuidance,
  type RepairStrategy
} from "../../src/repair/strategySelector.js";

const ATTEMPTS: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

describe("selectStrategy", () => {
  const expectations: Record<string, RepairStrategy[]> = {
    syntax: ["syntax_focus", "syntax_focus", "syntax_focus", "syntax_focus"],
    timeout: ["timeout_focus", "timeout_focus", "timeout_focus", "timeout_focus"],
    assertion: [
      "assertion_focus",
      "assertion_focus",
      "multiple_prioritize",
      "multiple_prioritize"
    ],
    exception: [
      "exception_hardening",
      "exception_hardening",
      "exception_hardening",
      "exception_hardening"
    ],
    multiple: [
      "multiple_prioritize",
      "multiple_prioritize",
      "multiple_prioritize",
      "multiple_prioritize"
    ]
  } satisfies Record<string, RepairStrategy[]>;

  for (const [category, sequence] of Object.entries(expectations)) {
    it(`chooses strategy for ${category}`, () => {
      sequence.forEach((strategy, index) => {
        const attempt = ATTEMPTS[index];
        expect(selectStrategy(category as never, attempt)).toBe(strategy);
      });
    });
  }
});

describe("strategyGuidance", () => {
  it("returns readable guidance for each strategy", () => {
    const strategies: RepairStrategy[] = [
      "syntax_focus",
      "timeout_focus",
      "assertion_focus",
      "exception_hardening",
      "multiple_prioritize"
    ];

    for (const strategy of strategies) {
      const guidance = strategyGuidance(strategy);
      expect(guidance).toMatch(/\w+/);
      expect(guidance.length).toBeGreaterThan(40);
    }
  });
});
