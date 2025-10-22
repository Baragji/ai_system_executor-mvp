import { describe, it, expect } from "vitest";
import { deriveDeterministicSessionId, hashToSeedInt, mulberry32 } from "../../src/orchestrator/replay.js";
import { buildExecutionId } from "../../src/orchestrator/graph.js";

describe("deterministic replay utilities", () => {
  it("derives stable sessionId from prompt+seed", () => {
    const a1 = deriveDeterministicSessionId("hello world", "s1");
    const a2 = deriveDeterministicSessionId("hello world", "s1");
    const b = deriveDeterministicSessionId("hello world!", "s1");
    const c = deriveDeterministicSessionId("hello world", "s2");
    expect(a1).toEqual(a2);
    expect(a1).not.toEqual(b);
    expect(a1).not.toEqual(c);
    expect(a1).toMatch(/^[a-f0-9]{8,24}$/);
  });

  it("mulberry32 produces deterministic values for same seed", () => {
    const seed = hashToSeedInt("prompt", "seed");
    const r1 = mulberry32(seed);
    const r2 = mulberry32(seed);
    const seq1 = [r1(), r1(), r1()].map(v => Number(v.toFixed(6)));
    const seq2 = [r2(), r2(), r2()].map(v => Number(v.toFixed(6)));
    expect(seq1).toEqual(seq2);
  });
});

describe("graph execution id builder", () => {
  it("builds execution id from provided session id when present", () => {
    const eid = buildExecutionId("mysession");
    expect(eid).toBe("graph-mysession");
  });

  it("generates new execution id when session id is omitted", () => {
    const res1 = buildExecutionId();
    const res2 = buildExecutionId();
    expect(res1).not.toEqual(res2);
    expect(res1).toMatch(/^graph-/);
    expect(res2).toMatch(/^graph-/);
  });
});
