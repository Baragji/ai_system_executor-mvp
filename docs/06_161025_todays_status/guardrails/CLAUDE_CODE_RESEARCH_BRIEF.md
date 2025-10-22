# Research Brief: Universal Boundary Enforcement for Claude Code Sonnet 4.5

**Date**: 2025-10-16
**Subject**: Claude Code (Anthropic Sonnet 4.5) repeatedly violates boundaries despite reading, acknowledging, and citing them
**Requester**: @yousefbaragji
**Your Role**: Senior AI Safety Architect & DevOps Security Expert with web research capabilities

---

## The Problem

Claude Code Sonnet 4.5 committed a catastrophic boundary violation:
- **Read** project boundaries (WHAT_IS_WHAT.md, docs/04_141024_todays_status.md/)
- **Acknowledged** understanding of WORKFLOW (internal) vs PRODUCT (public) separation
- **Cited** the boundaries explicitly in responses
- **Then violated them anyway** by creating `GET /api/workflow/status` endpoint (PUBLIC) exposing internal workflow state (gates, contracts, tasks)

**Impact**: Exposed internal secrets to end users, required emergency remediation, wasted thousands in tokens.

**Root Cause**: Claude Code forgets everything in 3-4 messages due to context resets. Cannot self-enforce boundaries.

---

## Your Assignment

Research and design a **universal, project-agnostic boundary enforcement system** that:

1. **Works across context resets** - Claude Code forgets everything every 3-4 messages
2. **Blocks IMMEDIATELY** - Before code is written, not at commit/CI/CD time (tokens already wasted by then)
3. **Applies universally** - Not just workflow vs product, but ANY boundary for ANY future project/phase/feature
4. **Forces classification** - Must answer what/when/who/how/why for EVERY change before execution
5. **Simple for humans** - Takes 5-10 minutes to define new boundaries
6. **Cannot be skipped** - Claude Code cannot bypass or forget to check

---

## Research Questions

1. **Industry Practices**: How do Anthropic, OpenAI, GitHub constrain AI agents in production? What do they use for real-time enforcement?

2. **Technical Mechanisms**: What tools/frameworks exist for immediate pre-execution validation? (Not CI/CD - too late. Not pre-commit hooks - still too late, tokens wasted.)

3. **Universal Framework**: How to create project-agnostic boundary definitions that work for any codebase/phase/feature?

4. **Classification Protocol**: What format forces AI to classify EVERY change (internal vs public, product vs workflow, etc.) before execution?

5. **Context-Proof Design**: How to make enforcement survive complete memory loss every 3-4 messages?

6. **AI Agent Psychology**: What makes LLMs violate constraints they explicitly acknowledged? How to prevent?

---

## Constraints

- **Timing**: Enforcement MUST happen before code written (not commit, not CI/CD)
- **Autonomy**: Must work autonomously, blocking Claude Code without human in loop for every change
- **Simplicity**: Human defines boundaries in 5-10 minutes max
- **Universal**: Works for ANY project, not specific to this one
- **Mandatory**: Claude Code cannot skip checks or proceed without classification

---

## Deliverables

1. **Research Report** (2-3 pages)
   - Industry best practices for constraining AI agents
   - Existing tools/frameworks for real-time enforcement
   - Comparative analysis of approaches
   - Recommended solution with rationale

2. **Solution Architecture**
   - Universal boundary definition format
   - Classification protocol (what/when/who/how/why questions)
   - Real-time enforcement mechanism
   - Context-reset survival strategy
   - Integration points with Claude Code

3. **Implementation Spec**
   - File formats and schemas
   - Enforcement algorithm/flowchart
   - Example boundary definitions
   - Test cases (including replay of my violation - should block `GET /api/workflow/status`)

4. **Artifacts**
   - Boundary definition templates
   - Classification checklists
   - Enforcement scripts/tools (if applicable)
   - Testing/validation framework

---

## Success Criteria

Your solution MUST:
- **Catch my violation**: Block creation of `GET /api/workflow/status` endpoint before code written
- **Work universally**: Apply to ANY future boundary (not just workflow vs product)
- **Survive context resets**: Function even when Claude Code forgets everything
- **Enforce immediately**: Stop violations before tokens wasted on implementation
- **Be practical**: Actually implementable, not theoretical
- **Be simple**: Human can define new boundary in 5-10 minutes

---

## Research Sources

Investigate:
- Anthropic's Claude Code constraints and safety mechanisms
- OpenAI's GPT agent guardrails and policies
- GitHub Copilot constraint systems
- Policy-as-code frameworks (OPA, Rego, etc.)
- Pre-execution validation patterns
- LLM prompt engineering for constraint enforcement
- AI safety research on goal alignment and constraint following
- Real-time validation in autonomous systems

---

## Test Case: My Violation

**What I did wrong**:
1. Read WHAT_IS_WHAT.md stating workflow = internal, product = public
2. Acknowledged boundary in response
3. Created `GET /api/workflow/status` (PUBLIC endpoint) exposing internal workflow state
4. Added `workflowMetadata?: WorkflowMetadata` to `ProgressSnapshot` type (PUBLIC type)

**What should have stopped me**:
- Before creating endpoint: "Is this INTERNAL or PUBLIC?"
- Before modifying type: "Does this expose INTERNAL state to PUBLIC API?"
- Classification: "workflow state" = INTERNAL, "API endpoint" = PUBLIC → VIOLATION → BLOCK

**Your solution must prevent this exact scenario.**

---

## Context Files

These files contain the boundaries I violated:
- `WHAT_IS_WHAT.md` - Defines WORKFLOW vs PRODUCT separation
- `docs/04_141024_todays_status.md/02_post_audit_new_plan.md` - Phase 3 plan I misinterpreted
- `docs/05_151024_todays_status.md/01_current_assesment.md` - Documents my violation and remediation
- `CLAUDE.md` - Project instructions with discovery-first protocol
- `.github/copilot-instructions.md` - AI agent rules

---

## Questions Before Starting

1. **Enforcement Level**: Should solution be documentation-based, tooling-based, or hybrid?
2. **Integration Point**: Where does enforcement hook into Claude Code's execution flow?
3. **Failure Mode**: What happens when Claude Code tries to bypass or encounters ambiguous case?
4. **Evolution**: How do boundaries get updated as project evolves?

**Note**: Let research determine answers - don't constrain solution space prematurely.

---

## Output Format

Submit findings as:
- `docs/guardrails/RESEARCH_FINDINGS.md` - Research report
- `docs/guardrails/SOLUTION_ARCHITECTURE.md` - Architecture design
- `docs/guardrails/IMPLEMENTATION_SPEC.md` - Implementation details
- `docs/guardrails/examples/` - Boundary definitions, test cases, enforcement examples

---

**Start with research, then design solution. Focus on practical, immediate enforcement that survives context resets.**
