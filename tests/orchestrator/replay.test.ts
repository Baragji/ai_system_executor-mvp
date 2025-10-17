import { describe, it, expect } from "vitest";
import { deriveDeterministicSessionId, hashToSeedInt, mulberry32 } from "../../src/orchestrator/replay.js";
import { buildExecutionId, runGraph } from "../../src/orchestrator/graph.js";
import { __test as execStore } from "../../src/orchestrator/executionsStore.js";

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

describe("graph deterministic execution id", () => {
  it("builds execution id from provided session id when present", () => {
    const eid = buildExecutionId("mysession");
    expect(eid).toBe("graph-mysession");
  });

  it("uses deterministic session when requested", async () => {
    execStore.clear();
    const res1 = await runGraph({ prompt: "ping", deterministic: true, seed: "abc" });
    const res2 = await runGraph({ prompt: "ping", deterministic: true, seed: "abc" });
    expect(res1.executionId).toEqual(res2.executionId);
    expect(res1.status).toBe("started");
  });
});
