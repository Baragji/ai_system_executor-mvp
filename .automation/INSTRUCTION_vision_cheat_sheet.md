# INSTRUCTION: Create Vision Cheat Sheet for Autonomous AI Coding System

**Date Created:** 2025-10-19  
**Status:** Ready for Execution  
**Executor:** AI Assistant  
**Validator:** GitHub Copilot  

---

## MISSION

Extract and synthesize vital information from old planning documents to create a concise "Vision Cheat Sheet" that captures the end-goal vision for a fully autonomous AI coding system. This document will be used by the owner (non-technical) to communicate with developers about what needs to be built.

---

## INPUT FILES TO READ

**Directory:** `docs/Goal_&_Vision_inspirational_only/01_Roadmaps_&_Agents`

**Read ALL files in this directory, including:**
- All `.md` files
- All subdirectories and their contents
- Pay special attention to files named with "roadmap", "spec", "vision", "autonomous", "agent", etc.

---

## EXTRACTION REQUIREMENTS

For each file you read, extract:

### 1. WHAT (Capabilities & Features)
- What does the system need to do?
- What features were planned?
- What problems does it solve?
- What workflows does it support?

### 2. WHY (Purpose & Goals)
- Why was this system conceived?
- What pain points does it address?
- What is the ultimate goal?
- What value does it provide?

### 3. HOW (Approach & Methodology)
- What technical approaches were considered?
- What patterns or architectures were mentioned?
- What tools or technologies were referenced?
- What integration points were discussed?

### 4. WHO (Stakeholders & Components)
- Who are the users?
- What agents/components are involved?
- What external systems integrate?
- Who makes decisions?

### 5. WHEN (Timeline & Phases)
- What phases were planned?
- What was the sequence of implementation?
- What dependencies exist?
- What milestones were defined?

### 6. CONSTRAINTS (What NOT to Do)
- What approaches were explicitly rejected?
- What technologies are forbidden?
- What boundaries must be respected?
- What tradeoffs were acknowledged?

---

## OUTPUT STRUCTURE

Create a file named: `VISION_CHEAT_SHEET.md`

**Location:** `docs/Goal_&_Vision_inspirational_only/`

**Use this exact structure:**

```markdown
# Vision Cheat Sheet: Autonomous AI Coding System
**Last Updated:** [DATE]  
**Source Files:** [List all files you analyzed]  
**Status:** Synthesized from historical planning documents

---

## 🎯 Vision Statement (The Big Picture)
[Write 1-2 paragraphs that capture the essence of what this system is meant to be]

---

## 🏆 Core Goals (What Success Looks Like)
[Numbered list of 3-7 core goals that define success]

1. 
2. 
3. 

---

## 🔧 Key Capabilities (What the System Must Do)

### Must-Have (Non-Negotiable)
[List capabilities that are absolutely required]
- 
- 

### Should-Have (High Priority)
[List capabilities that are very important but not blockers]
- 
- 

### Nice-to-Have (Future Enhancements)
[List capabilities that would be valuable but can wait]
- 
- 

---

## 🚫 Known Constraints (What We DON'T Want)
[List explicit constraints, forbidden approaches, or anti-patterns]
- 
- 

---

## 📊 Success Metrics (How We Know It Works)
[List measurable criteria that indicate the system is working as intended]
- 
- 

---

## 🏗️ High-Level Architecture Concepts
[Describe the general approach to building this - keep it simple]

### Core Components:
- 

### Key Integrations:
- 

### Decision-Making Flow:
- 

---

## 👥 Stakeholders & Users

### Primary Users:
- 

### System Components:
- 

### External Systems:
- 

---

## 📅 Implementation Philosophy
[Describe the general approach to phasing/implementation]

### Guiding Principles:
- 

### Phase Approach:
- 

---

## 🎓 Key Learnings from Planning
[Extract important insights, lessons, or realizations from the planning docs]

### What We Learned:
- 

### What We Avoided:
- 

### What We Prioritized:
- 

---

## 💡 Critical Decision Points
[List major architectural or strategic decisions that were made]

| Decision | Rationale | Impact |
|----------|-----------|--------|
|          |           |        |

---

## 📌 Quick Reference (TL;DR for Developers)

**In One Sentence:**
[The entire vision in one sentence]

**Top 3 Priorities:**
1. 
2. 
3. 

**Top 3 Constraints:**
1. 
2. 
3. 

**Success Looks Like:**
[One paragraph describing the ideal end state]

---

## 📚 Source Document Index
[List all files you analyzed with brief description of what each contributed]

- `filename.md` - [What you learned from this file]
- 

---

## 🔄 Next Steps for Developer Handoff

1. Review this cheat sheet with owner
2. Ask clarifying questions about ambiguities
3. Create technical specification based on this vision
4. Propose implementation roadmap
5. Validate against constraints and goals

---

**Note for Developers:** This document represents the owner's vision synthesized from historical planning. It is intentionally high-level and non-technical. Your job is to translate this vision into executable technical plans while respecting the constraints and goals outlined above.
```

