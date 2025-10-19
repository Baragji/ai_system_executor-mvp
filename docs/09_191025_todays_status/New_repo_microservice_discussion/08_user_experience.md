## Executive summary

You’re building a Replit-style web IDE **and** a supervised, multi-agent AI coding system. Based on evidence from comparable products (Replit Agent 3.0, Cursor, Bolt.new, v0.dev, and Claude Artifacts) and human-oversight guidance (NIST AI RMF, EU AI Act), the most credible *initial product strategy* is:

* **Primary persona:** a non-technical founder or product lead who wants to ship a working MVP (web app) via natural-language guidance and light approvals. This group already flocks to Bolt.new, Replit Agent, v0.dev, and Claude Artifacts. ([Business Insider][1])
* **Core journeys:** “Create New Project”, “Fix Bug”, “Add Feature”—each with explicit *human-in-the-loop gates* showing diffs, tests, and risk signals, mirroring PR-style controls familiar from GitHub and Cursor’s review UI. ([GitHub Docs][2])
* **UI:** a dedicated Frontend service (Next.js + Monaco/CodeMirror + Yjs-class CRDT collaboration) that talks to your BFF/Gateway using CDI contracts. This matches microservice + BFF + micro-frontend patterns seen across modern web platforms. ([Amazon Web Services, Inc.][3])

Below is a **concrete, evidence-backed** UX and product spec you can turn into contracts and user stories.

---

# 1) User personas & market positioning

### Persona A — “Non-technical founder”

* **Role & skills:** Entrepreneur / PM; can’t code beyond basics.
* **Pain points:** Can’t hire a team; wants a prototype fast; gets stuck turning ideas into running software.
* **Goals:** Describe product → get working, hosted MVP; iterate via chat; approve changes with evidence.
* **Tech comfort:** Reads simple diffs; relies on approvals and previews.
* **Decision authority:** Approves AI changes at each gate; owns merge/deploy.
* **Comparable products/users:**

  * **Bolt.new** targets “software composers” and saw explosive adoption precisely from non-engineers shipping apps quickly. ([Business Insider][1])
  * **Replit Agent** markets NL→app with deploy and testing in minutes. ([Replit][4])
  * **Claude Artifacts**: “no coding needed,” generate and share interactive apps in-chat. ([anthropic.com][5])

### Persona B — “Junior developer”

* **Pain points:** Slow at architecture decisions; fixing AI-generated mistakes.
* **Goals:** Learn patterns; get safe, reviewable patches; quick previews.
* **Tech comfort:** Can code; needs guidance and guardrails.
* **Decision authority:** Suggests; senior approves.
* **Comparable:** Cursor’s agent + diff review; GitHub Copilot PR review assists. ([Cursor][6])
* **Market data:** AI tool adoption is high but trust varies by experience; juniors benefit from HIL (human-in-loop) gates. ([Stack Overflow][7])

### Persona C — “Senior engineer / tech lead”

* **Pain points:** Reviewing AI changes at scale; ensuring quality/security.
* **Goals:** Automate tests/reviews, keep autonomy gated; fast revert/rollback.
* **Tech comfort:** Expert; wants evidence, diffs, and policy-driven merges.
* **Comparable:** Cursor’s long-running agent modes + review UX; GitHub Copilot code review/agents. ([Cursor][8])

### Persona D — “Educator / student / hobbyist”

* **Pain points:** Setup complexity, tooling cost.
* **Goals:** Zero-setup, learn by building; multiplayer coding.
* **Comparable:** Replit’s IDE and multiplayer; v0 quick generation/iteration. ([docs.replit.com][9])

**Positioning takeaway:** Competing tools already validate demand across skill levels. You can differentiate by **explicit trust-spine gates** and **evidence packages** surfaced in the UI, not hidden behind chat. ([GitHub Docs][2])

---

# 2) Core user journeys (end-to-end)

> Each journey shows user steps → system responses → autonomous agent work → human gate(s).

### Journey 1 — Create New Project (Non-technical founder)

