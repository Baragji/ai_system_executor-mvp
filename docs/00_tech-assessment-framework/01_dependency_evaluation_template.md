# Dependency Evaluation - [Package Name]

**Date:** [YYYY-MM-DD]  
**Evaluator:** [Name/Role]  
**Phase:** [Current Phase Number]

---

## Package Information

- **Package Name:** `[npm package name]`
- **Version:** [Proposed version with rationale for pinning]
- **Repository:** [GitHub URL]
- **License:** [License type - must be compatible with project]
- **Weekly Downloads:** [npm downloads]
- **Last Updated:** [Date from npm]
- **TypeScript Support:** ✅/❌ [Native, @types, or none]

---

## Use Case & Justification

### Problem Statement
[Describe the specific problem this dependency solves. Be concrete and measurable.]

**Current Pain Points:**
1. [Pain point 1 with metric if available]
2. [Pain point 2 with metric if available]
3. [Pain point 3 with metric if available]

### Why Existing Solutions Don't Work
[Explain what you've tried from current stack and why it's insufficient]

- **Option 1: [Native approach]** - [Why insufficient]
- **Option 2: [Existing dependency]** - [Why insufficient]
- **Option 3: [Custom implementation]** - [Why insufficient]

### Expected Benefits
- **Quantifiable Impact:** [e.g., "Reduce code by 200 LOC", "Improve performance by 30%"]
- **Development Velocity:** [Time saved per feature/fix]
- **Maintenance:** [Reduced cognitive load, bug reduction]

---

## Scoring Matrix

| Criterion | Weight | Score (0-5) | Weighted | Justification |
|-----------|--------|-------------|----------|---------------|
| **Business Value** | 3x | _____ | _____ | [Explain impact on product/users] |
| **Technical Maturity** | 2x | _____ | _____ | [Production deployments, version stability] |
| **Team Expertise** | 1x | _____ | _____ | [Learning curve, team familiarity] |
| **Maintainability Impact** | 2x | _____ | _____ | [Code reduction, complexity change] |
| **Security/Compliance** | 3x | _____ | _____ | [CVEs, audit trail, Fortune 500 usage] |
| **Ecosystem Fit** | 2x | _____ | _____ | [Stack alignment, TypeScript quality] |
| **TOTAL** | **13x** | — | **_____** | — |

**Weighted Score Formula:** `(Business*3 + Technical*2 + Team*1 + Maintainability*2 + Security*3 + Ecosystem*2) / 13`

### Scoring Guide (0-5 Scale)

**5 - Exceptional**
- Industry best practice, proven at Fortune 500 scale
- Zero known CVEs, active maintenance, >1M weekly downloads
- Native TypeScript, comprehensive docs, large community

**4 - Strong**
- Production-ready with verified enterprise adoption
- Few minor CVEs (all patched), regular maintenance
- Good TypeScript support, solid documentation

**3 - Adequate**
- Mature but not dominant in ecosystem
- Some security concerns but manageable
- Community types available, basic documentation

**2 - Weak**
- Experimental or niche usage
- Security concerns or irregular maintenance
- Poor TypeScript support or documentation

**1 - Poor**
- Unstable, breaking changes common
- Known security issues, unmaintained
- No TypeScript support, sparse documentation

**0 - Unacceptable**
- Violates stack constraints (forbidden languages, frameworks)
- Critical unpatched CVEs, abandoned project
- Incompatible license, no documentation

---

## Security Assessment

### CVE Analysis
- **Known CVEs:** [Check npm audit, GitHub Security, Snyk]
  - Critical: _____
  - High: _____
  - Medium: _____
  - Low: _____
- **Remediation:** [For each CVE, note fix version or mitigation]

### Supply Chain Risk
- **Dependency Tree Depth:** [Check with `npm ls --depth=1`]
- **Transitive Dependencies:** _____ (fewer is better)
- **Maintenance Activity:**
  - Last commit: _____
  - Open issues: _____
  - Open PRs: _____
  - Response time: _____ (maintainer responsiveness)

### License Compatibility
- **License Type:** [MIT, Apache 2.0, etc.]
- **Compatible with Project:** ✅/❌
- **Attribution Required:** ✅/❌
- **Copyleft Risk:** ✅/❌

---

## Technical Assessment

### Bundle Size Impact
- **Minified:** _____ KB
- **Gzipped:** _____ KB
- **Tree-shakeable:** ✅/❌
- **Acceptable:** ✅/❌ (<50KB preferred, <100KB acceptable)

### TypeScript Quality
- **Native TypeScript:** ✅/❌
- **Type Definitions:** [Bundled / @types / None]
- **Type Coverage:** [Check with `tsc --noEmit`]
- **Generic Support:** ✅/❌
- **Documentation Quality:** [1-5 rating]

### API Design
- **Consistency:** [Matches existing patterns? ✅/❌]
- **Complexity:** [Simple / Medium / Complex]
- **Learning Curve:** [Hours/days to proficiency]
- **Breaking Changes:** [Frequency in semver history]

### Performance
- **Runtime Overhead:** [Benchmark if performance-critical]
- **Memory Usage:** [Check if applicable]
- **Startup Time:** [Synchronous imports impact]

---

## Alternatives Considered

### Alternative 1: [Name]
- **Pros:** [List advantages]
- **Cons:** [List disadvantages]
- **Score:** _____ / 5
- **Why Not Chosen:** [Explanation]

