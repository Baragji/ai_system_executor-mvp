# AGENTS.md Contract v1.0

## Metadata
- Version: 1.0.0
- Enforcement: CODEOWNERS-protected
- Last Updated: 2025-10-20
- Line Count: CI MUST verify ≤200
- Purpose: Stop stubs/hardcoded "fake green" by requiring machine evidence per task
- Standards: SSDF SP 800-218 (PS.2/PS.3), SLSA v1.0 (provenance), OWASP ASVS 5.0 (verification)

## Critical Rules (numbered, verifiable)
1. Evidence-Based ONLY
   - No claim without saved, machine-verifiable evidence.

2. Discover Before Act
   - MUST search/read before edits.
   - Cmd: `rg -n "<pattern>" src/ services/ | tee .automation/evidence/$TASK/discovery.txt`
   - HALT if edit touches paths not present in `discovery.txt`.

3. Scope Lock
   - Work ONLY on `Recent_Status.md` task `$TASK`.
   - Commit title must include `[TASK:$TASK]`.
   - HALT on scope drift.

4. Baseline → Change → Final
   - BEFORE: `node scripts/metrics.js --out .automation/evidence/$TASK/baseline.json`
   - AFTER:  `node scripts/metrics.js --out .automation/evidence/$TASK/final.json`
   - HALT if acceptance in `Recent_Status.md` not met.

5. Validation Gates (must pass, in order)
   - `npm run lint   | tee .automation/evidence/$TASK/valid/lint.txt`
   - `npm run typecheck | tee .automation/evidence/$TASK/valid/typecheck.txt`
   - `npm test -- --reporter=json > .automation/evidence/$TASK/valid/tests.json`
   - HALT on any non-zero or missing file.

6. Integrity (Practical SLSA for dev tasks)
   - Hash changed files:
     `git diff --name-only | xargs -r sha256sum > .automation/evidence/$TASK/artifacts.sha256`
   - Verify: `sha256sum -c .automation/evidence/$TASK/artifacts.sha256`
   - HALT if verification fails or list is empty.

7. Lightweight Task Provenance (dev tasks)
   - Create `.automation/evidence/$TASK/task_provenance.json` with:
     `{ "task": "$TASK", "files_modified": [...], "hashes_file": "artifacts.sha256", "tests": "valid/tests.json", "env": "env.txt", "timestamp": ISO8601 }`
   - HALT if any referenced file missing.

8. Environment & Determinism
   - `{ node -v; npm -v; git rev-parse HEAD; } > .automation/evidence/$TASK/env.txt`
   - Record seeds/configs used. HALT if `env.txt` missing.

9. API/Contract Stability
   - Do not break compatibility unless `Recent_Status.md` allows.
   - Provide smoke proof: `node scripts/smoke.js > .automation/evidence/$TASK/api_smoke.txt` when endpoints touched.
   - HALT on unapproved break.

10. Security Baseline (lightweight)
   - `npm audit --omit=dev --json > .automation/evidence/$TASK/audit.json`
   - HALT if high/critical count increases vs baseline.

11. Release Tasks (conditional)
   - If packaging/releasing in this task:
     - Produce `dist/` hashes: `sha256sum dist/** > .automation/evidence/$TASK/SHA256SUMS.txt`
     - Produce SLSA provenance per builder (e.g., Actions): `provenance.json`
     - (Security-relevant only) add `asvs.csv` mapping.
   - HALT if any required artifact missing.
   - Note: Signatures required only at release gates.

12. Line-Cap & Machine-Parseable
   - `wc -l AGENTS.md | tee .automation/evidence/$TASK/agents_linecount.txt`
   - HALT if >200 lines.

## Evidence Directory (required layout)
```
.automation/
  evidence/$TASK/
    discovery.txt
    baseline.json
    final.json
    valid/
      lint.txt
      typecheck.txt
      tests.json
    artifacts.sha256
    task_provenance.json
    audit.json
    api_smoke.txt (if APIs touched)
    env.txt
    summary.md
    (release) SHA256SUMS.txt
    (release) provenance.json
    (optional) asvs.csv
```

## Evidence Checklist (all MUST pass)
- [ ] discovery.txt proves targets exist pre-edit
- [ ] baseline.json & final.json show delta meets acceptance
- [ ] lint/typecheck/tests.json all present; tests exit 0
- [ ] artifacts.sha256 generated and verified
- [ ] task_provenance.json references real files
- [ ] audit.json shows no high/critical increase
- [ ] api_smoke.txt present when endpoints changed
- [ ] env.txt present
- [ ] summary.md links every artifact
- [ ] (release) SHA256SUMS.txt (+ provenance.json)

## HALT Conditions (agent MUST stop, rollback, report)
| Condition | Action | Exit |
|---|---|---|
| Missing discovery/baseline/final | `git restore . ; create HALT_REPORT.md` | 20 |
| Lint/typecheck/tests fail | rollback; attach logs; HALT_REPORT | 21 |
| Acceptance unmet | rollback; propose fix plan | 22 |
| Scope drift | rollback; request approval | 23 |
| Audit worsened | rollback; open security issue | 24 |
| Integrity/provenance missing | rollback; regenerate | 25 |
| AGENTS.md >200 lines | reduce; re-run checks | 27 |

## Validation Snippets (copy/paste; save outputs)
```bash
rg -n "<target>" src/ services/ | tee .automation/evidence/$TASK/discovery.txt
node scripts/metrics.js --out .automation/evidence/$TASK/baseline.json
# implement change
node scripts/metrics.js --out .automation/evidence/$TASK/final.json
npm run lint   | tee .automation/evidence/$TASK/valid/lint.txt
npm run typecheck | tee .automation/evidence/$TASK/valid/typecheck.txt
npm test -- --reporter=json > .automation/evidence/$TASK/valid/tests.json
git diff --name-only | xargs -r sha256sum > .automation/evidence/$TASK/artifacts.sha256
sha256sum -c .automation/evidence/$TASK/artifacts.sha256
{ node -v; npm -v; git rev-parse HEAD; } > .automation/evidence/$TASK/env.txt
wc -l AGENTS.md | tee .automation/evidence/$TASK/agents_linecount.txt
```

## Anti-Patterns (regex-detectable; forbidden)
| Pattern | Regex | Violation |
|---|---|---|
| Path guessing | `(?i)\b(think\|probably\|should be at)\b` | Claims w/o evidence |
| Deep relative import | `(\.\./){3,}` | Fragile structure creep |
| Hardcoded success | `return\s*\{\s*success:\s*true\s*\}` | Fake green |
| TypeScript any | `:\s*any\b` | Type unsafety |
| TODO/FIXME left | `(?i)\bTODO\b\|\bFIXME\b` | Incomplete work |
| Noisy prod log | `src/.*console\.log` | Undisciplined logging |

## PR Template (machine-checkable)
```
[TASK:$TASK] $TITLE
Scope: (from Recent_Status.md)
Summary: what changed, why
Evidence:
- discovery.txt
- baseline.json → final.json (delta OK)
- lint.txt / typecheck.txt / tests.json
- artifacts.sha256 (verified)
- audit.json (no new high/critical)
- api_smoke.txt (if touched)
- (release) SHA256SUMS.txt / provenance.json
Risks/Follow-ups:
```

## References
* SSDF SP 800-218 (PS.2/PS.3 release integrity & archiving).
* SLSA v1.0 (provenance definition & verification).
* OWASP ASVS 5.0 (verification baseline).