1. **Describe app** on “New Project” screen → system drafts architecture & repo plan.
2. **AI planning**: Architecture/Implementation agents propose service stubs, DB schema, tests.
3. **Gate G2–G4:** Show **diffs**, **test plan**, **preview URL**; founder approves.
4. **Build & deploy**; live preview + “Evidence bundle” (tests, logs, SBOM delta).
   **UI touchpoints:** Dashboard → New Project → Plan Review → Evidence → Preview.
   **Comparable flows:**

* Replit Agent runs long tasks with self-testing and live monitoring; can auto-login test flows. ([Replit Blog][10])
* v0.dev generates, then iterate in conversation; preview deployments on Vercel. ([v0.app][11])
* Claude Artifacts: instant interactive app preview alongside chat. ([Claude Support][12])
  **Success:** Running app + green tests + approved evidence.
  **(Time to completion depends on app scope; we optimize for minutes-to-preview via pre-baked templates and CRDT editing, not guaranteed runtime.)** ([liveblocks.io][13])

### Journey 2 — Fix Bug (Junior dev)

1. **Report issue** from app or IDE (create ticket with repro).
2. **AI diagnosis** runs failing tests/repro locally in sandbox; proposes patch.
3. **Gate G4 (Code Review):** diff + unit/integration results; reviewer approves/requests changes.
4. **Auto-merge** if policy allows (low risk, tests green) → deploy to preview → optional canary.
   **Comparable:** Cursor’s review diffs + PR-style approval; GitHub Copilot PR review workflow. ([Cursor][6])

### Journey 3 — Add Feature (Senior engineer)

1. **Feature request** with acceptance criteria.
2. **AI design** (plan mode) proposes changes + migration plan.
3. **Gates:**

   * G2/G3: design & test plan approved,
   * G4: code diffs + static analysis/security scan,
   * G6: deployment & rollback plan.
     **Comparable:** Cursor plan/long-run agent; GitHub Copilot agent creating PRs for review. ([Cursor][8])

---

# 3) UI screens & features (spec)

> Built as a dedicated **Frontend service** (Next.js + Monaco/CodeMirror; CRDT via Yjs/Automerge for real-time). ([yjs.dev][14])

**1) Dashboard / Home**

* **Purpose:** See projects, recent AI activity, queued reviews.
* **Features:** Project cards, AI activity feed, “New Project,” “Open Review Queue.”
* **AI integration:** Live status of long-running executions; links to evidence bundles.
* **Comparable:** Replit workspace overview & collaboration pages. ([docs.replit.com][15])

**2) Project View**

* **Purpose:** File tree, editor, terminal, preview, tests, deployments.
* **Features:** Monaco/CodeMirror editor; terminal; right-side “Agent” pane; preview iframe; environment panel.
* **AI integration:** Inline suggestions, “Run plan,” “Propose patch,” “Open evidence.”
* **Comparable:** Replit IDE (file tree, console, preview). ([docs.replit.com][15])

**3) Code Editor**

* **Purpose:** Edit with inline AI; collaborative cursors.
* **Features:** Monaco/CodeMirror, live cursors, presence, comment pins; CRDT sync (Yjs/Automerge).
* **Comparable:** Liveblocks examples (Monaco/CodeMirror + Yjs). ([liveblocks.io][13])

**4) AI Review Queue**

* **Purpose:** **G4 gate**—approve/reject AI patches.
* **Features:** Side-by-side diff; test results; coverage; lint; security scan; risk score; “Approve/Reject/Request changes.”
* **Comparable:** GitHub PR review; Cursor review UI. ([GitHub Docs][16])

**5) Deployments / Environments**

* **Purpose:** Preview URLs, logs, rollbacks.
* **Comparable:** Vercel preview deployments and branch previews. ([Vercel][17])

**6) Settings / Config**

* **Purpose:** AI autonomy level, auto-merge policies, team settings, billing.
* **Comparable:** Cursor team/enterprise controls. ([Cursor][18])

**7) Observability / Monitoring**

