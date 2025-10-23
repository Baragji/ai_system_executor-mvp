# user
can you extract in simple bullet points using the technical terms (the ones we already used) of all execution / implementation requirements? you know the DI, gates, npm tests, production grade, mounting etc. -> i believe the major parts are in the S2-03 instruction from gpt

# Assistant
Perfect — yes, the **S2-03 instruction** from GPT (the one used for *sessions pause/resume routes with DI*) is your canonical template for what constitutes a **complete, production-grade execution/implementation prompt**.

Here’s the ** distilled bullet-point list of all technical execution & implementation requirements**, using your project’s established terminology and phrasing:

---

## 🧠 **Execution / Implementation Requirements (S2-03 Pattern)**

### 1. **Scope Definition**

* Identify exact **line ranges** in `src/server.ts` to extract (e.g., 1873–1950, 1976–2150).
* Specify **target feature slice ID** (e.g., `P21-S2-03`).
* Define **scope boundaries** explicitly — no adjacent routes or unrelated handlers.

---

### 2. **File Structure & Extraction**

* Extract logic into **dedicated domain router** file (e.g., `src/domains/sessions/routes.ts`).
* Maintain the **same route paths** and **HTTP methods**.
* Keep **status codes**, **payload shapes**, and **logs** bit-for-bit identical.
* Include **imports only for DI surface** — no global/server dependencies.
* Remove extracted handlers completely from `server.ts`.

---

### 3. **Dependency Injection (DI)**

* Create a **typed DI contract** (e.g., `SessionsDeps` type).
* Include every function, helper, and orchestrator dependency used by the routes.
* Use **real injected functions** — **no mocks, no stubs, no placeholders.**
* Inject via `mountSessionsRoutes(app, deps)` in `src/server.ts`.
* Verify each dependency references **existing, real server helpers**.

---

### 4. **Mounting / Integration**

* Mount the new router in `src/server.ts` at the correct section among other domain mounts.
* Ensure **no duplicate route definitions** remain (grep for `/pause`, `/resume`, etc.).
* Follow same middleware order (auth, bodyParser, etc.).
* Preserve **feature flags** and **behavioral contracts**.

---

### 5. **Validation Protocol (Gates)**

Each step halts on failure. All gates must pass before marking slice complete:

| Gate | Command                  | Expected Output                       |
| ---- | ------------------------ | ------------------------------------- |
| G1   | `npm run lint`           | no warnings or errors                 |
| G2   | `npm run typecheck`      | no type errors (esp. sessions routes) |
| G3   | `npm test -- --coverage` | 100% coverage for new routes          |
| G4   | Contract validation      | all assertions true                   |
| G5   | `npm run build`          | success, no warnings                  |
| G6   | SBOM + provenance        | valid SLSA evidence                   |
| G7   | `npm run validate`       | all CI gates green                    |

---

### 6. **Test Implementation**

* Create new test file (e.g., `tests/domains/sessions/routes.test.ts`).
* Use **stubs/mocks only in tests** — never in production code.
* Test both **happy** and **error** paths for each route.
* Verify:

  * Correct status codes (200, 400, 404, 409, 500)
  * Correct payload shapes
  * Injected deps called with correct args
* Achieve **100% branch and line coverage** for the new module.

---

### 7. **Behavior Preservation**

* Output and side effects must match original routes exactly:

  * Logs
  * Error messages
  * Response structure
  * Async flow and sequence
* Any deviation requires **explicit justification** in discovery note.

---

### 8. **Error Handling**

* Use real, typed error handling (no silent failures).
* Log errors before 500 responses: `console.error(err)`
* Ensure proper propagation (e.g., `return respondWithProblem(...)`).

---

### 9. **Quality Standards**

* **No “TODO” or placeholder comments**.
* **No magic numbers** or inline constants — use existing constants.
* Fully **typed** (no `any`, no type assertions).
* **Async/await only** — no dangling promises.
* **Readable, consistent formatting** (`eslint`, `prettier` clean).
* Follow **contract-driven pattern** across all domains.

---

### 10. **Documentation & Discovery Artifacts**

* Update `phase21_discovery_note.md` with:

  * Extracted line ranges
  * DI surface definition
  * Mount point in server
  * Validation results (green gates)
* Update contract (`21_phase21_modular_extraction_contract.json`) accordingly.
* Include commit summary: “✅ S2-03 extraction complete – DI verified, tests green.”

---

### 11. **Completion Criteria (Must-All-Be-True)**

✅ No mocks/stubs in production code
✅ Routes call only injected deps
✅ Inline handlers fully removed
✅ All gates green (lint, typecheck, test, build, provenance)
✅ 100% coverage achieved
✅ Behavior identical
✅ No warnings in CI logs
✅ Documentation updated

---

Would you like me to now distill this into a **JSON “execution checklist template”** (so you can reuse it for S3-01 and future slices — each with identical gate structure and fields like `scope`, `di_surface`, `validation`, `criteria`, etc.)? That would turn it into a machine-readable version of this list.

# user
yes

# Assistant

