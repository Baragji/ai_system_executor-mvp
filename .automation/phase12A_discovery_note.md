# Discovery Note – S2 Repair Retry

- Integration points:
  - src/repair/multiTurnRepair.ts: applyArtifacts() (throws on missing contents) and multiTurnRepair() main loop.
- Change:
  - Wrap applyArtifacts with a single retry path. On error message containing "Missing contents for ", re-ask LLM with strict instruction to include full file contents for add/modify artifacts and re-apply. Otherwise rethrow.
- Risk:
  - Slightly longer single attempt when malformed payload returned. Bound to one retry only to avoid loops.
- Compliance:
  - No new dependencies, pure TS/JS. Backend-only change. Matches ai-stack.json.