* **Purpose:** See agent runs, cost burn, latency, failures.
* **Comparable:** IDE performance + monitoring research (embed OpenTelemetry spans; display summaries). ([people.csail.mit.edu][19])

---

# 4) Human oversight in the UI (Trust spine → gates)

Map each gate to a **UI surface**, **trigger**, and **evidence**—aligning with NIST AI RMF & EU AI Act Article 14 (human oversight, transparency). ([cseweb.ucsd.edu][20])

| Gate                          | UI location         | Trigger                 | User action                    | AI autonomy                                     | Evidence shown                                                          |
| ----------------------------- | ------------------- | ----------------------- | ------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| **G0** (Intent capture)       | New Project / Chat  | New intent              | Provide goal & constraints     | N/A                                             | Parsed requirements                                                     |
| **G1** (Feasibility)          | Plan Review         | Planner proposes design | Accept/adjust scope            | Blocked without accept                          | Design doc, risks                                                       |
| **G2** (Test plan)            | Plan Review         | Test strategy ready     | Approve tests                  | Blocked without accept                          | Test list, coverage targets                                             |
| **G3** (Security checks plan) | Plan Review         | Security posture set    | Approve policies               | Blocked                                         | Threat checklist, SAST targets                                          |
| **G4** (Code review)          | **AI Review Queue** | Patch proposed          | Approve/Reject/Request changes | Optional auto-approve if low risk + green tests | Diff, tests, lint, vuln scan, SBOM delta — PR-style. ([GitHub Docs][2]) |
| **G5** (Data/Schema)          | Review Queue        | Migration plan          | Approve                        | Blocked                                         | Migration script, backup/restore plan                                   |
| **G6** (Deploy)               | Deployments         | Ready to ship           | Approve env & rollout          | Can canary if policy                            | Release notes, health checks                                            |
| **G7** (Post-deploy)          | Monitoring          | SLOs/alarms             | Acknowledge                    | Auto continue if green                          | Traces, errors, KPIs                                                    |
| **G8** (Audit/Compliance)     | Evidence bundles    | Release complete        | Sign off                       | N/A                                             | Tamper-evident bundle (hash, logs)                                      |

**Why this is necessary:** NIST and the EU AI Act both emphasize clear human-oversight points, transparency of system capabilities, and user-comprehensible rationale. Surfacing diffs, tests, scans, and logs directly in UI meets those requirements. ([cseweb.ucsd.edu][20])

---

# 5) Product differentiation & value proposition

**Competitive snapshot (selected):**

| Capability                                        | **Your system**         | Replit Agent 3                                                        | Cursor                                | Bolt.new                       | v0.dev                                   | Claude Artifacts                  |
| ------------------------------------------------- | ----------------------- | --------------------------------------------------------------------- | ------------------------------------- | ------------------------------ | ---------------------------------------- | --------------------------------- |
| NL→app + autonomous loops                         | Yes (gated)             | Yes; up to ~200-minute autonomous runs; live test/retest & monitoring | Yes; long-run plan + browser controls | Yes; instant WebContainer apps | Yes; generate & iterate, Vercel previews | Yes; interactive apps inside chat |
| Explicit **trust-spine gates** with evidence      | **Core differentiator** | Partial (testing UX)                                                  | PR-style diffs; user-controlled       | Emphasis on speed              | Iterative previews                       | In-chat preview                   |
| Multi-agent orchestration (planner/critic/devops) | **Native**              | Agentic                                                               | Agentic                               | Agentic                        | Agentic                                  | Agentic                           |
| Collab IDE (CRDT, live cursors)                   | **Native**              | Yes (multiplayer)                                                     | Desktop                               | Web-native                     | Web-native                               | In-chat canvas                    |
| Pricing model                                     | Flexible                | Credits + plans                                                       | Usage + team                          | Token plans                    | Credits/tiers                            | Subscription tiers                |

**Sources:** Replit Agent 3 (autonomy, testing), Cursor agent/review UX, Bolt.new & v0.dev workflows, Claude Artifacts interactive apps. ([Replit Blog][10])

