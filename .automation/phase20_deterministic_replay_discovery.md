# Phase 20 — Deterministic Replay Discovery Note

Date: 2025-10-17

## Integration Points

- src/server.ts
  - POST /api/execute at ~line 1555
  - Added deterministic handling and seed extraction; sessionId now derived via `deriveDeterministicSessionId()` when `deterministic: true`.
  - Snippet:
    - `const deterministic = req.body?.deterministic === true;`
    - `const seedRaw = typeof req.body?.seed === "string" ? req.body.seed.trim() : "";`
    - `const sessionId = providedSessionId || (deterministic ? deriveDeterministicSessionId(String(req.body?.prompt ?? ""), seed) : randomUUID());`

- src/orchestrator/graph.ts
  - `runGraph(args)` updated to derive deterministic session for executionId when `args.deterministic` is true.
  - Adds seeded `deterministicSample` in stub result for verifiable replay.

- src/orchestrator/replay.ts (new)
  - `deriveDeterministicSessionId(prompt, seed)` → stable session IDs
  - `hashToSeedInt()` and `mulberry32()` → seeded RNG for deterministic samples

## Dependencies & Impacts

- No new external dependencies added; pure Node.js crypto and math.
- Public API backward compatible: optional fields `deterministic` and `seed` are additive.
- Feature flags unchanged.

## Compliance Check (ai-stack.json)

- Language: TypeScript ✅
- No Python ✅
- No new frameworks ✅
- Tests added (Vitest) ✅

## Justification

Deterministic replay is a G3 acceptance criterion. By deriving sessionId from prompt+seed, we ensure consistent `executionId` and reproducible traces without changing existing flows. The LangGraph path uses the same derivation to maintain parity.
