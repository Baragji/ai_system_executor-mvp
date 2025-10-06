# W28-PRE — Task Plan Contract Design Validation

## Example Task Plans

### Simple: Build Flask Hello World
- **Original prompt**: "build Flask hello world"
- **Subtasks**:
  1. `setup-environment` — Create virtualenv, install Flask, scaffold project.
  2. `implement-endpoint` — Add `/` route returning "Hello, world!".
  3. `run-and-verify` — Run server locally, verify response.
- **Dependencies**:
  - `implement-endpoint` depends on `setup-environment`.
  - `run-and-verify` depends on both `setup-environment` and `implement-endpoint`.

### Medium: Build Todo App with Auth
- **Subtasks** (5-7 subtasks target):
  1. `define-requirements` — Clarify todo features & auth requirements.
  2. `scaffold-backend` — Set up project, database connection.
  3. `implement-auth` — Add signup/login with password hashing.
  4. `implement-todo-crud` — CRUD endpoints for tasks tied to users.
  5. `implement-frontend` — Basic UI with login and todo list.
  6. `write-tests` — Integration tests for auth + todo flows.
  7. `deploy-instructions` — Provide deployment steps.
- **Dependencies**:
  - `implement-auth` depends on `scaffold-backend`.
  - `implement-todo-crud` depends on `scaffold-backend` and `implement-auth`.
  - `implement-frontend` depends on `define-requirements`, `implement-auth`, and `implement-todo-crud`.
  - `write-tests` depends on `implement-auth` and `implement-todo-crud`.
  - `deploy-instructions` depends on `implement-frontend` and `write-tests`.

### Complex: Build E-commerce Site
- **Subtasks** (8-10 subtasks target):
  1. `gather-requirements`
  2. `design-database`
  3. `implement-auth`
  4. `implement-product-catalog`
  5. `implement-cart-checkout`
  6. `integrate-payment`
  7. `implement-order-management`
  8. `implement-admin-dashboard`
  9. `write-tests`
  10. `deploy-plan`
- **Dependencies**:
  - `design-database` depends on `gather-requirements`.
  - `implement-auth` depends on `design-database`.
  - `implement-product-catalog` depends on `design-database`.
  - `implement-cart-checkout` depends on `implement-product-catalog` and `implement-auth`.
  - `integrate-payment` depends on `implement-cart-checkout`.
  - `implement-order-management` depends on `integrate-payment`.
  - `implement-admin-dashboard` depends on `implement-order-management` and `implement-product-catalog`.
  - `write-tests` depends on `implement-auth`, `implement-product-catalog`, and `implement-cart-checkout`.
  - `deploy-plan` depends on `write-tests`.

## Field & Rule Decisions
- Each subtask needs: `id`, `title`, `description`, `status`, `dependencies`, `estimatedComplexity`, `successCriteria`.
- `status` enumerates `pending | in_progress | completed | failed` to align with execution tracking.
- `dependencies` is an array of subtask IDs (strings) and may be empty; IDs must reference another subtask within the same plan.
- The plan holds `originalPrompt`, `subtasks`, `totalSubtasks`, and optional `decompositionStrategy` notes.
- Subtask counts: minimum 2, maximum 10.
- Subtask IDs follow `^[a-z0-9-]+$`, must be unique within a plan.
- Descriptions between 10 and 500 chars ensure clarity without over-granularity.
- `estimatedComplexity` uses `low|medium|high` buckets for future scheduling heuristics.
- `successCriteria` captures acceptance conditions per subtask for validator use.

## Validation Rules
1. Schema-level checks enforce structure (required fields, enumerations, array bounds).
2. Custom validator will ensure:
   - Unique subtask IDs.
   - Dependency IDs exist.
   - No circular dependency chains.
3. Plans must reflect overall prompt: validator will compare keywords from prompt against subtask coverage.
4. Plans with <2 or >10 subtasks are rejected.

## Outcome
Structure handles simple, medium, and complex cases above. Dependencies are expressible as arrays of IDs, and validation rules prevent degenerate plans (single step, circular references, dangling dependencies).
