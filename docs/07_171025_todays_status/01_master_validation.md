---

## 📜 MASTER INSTRUCTION — PLAN → VALIDATE → FIX → PROVE

### Ground rules (read carefully)

* **PLAN MODE first. Do not change files or commit until I reply “APPROVED: proceed”.**
* If you are **unsure at any step**, **STOP AND ASK** me. No assumptions.
* Treat the repo as two tracks:

  1. **Workflow-track** (automation, state, ledger, evidence, docs/checklists)
  2. **Executor project** (the real implementation we’re building)
     The workflow-track *drives and verifies* the executor project; they’re not the same. See `WHAT_IS_WHAT.md`
     
* All fixes must be paired with **tests + commands** that **prove** the behavior, and with **before/after evidence**.

---

## 0) Context you must internalize

1. This repo has a workflow system that:

   * Detects evidence from logs, writes a **GATES_LEDGER**, and suggests the **next action**.
   * Has scripts like `scripts/detect-evidence.js`, `scripts/execute-next-action.js`, `scripts/gate-auto-update.js`, etc.
   
2. Two open concerns:

   * **Auto-update default** (docs imply **enabled by default / opt-out**; behavior looks **opt-in**).
   * **G3 evidence aggregation + command fidelity**: when `/api/execute` and the parity test run in **separate** commands, the detector should aggregate them into one **G3** evidence item and the **recorded command** must be the **real `curl … /api/execute`**, not the test runner.

---

## 1) Reproduce & PINPOINT the issues (no edits yet)

### A. Baseline repo health (executor + workflow)

Run and capture outputs:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run contract:check
node scripts/snapshot-state.js --print > .automation/_tmp/state_before.json
node scripts/detect-evidence.js --json > .automation/_tmp/detect_before.json
```

* Save the two JSON files under `.automation/_tmp/` (commit later, after approval).

### B. **Auto-update default** — verify the problem exists

Goal: prove whether gate auto-update is **enabled by default** (opt-out) or **disabled** (opt-in).

1. **Without** setting `GATE_AUTO_UPDATE`:

   ```bash
   unset GATE_AUTO_UPDATE
   npm run state:next || true
   ```

   * Expected (current bug): logs say **“gate auto-update is disabled”** and **ledger not updated**.
2. Now set an explicit enabling value:

   ```bash
   export GATE_AUTO_UPDATE=1
   npm run state:next || true
   ```

   * Expected: tool considers auto-update enabled.

**Deliverable:** a short note confirming which default actually happens, plus the exact file/function that governs it (likely `scripts/gate-auto-update.js`, function similar to `isAutoUpdateEnabled`). **Paste the path and the current logic you found.**

### C. **G3 aggregation & command fidelity** — verify the problem exists

Goal: prove that with **separate** runs the detector records the **test command** instead of the **curl**.

1. Start API (separate terminal):

   ```bash
   npm start
   ```
2. Generate a **real API** action log entry:

   ```bash
   curl -sfS -X POST http://localhost:3000/api/execute \
     -H 'content-type: application/json' \
     -d '{"input":"ping"}'
   ```
3. Run the **parity test** separately:

   ```bash
   AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts
   ```
4. Now detect evidence:

   ```bash
   node scripts/detect-evidence.js --json | tee .automation/_tmp/detect_after_separate.json
   ```

   * **Problem we expect to see:** The **G3** evidence exists but the **`command`** is the **test command**, not the `curl … /api/execute`.

**Deliverable:** paste the **exact G3 object** that detector prints (from the JSON) and the **files/lines** you traced that cause the wrong command to “win” (e.g., aggregation reducer or “latest” replacement that favors the parity test entry). **Do not fix yet.**

---

## 2) Explain WHAT, WHY, HOW (your own words, then propose the patch)

### WHAT to change (high-level)

1. **Auto-update default:** Implement **opt-out** semantics:

   * Auto-update is **ON by default** unless `GATE_AUTO_UPDATE` is set to a falsey/explicitly-off value (`"0"`, `"false"`, `"off"`, empty).
2. **G3 aggregation + command fidelity:**

   * When the log contains **both** a successful **`/api/execute` curl** entry and a successful **parity test** entry within a reasonable window, create **one** G3 evidence item whose **`command`** is the **real curl** (never a placeholder, never the test command).
   * Mark aggregated evidence `source: "aggregated"` (or similar) for clarity.

### WHY this is required

* **Auto-update** must honor the **“enabled by default (opt-out)”** expectation so the workflow **actually advances** when evidence appears—no hidden flags.
* **Command fidelity** is a **compliance/audit** need: the ledger must show **reproducible real steps** (the curl), not “a test summarized it.”

### HOW (code-level sketch)

* **Auto-update:** in the module that exports the check (likely `scripts/gate-auto-update.js`), implement:

  ```js
  function isAutoUpdateEnabled(env = process.env) {
    const v = (env.GATE_AUTO_UPDATE ?? '').toString().trim().toLowerCase();
    if (v === '' /* unset */) return true;                 // ✅ default ON
    if (['0','false','off','no'].includes(v)) return false; // explicit OFF
    return true; // any other truthy string -> ON
  }
  ```

  * Add unit tests to lock this behavior.

* **G3 aggregation:** in `scripts/detect-evidence.js` (or a helper it uses):

  * Add `detectEvidenceForEntryWithContext(entry, { recentLimit: N, windowMs: 15*60_000 })` that loads the latest **N** actions and searches for:

    * **one successful** `/api/execute` curl **AND**
    * **one successful** parity test (`npm test tests/api/executions.test.ts`)
    * **within** the time window.
  * When both are present:

    * Emit **one** match `{ gate: 'G3', criterion: <canonical ledger text>, command: <curl command>, timestamp: <max of the two>, source: 'aggregated', exitCode: 0 }`.
    * Ensure any “latest per criterion” reducer **does not** overwrite this with the parity test’s command.
  * Update `scripts/execute-next-action.js` to call the **context-aware** detector.

---

## 3) Request approval with a concrete PATCH PLAN (no edits yet)

Post back:

* **Files you will change** (full paths).
* **New tests** you will add:

  * `tests/scripts/update-gate.test.ts`: auto-update defaults test (unset env → enabled).
  * `tests/scripts/detect-evidence.test.ts`: separate-entry aggregation emits **curl** command.
  * (Optional) `tests/workflow/detectEvidence.test.ts`: end-to-end aggregation path.
* **Risk assessment** + rollback plan.

I will reply **“APPROVED: proceed”** when ready.

---

## 4) IMPLEMENT (after approval) and prove with checks

### A. Apply changes on a feature branch

```bash
git checkout -b fix/workflow-g3-auto-update-and-fidelity
# make edits & tests
npm run lint && npm run typecheck && npm test
```

### B. **Validate the fixes really work**

#### 1) Auto-update default proof

```bash
unset GATE_AUTO_UPDATE
npm run state:next || true
# Expect: no “disabled” banner; ledger updates when evidence exists.
```

If the workflow has a “dry-run” or verbose mode, include that output in `.automation/_tmp/auto_update_default.txt`.

#### 2) G3 aggregation + command fidelity proof (live)

```bash
npm start &
sleep 2
curl -sfS -X POST http://localhost:3000/api/execute \
  -H 'content-type: application/json' \
  -d '{"input":"ping"}'
