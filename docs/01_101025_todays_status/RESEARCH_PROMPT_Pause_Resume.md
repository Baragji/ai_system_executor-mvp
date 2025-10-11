# Research Prompt: Production-Grade Pause/Resume for Long-Running API Jobs

**Target Audience**: AI Research Assistant with web search + academic database access  
 October 2025 (latest best practices)  
**Domain**: Backend architecture for resumable async job execution  
**Criticality**: Production-quality pattern needed (not experimental)

---

## Research Objective

Find the **industry-standard architectural pattern** for implementing pause/resume functionality in an **AI agent system** (Node.js/TypeScript) that:
1. Executes long-running code generation jobs (minutes to hours)
2. Supports pause/resume with **LLM context continuity**
3. Allows LLM to read/understand partial output when resuming
4. Survives server restarts
5. Used in production by AI coding assistants (Replit Agent, Cursor, etc.)

---

## Context: Our Use Case

We're building an **AI code generation system** with these characteristics:

**Architecture**:
- Backend: Node.js 20+ with Express + TypeScript
- Jobs: Generate entire software projects via LLM calls
- Duration: 1-30 minutes per job (multiple LLM calls @ 30s-2min each)
- Stack: No Python, no frameworks (vanilla JS frontend), Vitest testing

**Current Implementation** (Partially Working):
- ✅ State machine: CLARIFYING → PLANNING → GENERATING → TESTING → COMPLETED
- ✅ Checkpoint system: Saves state to JSON, can load and resume
- ✅ Abort signals: Can detect when pause requested
- ❌ HTTP coordination: /api/execute returns 202 when paused, resume can't wake it up

**The REAL Problem** (discovered through testing):
```
[User] → POST /api/execute → [Start generating project]
                                    ↓
                           [Generates files: package.json, src/, tests/...]
                                    ↓
[User] → POST /api/pause → [Set state = PAUSED]
                                    ↓
                           [/api/execute returns 202]
                                    ↓
                           ❌ Execution DEAD
                                    ↓
[User] → POST /api/resume with adjustments → [Update state]
                                    ↓
                           ❌ LLM has NO CONTEXT of what was generated!
                                    ↓
                           ❌ Can't read output/ directory
                           ❌ Can't continue seamlessly
```

**What We Need**:
1. Pattern for LLM to understand partial state when resuming
2. How to give LLM context of generated files
3. How Replit Agent v3 actually implements pause/continue
4. File system as agent memory pattern

---

## Key Research Questions

### 1. Industry Standard Patterns (Priority: HIGH)

**Question**: What are the TOP 3 most common architectural patterns for handling pause/resume of long-running API jobs as of October 2025?

**Search Terms**:
- "pause resume long running jobs node.js 2025"
- "resumable async jobs architecture best practices"
- "job queue pause resume pattern"
- "background job orchestration pause"

**Required Info**:
- Pattern name
- How it works (brief architecture diagram/flow)
- Pros/cons of each pattern
- When to use each
- Production examples (which companies use it)

**Expected Patterns** (validate these or find better):
- Job Queue Pattern (e.g., BullMQ with Redis)
- Event-Driven Coordination (EventEmitter/PubSub)
- Async Generator Pattern (yield for pause points)
- Actor Model (Temporal.io, Inngest)

---

### 2. Job Queue Libraries (Priority: HIGH)

**Question**: What are the most popular and production-ready job queue libraries for Node.js in October 2025?

**Search Terms**:
- "best node.js job queue 2025"
- "BullMQ vs Bee-Queue vs Agenda"
- "job queue library comparison 2025"
- "resume pause job queue node"

**Required Info for Top 3 Libraries**:
- Library name + GitHub stars + npm downloads
- Does it support pause/resume natively?
- Does it support checkpointing?
- Dependencies (Redis, PostgreSQL, etc.)
- Production adoption (which companies use it)
- TypeScript support quality
- Memory footprint / performance
- Durability guarantees (survives crashes)

**Libraries to Investigate**:
- BullMQ (suspected top choice)
- Bee-Queue
- Agenda
- Temporal (workflow engine)
- Inngest
- Others from 2024-2025

---

### 3. AI Agent Pause/Continue Patterns (Priority: CRITICAL ⭐⭐⭐)

**Question**: How do AI coding assistants (Replit Agent v3, Cursor, Codium, etc.) handle pause/continue with LLM context preservation?

**Search Terms**:
- "replit agent v3 architecture pause continue"
- "replit agent pause resume implementation"
- "cursor ai agent pause continue"
- "ai agent partial state context llm"
- "llm context continuity agent systems"
- "ai coding assistant architecture 2025"

**CRITICAL INFO NEEDED**:
- **Replit Agent v3 specifically**: How does pause work? How does continue maintain context?
- When user clicks "continue" with adjustments, how does LLM know what was already generated?
- Does LLM read the output directory? How?
- What context is passed to resumed LLM call?
- File system as agent memory pattern
- Primitives for LLM to READ/WRITE/MODIFY generated files

