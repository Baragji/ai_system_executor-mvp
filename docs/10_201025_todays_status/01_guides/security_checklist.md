% Security Checklist for Proxies

Apply this checklist to every proxy-related batch (7x–10x). Keep sensitive data safe and minimize exposure.

Checklist:
- [ ] Do not log secrets or full payloads containing secrets
- [ ] Validate inputs before forwarding (schema or guards)
- [ ] Enforce timeouts and retries with sane limits
- [ ] Sanitize error messages returned to clients (no internals)
- [ ] Ensure feature flags default to OFF
- [ ] Confirm no PII leakage in logs or errors
- [ ] Restrict external calls in unit tests; use mocks
- [ ] Document required env vars, including secret handling guidance

References:
- Batches plan: `docs/10_201025_todays_status/00_core/batches_plan.md`
- Rollback: `docs/10_201025_todays_status/08_rollback_triggers.md`