**Positioning:** “**Evidence-driven AI software factory**”—you don’t just *get code*, you get **auditable decisions** and **review-ready artifacts** at each gate, visible in one UX.

---

# 6) MVP scope (who & what first)

* **Chosen persona:** **Non-technical founder**—validated by Bolt.new’s early traction and Claude Artifacts’ “no-code” messaging; Replit’s NL→app demos reinforce demand. ([Business Insider][1])
* **Chosen journey:** **Create New Project** (describe app → generate plan → gated build → preview). This is where comparable platforms deliver immediate value. ([v0.app][11])

**MVP must-haves (P1):**

* New Project flow with **G0–G4** gates (intent, plan, tests, code review).
* Editor + terminal + preview; **Review Queue** with diffs + tests + risk signals.
* Single-click preview deploys + evidence bundles for approvals.
* CRDT collab (basic presence + live cursors). ([liveblocks.io][13])

**Out-of-scope (later):**

* Advanced multi-service generation, cross-repo migrations, enterprise SSO/policy, cost analytics.

**MVP success metrics (examples):**

* % of first-time users who reach a **successful preview** with green tests.
* Median number of **human approvals** per shipped change (should be small with high evidence quality).
* **Abandon rate** between G4 (review) → deploy.

**Evidence for MVP thinking:** Lean Startup/YC guidance—start with a thin slice that proves value; iterate with measurable feedback. ([theleanstartup.com][21])

> **Note:** You asked for time estimates; I can’t provide future time promises. Instead, the MVP spec above gives concrete exit criteria and measurable outcomes aligned with comparable product behaviors. ([Replit][4])

---

# 7) Technical constraints that the UX imposes

* **Latency:** Keep editor interactions within **~100 ms response budget** (RAIL model) for perceived instant feedback; batch heavier work asynchronously with visible progress. ([web.dev][22])
* **Generation windows:** “Create New Project” may spin for many seconds; show **live logs and partial results** (Replit Agent 3 live monitoring; v0 previews). ([Replit Blog][10])
* **Collaboration:** Low-latency CRDTs (Yjs/Automerge) with presence/cursors; offline-tolerant syncing when possible. ([yjs.dev][14])
* **Reviewability:** PR-style diffs with tests, coverage, lint, and security scans inline (mirrors GitHub UI and Copilot code-review practices). ([GitHub Docs][16])
* **Accessibility:** Keyboard-first editor and review controls; standard web a11y (WCAG) expectations remain (industry norm; not specifically cited here).
* **Scalability:** Long-running autonomous tasks require resumable execution and streaming telemetry to UI (e.g., 200-minute runs). ([Replit Blog][10])

---

# 8) Monetization & pricing implications (optional)

* **Comparable pricing:**

  * Replit: Starter (free), Core (~$20/mo), Teams (~$35–40/user). ([Replit][23])
  * Cursor: Pro/Teams usage-based with team controls. ([Cursor][18])
  * Bolt.new: token-based tiers ($25+). ([uibakery.io][24])
  * v0.dev: free credits, $20 premium, $30/user team. ([v0.app][25])
* **Value metric candidates:** preview deployments/mo; autonomous run minutes; evidence bundle storage; seats. (Matches competitor pricing anchors.) ([Replit][23])

---

## Visual artifacts

### Persona cards (condensed)

* **A. Non-technical founder:** goals—ship MVP; needs NL→app, gates + evidence. (Refs: Bolt, Claude Artifacts, Replit Agent.) ([Business Insider][1])
* **B. Junior dev:** goals—safe AI patches, learn; needs diffs/tests. (Refs: Cursor review, GitHub PR.) ([Cursor][6])
* **C. Senior engineer:** goals—throughput with control; needs policies, scans, rollback. (Refs: GitHub PR controls, Copilot code review/agent.) ([GitHub Docs][2])

### Journey maps (text)

* Already detailed in **Section 2** with gate placements and comparable product references.

### Core screens (wireframe-level spec)

* Already detailed in **Section 3** mapped to products showing similar UX.

### Competitive table

* See **Section 5** with sources.

---

## Platform vs AI system (boundary clarity)