**User's Insight** (from real testing):
> "Replit Agent v3 just stops the entire process, but when you continue and maybe add adjustment instruction, the new LLM call is smart enough to inject the correct data/context so the LLM can proceed seamlessly."

**Our Gap**:
- ❌ LLM has NO direct access to read generated output
- ❌ Files generated during pause are "hanging" somewhere
- ❌ Resume doesn't give LLM context of partial state
- ❌ Can't continue seamlessly like Replit does

**This is THE fundamental architecture gap we need to solve!**

---

### 4. LLM Context Continuity (Priority: CRITICAL ⭐⭐⭐)

**NEW QUESTION**: How do AI agent systems maintain LLM context across interruptions/restarts?

**Search Terms**:
- "llm context continuity ai agents"
- "partial state context llm resume"
- "ai agent memory architecture"
- "llm reads generated files context"
- "file system as llm context"

**Required Info**:
- How to give LLM context of partially generated project?
- Pattern: "Read output directory, understand state, continue"
- Do agents use structured context (JSON) or file reading?
- How to handle large file trees (too big for LLM context)?
- Incremental context updates vs full state snapshots
- Tools/primitives for LLM file access (read, write, modify)

**Expected Patterns**:
- LLM has read_file tool to inspect output
- System provides summary of generated files in prompt
- Diff-based: "Here's what changed since last call"
- Checkpoint includes generated file tree + metadata

---

### 5. Checkpoint Strategy (Priority: MEDIUM)

**Question**: What are best practices for checkpointing long-running jobs to enable resume after pause/crash?

**Search Terms**:
- "job checkpointing best practices 2025"
- "resumable computation checkpoint strategy"
- "saga pattern checkpoint"
- "workflow engine checkpoint"

**Required Info**:
- How often to checkpoint? (every step, time-based, manual)
- What to store in checkpoint? (full state, delta, pointers)
- Where to store? (Redis, PostgreSQL, filesystem, S3)
- How to handle checkpoint size growth?
- How to version checkpoints (schema evolution)?

---

### 6. HTTP Request Coordination (Priority: LOW)

**Question**: When a long-running job is triggered via HTTP POST, how should the API coordinate between the HTTP request/response and the background job?

**Search Terms**:
- "http request background job pattern"
- "api long running job best practice"
- "http 202 accepted pattern job queue"
- "webhook callback pattern async jobs"

**Required Patterns**:
- **Immediate Response + Polling**: Return 202 immediately, client polls /status
- **Long Polling**: Keep HTTP open, wait for completion (up to timeout)
- **WebSocket**: Bidirectional for control messages (pause/resume/cancel)
- **Server-Sent Events (SSE)**: Server pushes progress updates
- **Webhook**: Job posts back to callback URL when done

**For Our Use Case**: We already have SSE (/api/progress/:sessionId), so we're leaning toward "immediate 202 + SSE updates". Validate if this is correct for pause/resume.

---

### 7. Aborting Long-Running Operations (Priority: MEDIUM)

**Question**: How do you interrupt/abort long-running operations (e.g., LLM API calls that take 30s-10min) when pause is requested?

**Search Terms**:
- "abort long running http request node.js"
- "cancel openai api call abortcontroller"
- "interrupt async operation node"
- "promise cancellation pattern 2025"

