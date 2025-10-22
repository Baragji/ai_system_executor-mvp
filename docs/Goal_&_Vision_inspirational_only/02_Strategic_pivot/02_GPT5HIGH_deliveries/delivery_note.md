I’ve completed the deep-dive and saved an evidence-backed strategy to the repo.

Where to find it

Analysis (MD): .automation/phase18_f500_pivot_analysis.md
Summary (JSON): .automation/phase18_f500_pivot_analysis.json
What’s inside

Sources reviewed with notes: MCA spec, 5 roadmaps, Contract 16, repo rules.
Conflict analysis: Python/React vs our Node/vanilla stack; event bus expectations vs CDI “no new deps”; compliance/evidence gaps.
Gap analysis: current MVP vs Fortune 500 needs (multi-agent, chat loop, SIEM/provenance, policy-as-code, approvals).
Feasibility by option: recommends Option 4 (Evidence-Based Hybrid).
Strategic plan: phase-aligned, CDI-compatible path:
Trust Spine vNext: CycloneDX SBOM, RFC 9457 errors, SIEM-friendly logs (no API breaks).
Multi-Agent Seams: model RA/AA/SA/IA/QA/DBA/DA as StepQueue steps with evidence outputs.
Chat Interaction: vanilla-JS chat and SSE under /public mapped to clarify/pause/resume.
Compliance & Policy: optional semgrep/gitleaks, minimal ASVS/LLM Top-10 mapping, SLSA provenance in CI.
Immediate next steps I propose

Validate/finish Contract 16 pause/accessibility wins.
Author a small “Trust Spine vNext” contract to add CycloneDX and RFC 9457 responses.
Draft step schemas for specialized agents and a lightweight MCA state/evidence template (docs-first).
Spike minimal vanilla chat UI and endpoints without introducing frameworks.
If you want, I can scaffold the “Trust Spine vNext” contract and a tiny chat proof (docs and stubs only) next.