* **Platform layer (9 services):** Auth, Projects, Files, Code-Runner (user code), Realtime Collab, Deployments, Evidence/Compliance, BFF/Gateway, **Frontend UI** (this answer). These provide the web IDE, previews, CRDT collab, evidence surfaces, and approvals—**for humans**. (Matches Replit/Bolt/v0 architecture patterns.) ([docs.replit.com][15])
* **AI layer (3 services/agents):** Planner/Architecture, Implementation/Testing, Orchestrator/DevOps. They propose plans, run long tasks, generate diffs/tests, and supply **evidence bundles** to gates. (Comparable: Cursor plan mode + GitHub Copilot agents; Replit Agent long runs.) ([Cursor][8])

---

## Updated service list & tech stack (user-facing emphasis)

**Frontend UI (new 9th service in platform):**

* **Stack:** Next.js (app router), Monaco/CodeMirror, CRDT (Yjs or Automerge), Liveblocks-style presence, Tailwind.
* **Why:** Proven patterns for IDE-like web apps; CRDTs power real-time editing and offline tolerance. ([liveblocks.io][13])
* **Ownership:** **Architecture & Implementation Agents** produce components but **Security/Quality** wire the trust-spine surfaces (Gates UI).
* **Contracts:** CDI applies to UI → **typed HTTP/WS contracts** with BFF (resource schemas for: /projects, /runs, /reviews, /evidence, /deploys). BFF pattern is recommended for UI-specific aggregation. ([Amazon Web Services, Inc.][3])

---

## Agent-3.0-style capability roadmap (what appears when)

* **MVP:** NL→app generation; G0–G4 gates; previews; diff+test evidence; basic long-run jobs with live logs. (Inspired by Replit Agent, v0 previews, Cursor review.) ([Replit Blog][10])
* **Basic Agent:** autonomous **test→fix→retest** loop visible in Review Queue; gated auto-merge when risk low. (Matches widespread agentic patterns.) ([Replit Blog][10])
* **Advanced (Agent 3.0-like):** multi-hour autonomous runs; browser-driven app testing; “agents building agents/automations” as first-class entities; live monitoring with evidence rollups. ([Replit Blog][10])

---

## What changes to make now (actionable)

1. **Adopt a dedicated Frontend service** (Next.js) with editor + review queue + deployments panes; enforce CDI contracts to the BFF. ([Amazon Web Services, Inc.][3])
2. **Bake gates into UX from day 1**, mapping NIST/EU oversight into clickable approvals with evidence bundles (diffs/tests/scans/logs). ([cseweb.ucsd.edu][20])
3. **Prioritize “Create New Project” journey** for the non-technical founder persona; success = preview + green tests with minimal friction. ([Business Insider][1])
4. **Engineer for latency budgets** (<100 ms interaction in editor) and stream long-run output to UI. ([web.dev][22])
5. **Ground collaboration in CRDTs** (Yjs/Automerge) and show presence/cursors. ([yjs.dev][14])

---

## Sources (selected)

* **Replit Agent 3.0 & IDE:** feature docs & blog (autonomy, testing, workspace UI). ([Replit Blog][10])
* **Cursor:** review UX & agent planning/controls. ([Cursor][6])
* **Bolt.new / StackBlitz:** product narrative, adoption, and plans. ([Business Insider][1])
* **v0.dev:** generate → iterate → preview/deploy patterns. ([v0.app][11])
* **Claude Artifacts:** interactive app creation inside chat. ([anthropic.com][5])
* **Human oversight:** NIST AI RMF; EU AI Act Article 14. ([cseweb.ucsd.edu][20])
* **Code review UX:** GitHub PR docs; Copilot code review. ([GitHub Docs][16])
* **Collaboration tech:** Yjs/Automerge/Liveblocks exemplars. ([yjs.dev][14])
* **Latency expectations:** Google RAIL, MDN. ([web.dev][22])

---

### Bottom line

