# Phase 1 Orchestrator Extraction Status

## Summary
- Introduced dedicated orchestrator state modules (`sessionStore`, `stateMapper`, `ttl`, `progress`, `normalizers`) to remove the in-memory orchestration bookkeeping from `src/server.ts` while preserving behaviour.
- Updated the monolith to consume these extracted helpers and kept the `SERVICES_SPLIT` flag in a local-only mode pending HTTP client integration.
- Confirmed lint, typecheck, build, and test gates remain green (498 passing, 3 skipped) after the refactor.

## Pending Actions
1. Build the standalone `services/orchestrator/` package and HTTP client to honour `SERVICES_SPLIT=1` per the microservice plan.
2. Add service-level contract, feature-flag parity, and rollback tests once the remote client exists.
3. Capture post-extraction evidence (sbom/provenance deltas, parity proof) once the remote service path is wired.

## Evidence Collected This Session

- Pre-existing discovery artefacts under `.automation/phase1_discovery.*` remain unchanged.
- New orchestrator helper modules now live under `src/orchestrator/` and are exercised by the existing unit/integration suite (see `RUN_REAL_LLM=0 npm -s test`).
- Validation commands executed this session:
  - `npm run -s lint`
  - `npm run -s typecheck`
  - `RUN_REAL_LLM=0 npm -s test`
  - `npm run build`

## Notes
- The feature flag currently logs when `SERVICES_SPLIT=1` because remote wiring is not yet implemented; behaviour still matches the monolith path.
- Follow-on work must respect the zero-regression mandate outlined in `microservice_refactor_plan_v1.md` when introducing the HTTP client.