### Alternative 2: [Name]
- **Pros:** [List advantages]
- **Cons:** [List disadvantages]
- **Score:** _____ / 5
- **Why Not Chosen:** [Explanation]

### Alternative 3: Custom Implementation
- **Effort Estimate:** _____ hours/days
- **Maintenance Burden:** [Ongoing hours per month]
- **Why Not Chosen:** [Explanation]

---

## Decision

**Weighted Score:** _____ / 5

### Decision Thresholds
- **≥4.0:** ✅ **PILOT** (Proceed with feature-flagged integration)
- **3.0-3.9:** ⏸️ **DEFER** (Document in backlog, reassess in [X] phases)
- **<3.0:** ❌ **REJECT** (Do not add to project)

**Final Decision:** ✅ PILOT / ⏸️ DEFER / ❌ REJECT

**Rationale:**
[Explain decision based on scoring matrix and qualitative factors]

---

## If PILOT: Integration Plan

### Feature Flag
- **Flag Name:** `USE_[PACKAGE_NAME_UPPERCASE]`
- **Default Value:** `false` (disabled by default)
- **Scope:** [Which modules/features affected]

### Integration Steps

1. **Install & Configure (Day 1)**
   - [ ] Add to `package.json` dependencies
   - [ ] Pin exact version (no `^` or `~` ranges)
   - [ ] Update lockfile
   - [ ] Configure if needed (config file, env vars)

2. **Implement Behind Feature Flag (Day 2-3)**
   - [ ] Create wrapper module in `src/[domain]/[package-name].ts`
   - [ ] Add feature flag check
   - [ ] Implement fallback to existing solution
   - [ ] Add integration tests

3. **Documentation (Day 4)**
   - [ ] Update `.automation/phase_X_discovery_note.md`
   - [ ] Document integration points with code snippets
   - [ ] Add usage examples
   - [ ] Update `package.json` comments if complex

4. **Testing (Day 5)**
   - [ ] Unit tests for wrapper module
   - [ ] Integration tests with feature flag on/off
   - [ ] Verify fallback behavior
   - [ ] Check bundle size impact

5. **Evidence Collection (Day 6-7)**
   - [ ] Generate updated SBOM (CycloneDX + SPDX)
   - [ ] Run security audit (`npm audit`)
   - [ ] Collect performance metrics
   - [ ] Document in evidence bundle

### Affected Files
[List exact files that will import/use this dependency]
- `src/[file1].ts` - [Integration point with line number]
- `src/[file2].ts` - [Integration point with line number]
- `tests/[file].test.ts` - [Test coverage]

### Rollback Plan
[Exact steps to remove dependency if pilot fails]

1. Set feature flag to `false` (immediate rollback)
2. Remove imports from affected files
3. Delete wrapper module
4. Uninstall package: `npm uninstall [package]`
5. Remove from `ai-stack.json` allowed dependencies
6. Revert commits: `git revert [commit-hash]`

**Rollback Risk:** [Low / Medium / High] - [Justification]

### Success Criteria (Evaluate After 1-2 Weeks)
- [ ] **No Regressions:** All existing tests pass
- [ ] **Performance:** No degradation in relevant metrics
- [ ] **Security:** No new CVEs introduced
- [ ] **Maintainability:** Code is more readable/concise
- [ ] **Team Consensus:** ≥4/5 developers approve continued use

---

## If DEFER: Backlog Entry

**Defer Until:** [Specific condition or phase number]

**Triggers for Re-evaluation:**
- [ ] [Condition 1 - e.g., "Frontend exceeds 5,000 LOC"]
- [ ] [Condition 2 - e.g., "Performance bottleneck quantified >500ms"]
- [ ] [Condition 3 - e.g., "Alternative solutions exhausted"]

**Backlog Location:** `issues/backlog.md`

**Backlog Entry Template:**
```markdown
### Evaluate [Package Name] Dependency

**Priority:** [Low / Medium / High]
**Trigger:** [Specific conditions]
**Context:** [Link to this evaluation document]
**Estimated Effort:** [Hours/days if adopted]
```

---

## If REJECT: Document Rationale

**Primary Reason for Rejection:**
[Explain main blocking factor - score too low, security concern, stack violation, etc.]

**Alternative Approach:**
[Document how to solve the problem without this dependency]

**Future Consideration:**
[Explain if/when this dependency might be reconsidered]

---

## Appendix: Evidence Artifacts

### Discovery Note
- **Location:** `.automation/phase_X_discovery_note.md`
- **Integration Points:** [List files + line numbers]

### Security Audit
- **npm audit output:** `.automation/phase_X_npm_audit_[package].json`
- **Snyk scan:** [If applicable]

### Performance Benchmark
- **Before:** `.automation/phase_X_benchmark_before.json`
- **After:** `.automation/phase_X_benchmark_after.json`

### Bundle Analysis
- **Impact:** `.automation/phase_X_bundle_diff.json`

### SBOM Updates
- **CycloneDX:** `sbom.cdx.json` (updated)
- **SPDX:** `sbom.spdx.json` (updated)

---

## References

- [ ] Package npm page: [URL]
- [ ] Package documentation: [URL]
- [ ] GitHub repository: [URL]
- [ ] Security advisories: [URL if applicable]
- [ ] TypeScript types: [URL if @types]
- [ ] Benchmark results: [URL if available]
- [ ] Fortune 500 usage examples: [List if found]

---

**Template Version:** 1.0  
**Last Updated:** 2025-10-15  
**Approval Required:** CODEOWNERS (for protected file changes)