* **End user:** start with **non-technical founders** who want NL→app with strong *reviewable* autonomy. ([Business Insider][1])
* **UI:** treat the **Frontend** as a first-class service owned jointly by Architecture/Implementation agents and instrumented by Security/Quality; wire it to BFF via CDI contracts. ([Amazon Web Services, Inc.][3])
* **Trust spine:** surface **G0–G4** from day one in the UI with evidence. This is your defensible wedge vs. “black-box” agentic editors. ([cseweb.ucsd.edu][20])

If you want, I can now transform this into **CDI contracts** for: (a) Frontend/BFF API, (b) Review Queue UI spec, (c) Evidence bundle schema, (d) Preview deployment controls.

[1]: https://www.businessinsider.com/stackblitz-bolt-silicon-valley-hottest-ai-coding-startup-nearly-died-2025-5?utm_source=chatgpt.com "The inside story of how Silicon Valley's hottest AI coding startup almost died"
[2]: https://docs.github.com/articles/about-pull-request-reviews?utm_source=chatgpt.com "About pull request reviews"
[3]: https://aws.amazon.com/blogs/mobile/backends-for-frontends-pattern/?utm_source=chatgpt.com "Backends for Frontends Pattern | Front-End Web & Mobile"
[4]: https://replit.com/learn/intro-to-ghostwriter?utm_source=chatgpt.com "Intro to Ghostwriter"
[5]: https://www.anthropic.com/news/build-artifacts?utm_source=chatgpt.com "Create AI-Powered Apps with Claude Artifacts"
[6]: https://cursor.com/docs/agent/review?utm_source=chatgpt.com "Review | Cursor Docs"
[7]: https://survey.stackoverflow.co/2024/ai?utm_source=chatgpt.com "AI | 2024 Stack Overflow Developer Survey"
[8]: https://cursor.com/changelog?utm_source=chatgpt.com "Changelog"
[9]: https://docs.replit.com/?utm_source=chatgpt.com "Replit Docs"
[10]: https://blog.replit.com/introducing-agent-3-our-most-autonomous-agent-yet?utm_source=chatgpt.com "Introducing Agent 3: Our Most Autonomous Agent Yet"
[11]: https://v0.app/docs/quickstart?utm_source=chatgpt.com "Quickstart | v0 Docs"
[12]: https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them?utm_source=chatgpt.com "What are artifacts and how do I use them?"
[13]: https://liveblocks.io/examples/collaborative-code-editor/nextjs-yjs-codemirror?utm_source=chatgpt.com "Collaborative Code Editor | Liveblocks Example"
[14]: https://yjs.dev/?utm_source=chatgpt.com "Yjs | Homepage"
[15]: https://docs.replit.com/category/workspace-features?utm_source=chatgpt.com "Workspace Features"
[16]: https://docs.github.com/articles/reviewing-proposed-changes-in-a-pull-request?utm_source=chatgpt.com "Reviewing proposed changes in a pull request"
[17]: https://vercel.com/resources/iterate-faster-with-a-streamlined-development-workflow?utm_source=chatgpt.com "Iterate faster with a streamlined web development workflow."
[18]: https://cursor.com/pricing?utm_source=chatgpt.com "Pricing"
[19]: https://people.csail.mit.edu/jcito/papers/icse19-performancehat.pdf?utm_source=chatgpt.com "Interactive Production Performance Feedback in the IDE"
[20]: https://cseweb.ucsd.edu/~mcoblenz/assets/pdf/fse24-autocomplete.pdf?utm_source=chatgpt.com "An Analysis of the Costs and Benefits of Autocomplete in IDEs"
[21]: https://theleanstartup.com/principles?utm_source=chatgpt.com "The Lean Startup | Methodology"
[22]: https://web.dev/articles/rail?utm_source=chatgpt.com "Measure performance with the RAIL model | Articles"
[23]: https://replit.com/pricing?utm_source=chatgpt.com "Pricing"
[24]: https://uibakery.io/blog/bolt-new-pricing-explained?utm_source=chatgpt.com "Bolt.new Pricing Explained: What You Need to Know"
[25]: https://v0.app/pricing?utm_source=chatgpt.com "Plans and Pricing"
