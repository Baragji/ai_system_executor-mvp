# UMCA Executor MVP — Repository Instructions for AI Agents

**Last Updated:** 2025-10-08  
**Enforcement:** This file is protected by CODEOWNERS. Changes require approval.

---

## Stack & Constraints

### Allowed Technology
- **Language:** TypeScript/JavaScript ONLY
- **Backend:** Node.js 20+ with Express
- **Frontend:** Vanilla JS/CSS under `/public` directory - NO frameworks
- **Testing:** Vitest with 80% line coverage, 75% branch coverage
- **Linting:** ESLint with zero warnings

### Forbidden Technology
- ❌ **No Python** anywhere in this project
- ❌ **No frontend frameworks** (React, Vue, Angular, etc.) in `/public`
- ❌ **No new dependencies** without explicit justification
- ❌ **No breaking changes** to existing APIs

---

## Discovery-First Protocol

Before making ANY code changes:

1. **Discover Integration Points**
   - Identify exact file + line + function where code will integrate
   - Document current implementation with code snippets (±10 lines)
   - List all dependencies and potential impacts
   - Verify stack compliance against `ai-stack.json`

2. **Create Discovery Note**
   - Output: `.automation/phase*_discovery.json` and `.md`
   - Must include: integration points, snippets, justification, compliance check
   - Review discovery note before proceeding

3. **No Assumptions**
   - Never assume file structure or function names
   - Always grep/search to find actual locations
   - Document what you found, not what you expected

---

## Commands (Run These Exactly)

### Validation Commands (Must Pass Before Merge)
```bash
npm run lint              # ESLint - must exit 0, no warnings
npm run typecheck         # TypeScript - must exit 0
npm test                  # Vitest - must exit 0, coverage thresholds met
npm run contract:check    # Contract schema validation - must exit 0
npm run sbom              # Generate SBOM artifact
```

### Build & Run
```bash
npm run build             # TypeScript compilation
npm run dev               # Development server with watch
npm test -- --watch       # Test watch mode
```

---

## Evidence Requirements

Every PR must include:

1. **Discovery Note**
   - Path: `.automation/phase*_discovery_note.md`
   - Contents: Integration points with code snippets
   - Justification for chosen approach

2. **Test Evidence**
   - All tests passing (exit 0)
   - Coverage thresholds met
   - No skipped tests without explanation

3. **Contract Validation**
   - `npm run contract:check` passes
   - Contract JSON validates against schema

4. **SBOM Artifact**
   - Generated via `npm run sbom`
   - Uploaded in CI pipeline
   - Format: SPDX JSON

5. **Stack Compliance**
   - No forbidden file extensions (.py, etc.)
   - Frontend changes only under `/public`
   - No new frameworks introduced

---

## Protected Files (CODEOWNERS Approval Required)

Changes to these require explicit approval:
- `ai-stack.json`
- `.github/copilot-instructions.md`
- `.github/workflows/*`
- `contracts/schemas/*`
- `.github/CODEOWNERS`

---

## Anti-Drift Rules

### DO
✅ Follow patterns established in existing code  
✅ Add tests for all new functionality  
✅ Document integration points before changing code  
✅ Run all validation commands before creating PR  
✅ Keep changes focused and minimal  

### DON'T
❌ Add Python code for any reason  
❌ Introduce frontend frameworks in `/public`  
❌ Make breaking changes to APIs  
❌ Skip discovery phase  
❌ Commit without passing all validation  
❌ Modify protected files without approval  

---

## Quality Standards

### Code Quality
- **Coverage:** 80% line, 75% branch minimum
- **Warnings:** Zero tolerance
- **Errors:** Must fix before PR
- **Style:** ESLint enforced automatically

### Contract Quality
- **Validation:** Must pass schema check
- **Completeness:** All required fields present
- **Evidence:** All claims backed by artifacts
- **Traceability:** Clear decision reasoning

---

## Execution Flow

1. **Phase Verification** → Confirm prerequisites complete
2. **Discovery Phase** → Map integration points (mandatory)
3. **Win Implementation** → Execute with discovered integration points
4. **Evidence Collection** → Generate all required artifacts
5. **Validation Gate** → All checks pass before merge

---

## Error Handling

If any step fails:

1. **HALT immediately** - do not proceed
2. **Document the failure** in trace file
3. **Report to human** with diagnostic info
4. **Wait for guidance** - no assumptions

---

## Integration Guidelines

### Frontend Changes (`/public/*`)
- Pure vanilla JS - no transpilation needed
- CSS changes go in existing `.css` files
- Test in browser manually before marking complete
- Verify no console errors

### Backend Changes (`src/*`)
- TypeScript with full type safety
- Unit tests required for all functions
- Integration tests for API endpoints
- Error handling on all async operations

### Schema Changes (`contracts/schemas/*`)
- Requires CODEOWNERS approval
- Must be backwards compatible
- Validate against existing contracts
- Document breaking changes

---

## When In Doubt

1. **Stop and ask** - don't guess
2. **Check ai-stack.json** for constraints
3. **Review discovery phase** if stuck on integration
4. **Run validation commands** to catch issues early
5. **Read existing code** for patterns to follow

---

**Remember:** Quality over speed. Ship perfect or never.

---

## Contact & Governance

- **Owner:** @yousefbaragji
- **Protected Files:** Require CODEOWNERS approval
- **Stack Drift:** Automatically rejected by CI
- **Evidence Missing:** PR blocked until artifacts present

This file enforces the Contract-Driven Integration (CDI) pattern for AI-powered development.