---

## SYNTHESIS RULES

### DO:
✅ **Be Concise:** This is a cheat sheet, not a novel  
✅ **Be Clear:** Use simple language - owner is non-technical  
✅ **Be Comprehensive:** Capture all vital information  
✅ **Be Honest:** If documents conflict, note the discrepancy  
✅ **Be Structured:** Follow the template exactly  
✅ **Be Specific:** Include concrete examples where helpful  
✅ **Cross-Reference:** If multiple docs mention same thing, note that  
✅ **Highlight Patterns:** If you see recurring themes, emphasize them  

### DON'T:
❌ **Don't Assume:** Only include what's explicitly in the source files  
❌ **Don't Editorialize:** Don't add your opinions or suggestions  
❌ **Don't Skip:** Don't ignore files that seem redundant - they might have nuggets  
❌ **Don't Oversimplify:** Keep technical terms if they're important  
❌ **Don't Lose Context:** Preserve the "why" behind decisions  
❌ **Don't Make It Too Long:** If section exceeds 1 page, you're being too verbose  

---

## VALIDATION CHECKLIST

Before you consider the task complete, verify:

- [ ] I read ALL files in the specified directory (list them in output)
- [ ] I extracted information for all 6 categories (WHAT, WHY, HOW, WHO, WHEN, CONSTRAINTS)
- [ ] I followed the exact output structure provided
- [ ] The vision statement is clear and compelling (2 paragraphs max)
- [ ] Core goals are specific and measurable (3-7 items)
- [ ] Capabilities are categorized into Must/Should/Nice-to-Have
- [ ] Constraints are explicit and actionable
- [ ] Success metrics are measurable
- [ ] Architecture concepts are high-level but clear
- [ ] The TL;DR section could stand alone
- [ ] Source document index lists every file analyzed
- [ ] Document is under 10 pages when printed
- [ ] Language is accessible to non-technical owner
- [ ] No markdown formatting errors
- [ ] File is saved to: `docs/Goal_&_Vision_inspirational_only/VISION_CHEAT_SHEET.md`

---

## SUCCESS CRITERIA

This instruction is successfully executed when:

1. ✅ The cheat sheet file exists at the specified location
2. ✅ All source files have been read and indexed
3. ✅ The document follows the template structure exactly
4. ✅ A non-technical person can understand the vision
5. ✅ A developer can use it to start technical planning
6. ✅ All validation checklist items are confirmed
7. ✅ The document is ready for owner review

---

## EXECUTION COMMAND

```bash
# Step 1: List all files to be analyzed
find docs/Goal_&_Vision_inspirational_only/01_Roadmaps_&_Agents -type f -name "*.md"

# Step 2: Read each file and take notes

# Step 3: Create the output file using the template above

# Step 4: Validate against checklist

# Step 5: Report completion with file path
```

---

## DELIVERABLE

**File Path:** `docs/Goal_&_Vision_inspirational_only/VISION_CHEAT_SHEET.md`

**Format:** Markdown (`.md`)

**Expected Size:** 5-10 pages

**Tone:** Professional, clear, concise, non-technical where possible

---

## AFTER COMPLETION

Report back with:
1. ✅ Confirmation that file was created
2. 📍 Exact file path
3. 📊 Summary statistics (# of source files read, # of pages generated)
4. 🔍 Any conflicts or ambiguities found in source documents
5. 💡 Key themes or patterns you noticed

---

**END OF INSTRUCTION**