AGENTS_RUNTIME=langgraph npm test tests/api/executions.test.ts
node scripts/detect-evidence.js --json | tee .automation/_tmp/detect_after_fix.json
jq '.evidence[] | select(.gate=="G3")' .automation/_tmp/detect_after_fix.json
```

**Acceptance:** the printed G3 item’s `command` **starts with** `curl -sfS -X POST http://localhost:3000/api/execute` (not the test command, no placeholders).

#### 3) Ledger auto-update proof

With auto-update default **ON** (unset env), run the normal “next action”:

```bash
unset GATE_AUTO_UPDATE
npm run state:next || true
node scripts/snapshot-state.js --print | tee .automation/_tmp/state_after_fix.json
```

**Acceptance:**

* **G3** status moves forward (no longer blocked by the two issues).
* `.automation/GATES_LEDGER.md` shows the **G3 evidence line** whose **Command:** is the **real curl**, not the test.
* No warnings about auto-update being disabled.

---

## 5) Finish by **starting the next pending task** (real execution)

1. Ask the workflow for the next action:

   ```bash
   node scripts/snapshot-state.js --print | jq '.suggested_next_action'
   ```
2. If it suggests **G3 parity** (or anything else), **run it for real** (not a synthetic step) using the repo’s documented command(s).
   For G3 parity, repeat the **live** sequence above and ensure detector + auto-update complete the gate and the **ledger** reflects it.
3. Capture:

   * `.automation/_tmp/state_final.json`
   * `.automation/_tmp/detect_final.json`
   * A `git diff --stat` and `git status` snapshot.

---

## 6) Deliverables (what you must hand back to me)

* A **short report** with:

  * **Issue verification**: exact files/lines proving each issue existed.
  * **Fix summary**: what changed and why it solves the problem.
  * **Proof artifacts**: the `_tmp/*.json` and any logs proving default auto-update and curl command fidelity.
  * **Next-task run**: what the workflow suggested and what happened when you executed it for real.
* A PR on branch `fix/workflow-g3-auto-update-and-fidelity` with:

  * All code changes
  * New tests
  * Updated docs if applicable
  * Screenshots or pasted JSON snippets in the PR description
* **If anything is unclear at any time → STOP AND ASK.**

---

### Quick checklist he must tick while working

* [ ] I read `WHAT_IS_WHAT.md` and understand workflow-track vs executor.
* [ ] I reproduced **auto-update default** behavior and pasted logs proving current default.
* [ ] I reproduced **G3 command fidelity** with separate runs and pasted the wrong G3 `command`.
* [ ] I proposed a patch plan; waited for **APPROVED**.
* [ ] I implemented **opt-out default** for auto-update + added unit tests.
* [ ] I implemented **context-aware G3 aggregation** that **always records the real curl**.
* [ ] All checks green: `lint`, `typecheck`, `tests`, `contract:check`.
* [ ] Live run shows **G3** `command` = real `curl … /api/execute`.
* [ ] `state:next` (with default env) **updates ledger** without “disabled” banner.
* [ ] I executed the **next pending task** suggested by the workflow and attached the proof.
* [ ] I opened the PR with all artifacts.

---