Perfect.
Below is your **canonical JSON “Execution Checklist Template”** — derived directly from the S2-03 production-grade pattern and aligned with your SSOT rules (no mocks, no fakes, all real DI + green gates).

You can reuse this for any slice (e.g., `P21-S3-01`, `S4-02`, etc.).
Each section maps to a gate or verification step your AI executors can follow autonomously.

---

```json
{
  "execution_checklist": {
    "meta": {
      "slice_id": "P21-SX-XX",
      "feature_name": "Short description of feature (e.g., sessions pause/resume)",
      "source_file": "src/server.ts",
      "target_files": [
        "src/domains/<domain>/routes.ts",
        "tests/domains/<domain>/routes.test.ts"
      ],
      "contract_file": "21_phase21_modular_extraction_contract.json",
      "discovery_note": "docs/phase21_discovery_note.md"
    },

    "scope": {
      "line_ranges": ["####–####"],
      "http_routes": [
        { "method": "POST", "path": "/api/..." },
        { "method": "GET", "path": "/api/..." }
      ],
      "forbidden": [
        "scope creep beyond listed routes",
        "new dependencies without contract approval",
        "placeholder or TODO code"
      ]
    },

    "dependency_injection": {
      "type_name": "<Domain>Deps",
      "requirements": [
        "All helpers and orchestrator functions must be injected, not imported directly.",
        "No mocks, stubs, or fake data sources in production.",
        "Each dep must reference an existing real function in server.ts or imported modules.",
        "DI object constructed and passed explicitly via mount function."
      ]
    },

    "mounting": {
      "instruction": "Mount new router via mount<Domain>Routes(app, deps) in src/server.ts after similar domain mounts.",
      "validation": [
        "grep to confirm no duplicate routes remain",
        "ensure same middleware order and feature flags"
      ]
    },

    "validation_protocol": {
      "gates": [
        { "id": "G1", "name": "Lint", "command": "npm run lint", "expected": "no warnings or errors" },
        { "id": "G2", "name": "Typecheck", "command": "npm run typecheck", "expected": "no TypeScript errors" },
        { "id": "G3", "name": "Test Coverage", "command": "npm test -- --coverage", "expected": "100% coverage for new routes" },
        { "id": "G4", "name": "Contract Validation", "command": "npm run validate:contract", "expected": "all assertions pass" },
        { "id": "G5", "name": "Build", "command": "npm run build", "expected": "successful build, no warnings" },
        { "id": "G6", "name": "SBOM + Provenance", "command": "npm run sbom && npm run provenance", "expected": "SLSA attestation generated" },
        { "id": "G7", "name": "Final CI Validation", "command": "npm run validate", "expected": "all CI gates green" }
      ],
      "halt_on_failure": true
    },

    "tests": {
      "file": "tests/domains/<domain>/routes.test.ts",
      "requirements": [
        "Use mocks/stubs only inside tests.",
        "Test all happy and error paths (200, 400, 404, 409, 500).",
        "Assert response payloads and dependency call arguments.",
        "Target 100% branch and line coverage."
      ]
    },

    "behavior_preservation": {
      "requirements": [
        "Preserve status codes, payload shapes, log messages, and async sequence exactly.",
        "Match side effects order (e.g., abort → interrupt → manifest update).",
        "Document any justified deviations in discovery_note.md."
      ]
    },

    "error_handling": {
      "rules": [
        "Use real typed error objects.",
        "Log error before returning 500.",
        "Return standardized problem responses (respondWithProblem)."
      ]
    },

    "quality_standards": {
      "rules": [
        "No TODO or placeholder comments.",
        "No magic numbers or inline constants.",
        "All code fully typed (no 'any', no type assertions).",
        "Consistent lint and format (eslint/prettier clean).",
        "Use async/await; no dangling promises."
      ]
    },

    "documentation": {
      "requirements": [
        "Update phase21_discovery_note.md with DI surface, mount point, validation results.",
        "Update modular_extraction_contract.json with new domain metadata.",
        "Commit summary: '✅ [SliceID] extraction complete – DI verified, tests green.'"
      ]
    },

    "completion_criteria": [
      "No mocks/stubs in production code.",
      "Routes call only injected deps.",
      "Inline handlers fully removed.",
      "All gates green (lint, typecheck, test, build, provenance).",
      "100% coverage achieved.",
      "Behavior identical to original handlers.",
      "No warnings or TODOs in CI logs.",
      "Documentation updated and validated."
    ]
  }
}
```

---

✅ **How to Use**

1. Copy this file as `.automation/templates/execution_checklist_template.json`.
2. For each slice (e.g., `P21-S3-01`), duplicate and fill in:

   * `slice_id`
   * `feature_name`
   * `line_ranges`
   * Actual domain name and paths.
3. Attach it to your Codex or Copilot prompt → they will follow it as a **contract-driven execution protocol**.

---

Would you like me to generate a **filled-in version for `S3-01`** (Fixtures/Replay/Plan routes) using this exact template and your repo’s verified structure (after S2-03 merge)?
