import { createHash } from "node:crypto";

/**
 * Derive a deterministic sessionId from prompt + seed.
 * - Stable across runs for same inputs
 * - Safe characters only, length-limited for readability
 */
export function deriveDeterministicSessionId(prompt: string, seed: string, maxLen = 24): string {
  const normalizedPrompt = (prompt ?? "").trim();
  const normalizedSeed = (seed ?? "").trim();
  const basis = `${normalizedPrompt}\n--seed--\n${normalizedSeed}`;
  const hex = createHash("sha256").update(basis).digest("hex");
  // Keep it compact but collision-resistant enough for our purposes
  const slug = hex.slice(0, Math.max(8, Math.min(maxLen, hex.length))).toLowerCase();
  return slug;
}

/**
 * Simple seeded PRNG (mulberry32) for deterministic faux steps/traces if needed.
 * Not cryptographically secure; suitable for unit tests and reproducible traces.
 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashToSeedInt(prompt: string, seed: string): number {
  const hex = createHash("sha256").update(`${prompt}\n--seed--\n${seed}`).digest("hex");
  // Use lower 32 bits; parse as base16; ensure non-zero
  const low32 = parseInt(hex.slice(-8), 16) >>> 0;
  return low32 === 0 ? 0xA5A5A5A5 : low32;
}
