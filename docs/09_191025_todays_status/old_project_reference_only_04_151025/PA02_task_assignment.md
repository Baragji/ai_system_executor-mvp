# Task Assignment: PA02 - Extend Payment Repository Schema

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA02
**Duration:** 35 minutes
**Prerequisites:** PA01 complete

---

## 📋 Task Overview

Extend the payment repository interface and in-memory implementation to support Spec v3 fields: task/bid IDs, fees, helper payout, Stripe transfer ID, and new payment statuses.

---

## 📁 Files to Modify

**Primary file:**
```
services/payment-service/src/repositories/payment-repository.ts
```

**Related files (reference only):**
```
services/payment-service/src/domain/payment.ts
```

---

## 🔧 Changes Required

### 1. Extend PaymentStatus Type

**Current:**
```typescript
type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
```

**Add these statuses:**
```typescript
type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'failed'
  | 'captured_held_for_job'      // NEW: Payment held after bid acceptance
  | 'transferred_to_helper'      // NEW: Payment transferred to helper
  | 'held_for_dispute';          // NEW: Payment held during dispute
```

### 2. Extend PaymentIntentRecord Interface

**Add these fields:**
```typescript
interface PaymentIntentRecord {
  // ... existing fields (keep all)

  // NEW Spec v3 fields:
  taskId?: string;              // Reference to task (replaces bookingId)
  bidId?: string;               // Reference to accepted bid
  customerFee?: number;         // 13% customer fee (≤119 DKK)
  helperFeePercent?: number;    // Helper tier fee (10-20%)
  helperFee?: number;           // Calculated helper fee amount
  helperNetPayout?: number;     // Helper receives (amount - helperFee)
  cancellationFee?: number;     // 10% cancellation fee (≤150 DKK)
  stripeTransferId?: string;    // Stripe transfer ID after payout
}
```

### 3. Update In-Memory Implementation

Update `InMemoryPaymentRepository` class:

**a) Update `create()` method:**
- Accept new optional fields in PaymentIntentRecord parameter
- Store new fields in the in-memory map

**b) Update `findById()` method:**
- Return records with new fields included

**c) Update `update()` method:**
- Accept new fields in the partial update parameter
- Merge new fields into existing records

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Added 3 new payment statuses: `captured_held_for_job`, `transferred_to_helper`, `held_for_dispute`
- [ ] Added 8 new optional fields to `PaymentIntentRecord` interface
- [ ] Updated `InMemoryPaymentRepository.create()` to accept new fields
- [ ] Updated `InMemoryPaymentRepository.update()` to accept new fields
- [ ] Updated `InMemoryPaymentRepository.findById()` to return new fields
- [ ] Code compiles with zero TypeScript errors
- [ ] All existing tests still pass (no regression)
- [ ] Created evidence artifact for PA02

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check payment service
npm --workspace services/payment-service run typecheck
# Expected: No type errors

# 2. Run payment service unit tests
npm --workspace services/payment-service test
# Expected: All tests pass

# 3. Verify schema changes
grep -n "captured_held_for_job\|transferred_to_helper\|held_for_dispute" \
  services/payment-service/src/repositories/payment-repository.ts
# Expected: Should show 3 new statuses

# 4. Verify new fields
grep -n "taskId\|bidId\|customerFee\|helperFeePercent" \
  services/payment-service/src/repositories/payment-repository.ts
# Expected: Should show new fields in interface
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA02_repository_schema.json`

**Template:**

```json
{
  "task_id": "PA02",
  "win_code": "WA02",
  "title": "Extend Payment Repository Schema",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T10:30:00Z",
  "completed_at": "2025-10-15T11:05:00Z",
  "duration_minutes": 35,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Added 3 new payment statuses",
    "Added 8 new optional fields to PaymentIntentRecord",
    "Updated InMemoryPaymentRepository.create()",
    "Updated InMemoryPaymentRepository.update()",
    "Updated InMemoryPaymentRepository.findById()",
    "TypeScript compiles with zero errors",
    "All existing tests pass"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - X tests passed",
    "new_statuses_found": 3,
    "new_fields_found": 8
  },
  "files_modified": [
    "services/payment-service/src/repositories/payment-repository.ts"
  ],
  "lines_added": 25,
  "lines_removed": 0,
  "notes": "Repository schema extended for Spec v3. Ready for PA03.",
  "issues_encountered": []
}
```

---

## ⏱️ Time Box

**Maximum time:** 35 minutes

If you exceed 35 minutes, stop and report:
- What you've completed
- What's blocking you
- Estimated time needed to complete

---

## 💡 Implementation Tips

1. **Don't remove existing fields** - Only ADD new fields
2. **Keep bookingId** - We'll deprecate it later, but keep for backward compatibility
3. **Make new fields optional** - Use `?` to avoid breaking existing code
4. **Test as you go** - Run `npm --workspace services/payment-service run typecheck` after each change
5. **Check existing tests** - If tests fail, fix them before proceeding

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] All 3 new statuses added to PaymentStatus type
- [ ] All 8 new fields added to PaymentIntentRecord interface
- [ ] InMemoryPaymentRepository updated (create, update, findById)
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes
- [ ] Evidence artifact created at `.automation/phase2/PA02_repository_schema.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA02, proceed to **PA03** - Extend Payment Domain Model.

**Note:** PA03 is NOT blocked. You can proceed immediately after completing PA02.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check existing `PaymentIntentRecord` interface for field naming conventions
2. Verify TypeScript strict mode is enabled
3. Check existing tests in `services/payment-service/src/repositories/__tests__/`
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA02 Task Assignment**
