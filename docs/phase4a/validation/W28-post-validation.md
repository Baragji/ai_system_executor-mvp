# W28-POST — Task Plan Contract Quality Validation

## Validation Procedure
1. Authored JSON task plans for three representative prompts (Flask hello world, todo app with auth, e-commerce site).
2. Ran each through `validateTaskPlan` to confirm schemas + custom rules accept valid plans.
3. Crafted invalid plans to exercise rejection paths: single subtask, >10 subtasks, circular dependencies, dangling dependencies, duplicate IDs.
4. Captured error messages to ensure they are actionable.

## Results Summary

| Scenario | Expected | Result | Notes |
| --- | --- | --- | --- |
| Flask hello world (3 subtasks) | Pass | Pass | Validation succeeded; dependencies resolved, total count matched. |
| Todo app with auth (7 subtasks) | Pass | Pass | Complex dependency graph accepted; ensures mid-complex plan works. |
| E-commerce site (10 subtasks) | Pass | Pass | Max-length plan validated, confirming upper bound handling. |
| Single subtask plan | Fail | Fail | Error `totalSubtasks ... must equal subtasks length` surfaced. |
| 11 subtasks | Fail | Fail | Schema rejected with `must NOT have more than 10 items`. |
| Circular dependency (A↔B) | Fail | Fail | Custom error `Circular dependency detected: a -> b -> a`. |
| Missing dependency ID | Fail | Fail | Custom error `depends on unknown subtask`. |
| Duplicate IDs | Fail | Fail | Custom error `Subtask id 'dup' is duplicated`. |

All invalid scenarios emitted specific messages instructing how to fix the plan. No regressions observed during validation.
