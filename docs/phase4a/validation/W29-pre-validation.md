# W29-PRE — Decomposition Strategy Validation

## Strategy Outline
- **Approach**: feature-oriented decomposition with attention to lifecycle (setup → core features → quality gates → deployment).
- **Constraints**: produce 2-10 subtasks, actionable descriptions (10-500 chars), dependencies align with prerequisite work, avoid circular references.
- **Clarifications**: if prompt is ambiguous and no clarifications provided, return structured error recommending clarification (leverages phase 2 capability).
- **LLM Prompting**: supply explicit schema description, require JSON with fields defined by contract, include examples to reinforce format, instruct to respect dependency rules and include success criteria.

## Example Decompositions

### Flask Hello World
1. Setup environment → install Flask.
2. Implement route → return greeting.
3. Verify output → run server + test.
Dependencies: [2 ← 1], [3 ← {1,2}].

### Todo App with Auth
1. Gather requirements.
2. Scaffold backend.
3. Implement auth (depends on 2).
4. Implement todo CRUD (depends on 2 & 3).
5. Build frontend (depends on 3 & 4).
6. Write tests (depends on 3 & 4).
7. Prepare deployment (depends on 5 & 6).

### REST API for Blog
1. Define endpoints & models.
2. Scaffold project + database.
3. Implement auth (depends on 2).
4. Implement posts CRUD (depends on 2 & 3).
5. Implement comments (depends on 4).
6. Write tests (depends on 3-5).
7. Document API (depends on 4 & 6).

### E-commerce Site
Follow 10-step plan from W28-PRE with same dependency topology. Ensures coverage for max complexity.

## Validation
- Strategy produces actionable, layered subtasks.
- Subtask counts align with prompt complexity.
- Dependencies acyclic and reflect prerequisite flows.
- Approach handles prompts of varying specificity; ambiguous prompts trigger clarification path.
