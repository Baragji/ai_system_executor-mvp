Short answer: the patch implements exactly what we asked—👍 to merge after one sanity check. Here’s my review and the single tweak I’d like you to validate before we call it done.

# Review of the patch (what changed & why)

## ✅ Fix 1: Auto-update “opt-out by default”

* `scripts/update-gate.js`

  * Replaces truthy-only parsing with explicit **opt-out** parsing:

    * `isAutoUpdateEnabled()` now **returns true** when `GATE_AUTO_UPDATE` is **unset/blank** and **false** only for `0|false|off|no` (any case). Good.
  * CLI help/error strings updated to match the new semantics. Good.
* `tests/scripts/update-gate.test.ts`

  * Adds cases for unset/blank/truey/falsey values. Good.
  * “disabled” test now uses `"false"` (not empty) — matches new semantics. Good.
* `scripts/gate-auto-update.js`

  * Log banner text updated to “opt-out detected”. Good.

## ✅ Fix 2: G3 aggregation always prefers real curl

* `scripts/detect-evidence.js`

  * Adds `shouldSelectCandidate()` precedence: **prefer `source:"aggregated"` over direct** parity-test matches; fall back to newer timestamp. This is the right, non-flaky rule.
  * Aggregated record’s `command` is the **curl** from the `/api/execute` entry (no placeholders). Good.
  * Adds `detectEvidenceForEntryWithContext()` helper (loads recent history). Good.
* `tests/scripts/detect-evidence.test.ts`

  * New tests cover: parity-only, curl+test (both orders), **tied timestamps**, and “curl wins” with `source:"aggregated"`. Excellent.

## ⚠️ Ledger edit included

* `.automation/GATES_LEDGER.md`

  * Flips the G3 “POST /api/execute …” bullet to ✅ and adds a **manual** evidence line with a curl.
  * This is okay **only if** a real split run was performed. Otherwise, it slightly undermines the “automation wrote this” proof.
  * Not a blocker, but I recommend validating with a fresh run and letting the tool append an evidence line as well (see “Final validation” below).

# Verdict

**Approve** the patch as-is (functionally correct, tests in place).
**One action** to fully close the loop: run the final end-to-end proof so we know the detector + auto-update write the **curl** to the ledger with the flag **unset**.

# Final validation (please run these; paste outputs)

> Use a clean shell so the env var is truly unset.

```bash
# From repo root
git status

# 1) Unit & type checks (should all pass)
npm run lint
npm run typecheck
npm test
node scripts/check-detector-constants.js

# 2) Start server (Terminal A)
npm start

# 3) Produce split evidence (Terminal B then C)
# B: real curl to /api/execute
curl -sfS -X POST http://localhost:3000/api/execute \
  -H 'content-type: application/json' \
  -d '{"input":"ping"}'

# C: run the parity test separately
AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts

# 4) Confirm detector prefers curl
node scripts/detect-evidence.js --json | jq '.evidence[] | select(.gate=="G3")'

# Expect: the G3 record’s "command" starts with curl ... /api/execute
# (NOT the npm test command)

# 5) Prove auto-update is ON by default (no env var)
unset GATE_AUTO_UPDATE        # (zsh/bash)
npm run state:next

# 6) Show ledger diff
git --no-pager diff .automation/GATES_LEDGER.md

# Expect: a new appended evidence line (if your manual line already exists,
# expect an additional run with a new timestamp), and NO “auto-update disabled” banner.
```

If all the above match expectations (curl appears in detector output; ledger writes with env unset), then **all work is done** and we can merge.

# Notes on the ledger change

If you want the ledger to be 100% “automation-authored,” you can revert the manual evidence line and re-run step 5 to let the tool append it. Not required, but slightly cleaner provenance.

---

If anything in the final validation doesn’t match (e.g., detector still shows the test command, or ledger refuses to write with the flag unset), STOP and send me:

* The exact terminal commands you ran,
* The JSON from `detect-evidence.js`,
* The console output from `npm run state:next`,
* The before/after snippet of `.automation/GATES_LEDGER.md`.

Otherwise: ✅ approved. Merge when green.