**Required Info**:
- Does AbortController work with fetch for LLM APIs? (OpenAI, Anthropic)
- What if LLM call is already in-flight? (can't abort HTTP, must wait?)
- Pattern: Poll for abort signal during long operation?
- Pattern: Wrap operation in Promise.race with abort promise?
- How do production systems handle "uninterruptible" operations?

**Our Current Gap**: We check for pause **between** operations, not **during** them. If an LLM call takes 10 minutes, user waits 10 minutes for pause to take effect.

---

### 8. Distributed Coordination (Priority: LOW)

**Question**: If we scale to multiple worker processes/servers, how do pause/resume commands reach the correct worker executing the job?

**Search Terms**:
- "distributed job pause coordination"
- "redis pubsub job control"
- "worker pool pause resume pattern"
- "job queue multiple workers pause"

**Required Info**:
- How does BullMQ (or similar) coordinate pause across workers?
- Is Redis PubSub used for control messages?
- How to ensure exactly-once job execution?
- How to handle worker crashes during paused state?

---

### 9. Error Handling & Edge Cases (Priority: LOW)

**Question**: What edge cases must be handled for production-quality pause/resume?

**Required Scenarios**:
- User pauses during LLM call (can't interrupt)
- User pauses, then resumes immediately (before pause takes effect)
- User pauses, server crashes, then resumes (durability)
- User pauses, then clicks cancel instead (abort cleanup)
- Multiple pause requests (idempotency)
- Resume without pause (error handling)
- Pause while already paused (double pause)

**Search Terms**:
- "pause resume edge cases"
- "job queue error handling patterns"
- "idempotent pause resume"

---

### 10. Testing Strategies (Priority: LOW)

**Question**: How to test pause/resume functionality reliably?

**Search Terms**:
- "testing pause resume jobs"
- "job queue testing patterns"
- "mocking long running operations test"

**Required Info**:
- How to simulate pause at specific points (deterministic testing)?
- How to test race conditions (pause during operation)?
- How to test durability (crash recovery)?

---

### 11. Code Examples (Priority: HIGH)

**Question**: Find working code examples of pause/resume in Node.js + TypeScript projects.

**Required**:
- Open-source projects using BullMQ or similar with pause/resume
- GitHub repos with >100 stars
- Examples showing:
  - Job definition with pause points
  - Pause endpoint implementation
  - Resume endpoint implementation
  - Checkpoint save/load
  - Error handling

**Search Terms**:
- "BullMQ pause resume example github"
- "node.js resumable job example"
- "temporal workflow pause example"

---

## Output Format Requested

Please provide results in this structure:

### 1. Executive Summary (1 paragraph)
*The recommended approach for our use case, with reasoning*

### 2. Top 3 Patterns Comparison Table
| Pattern | Pros | Cons | Complexity | Production Examples | Recommended? |
|---------|------|------|------------|---------------------|--------------|
| ...     | ...  | ...  | ...        | ...                 | ...          |

### 3. Recommended Library (if job queue pattern chosen)
- Name
- Why this one over alternatives
- Installation: `npm install ...`
- Quick start code example (TypeScript)
- Pause/resume code example
- Checkpoint configuration

### 4. Implementation Checklist
- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...
- [ ] ...

### 5. Code Examples
*Annotated examples showing:*
- Job definition
- Pause implementation
- Resume implementation
- Checkpoint save/load
- Error handling

### 6. Migration Path from Current Code
*How to migrate from our current state machine + checkpoint approach to recommended pattern*

### 7. Testing Strategy
*How to test the implementation*

### 8. Edge Cases & Handling
*List of edge cases with recommended handling*

### 9. Resources
- Blog posts / architecture docs
- GitHub repos (working examples)
- Comparison articles
- Official docs

---

## Priority Ordering

If time-limited, research in this order:

**CRITICAL (Must Answer)**:
1. **Question 3**: AI Agent Pause/Continue (Replit v3, Cursor) - HOW DO THEY DO IT?
2. **Question 4**: LLM Context Continuity - How LLM maintains context across resume
3. **Question 11**: Code Examples - Need working reference for AI agent patterns

**HIGH (Foundation)**:
4. **Question 1**: Standard patterns (validate overall approach)
5. **Question 2**: Job queue libraries (if pattern requires it)
6. **Question 5**: Checkpoint strategy (optimize what we have)

**MEDIUM (Technical Details)**:
7. **Question 7**: Aborting long operations (interrupt LLM calls)
8. **Question 9**: Edge cases (robustness)

**LOW (Nice to Have)**:
9. **Question 6**: HTTP coordination (already have SSE)
10. **Question 8**: Distributed coordination (future-proofing)
11. **Question 10**: Testing (can figure out later)

**THE KEY INSIGHT**: Focus on how AI coding agents (Replit, Cursor) handle LLM context continuity, NOT traditional job queue patterns!

---

## Constraints & Requirements

**MUST HAVE**:
- ✅ Node.js 20+ compatible
- ✅ TypeScript support
- ✅ Works with Express
- ✅ Survives server restarts (durable checkpoints)
- ✅ Production-ready (used in real companies)
- ✅ Good documentation + examples

**NICE TO HAVE**:
- ✅ Minimal dependencies
- ✅ Low memory footprint
- ✅ Active maintenance (2024-2025 updates)
- ✅ PostgreSQL option (vs Redis-only)

**MUST AVOID**:
- ❌ Python dependencies
- ❌ Experimental/alpha libraries
- ❌ Requires cloud vendor lock-in (AWS-only, etc.)
- ❌ Overly complex (PhD-level complexity)

---

## Success Criteria

Research is successful if it provides:
1. Clear recommendation: "Use pattern X with library Y"
2. Working code example we can adapt
3. Implementation checklist (step-by-step)
4. Confidence that approach is production-proven
5. Migration path from current code

---

## Researcher Instructions

1. **Search broadly first**: Get overview of landscape (2024-2025 articles)
2. **Deep-dive on top 3**: Compare patterns/libraries in detail
3. **Validate with examples**: Find working GitHub repos
4. **Synthesize recommendation**: Pick ONE approach and justify
5. **Provide implementation guide**: Actionable steps for developer

**Estimated Research Time**: 1-2 hours

**Deliverable**: Markdown document following output format above

---

## Questions to Clarify with Researcher

If any of these are ambiguous, researcher should:
1. Document assumptions made
2. Provide alternatives if unclear
3. Ask for clarification before deep-dive

**Good luck! This research will save us hours of trial-and-error.**
