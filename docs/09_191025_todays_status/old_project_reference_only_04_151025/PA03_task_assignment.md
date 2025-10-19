# Task Assignment: PA03 - Extend Payment Domain Model

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA03
**Duration:** 35 minutes
**Prerequisites:** PA02 complete

---

## 📋 Task Overview

Update the payment domain model class to include Spec v3 fields and expose them through getter methods. Ensure the domain model reflects the new repository schema.

---

## 📁 Files to Modify

**Primary file:**
```
services/payment-service/src/domain/payment.ts
```

**Related files (reference only):**
```
services/payment-service/src/repositories/payment-repository.ts (PA02 changes)
```

---

## 🔧 Changes Required

### 1. Extend Payment Class Constructor

**Add these optional parameters:**
```typescript
class Payment {
  // ... existing fields (keep all)

  // NEW Spec v3 fields:
  private readonly _taskId?: string;
  private readonly _bidId?: string;
  private readonly _customerFee?: number;
  private readonly _helperFeePercent?: number;
  private readonly _helperFee?: number;
  private readonly _helperNetPayout?: number;
  private readonly _cancellationFee?: number;
  private readonly _stripeTransferId?: string;

  constructor(props: {
    // ... existing props (keep all)
    taskId?: string;
    bidId?: string;
    customerFee?: number;
    helperFeePercent?: number;
    helperFee?: number;
    helperNetPayout?: number;
    cancellationFee?: number;
    stripeTransferId?: string;
  }) {
    // ... existing assignments
    this._taskId = props.taskId;
    this._bidId = props.bidId;
    this._customerFee = props.customerFee;
    this._helperFeePercent = props.helperFeePercent;
    this._helperFee = props.helperFee;
    this._helperNetPayout = props.helperNetPayout;
    this._cancellationFee = props.cancellationFee;
    this._stripeTransferId = props.stripeTransferId;
  }
}
```

### 2. Add Getter Methods

**Add public getters for new fields:**
```typescript
class Payment {
  // ... existing getters

  get taskId(): string | undefined {
    return this._taskId;
  }

  get bidId(): string | undefined {
    return this._bidId;
  }

  get customerFee(): number | undefined {
    return this._customerFee;
  }

  get helperFeePercent(): number | undefined {
    return this._helperFeePercent;
  }

  get helperFee(): number | undefined {
    return this._helperFee;
  }

  get helperNetPayout(): number | undefined {
    return this._helperNetPayout;
  }

  get cancellationFee(): number | undefined {
    return this._cancellationFee;
  }

  get stripeTransferId(): string | undefined {
    return this._stripeTransferId;
  }
}
```

### 3. Update toJSON() Method

**Add new fields to serialization:**
```typescript
toJSON() {
  return {
    // ... existing fields
    taskId: this._taskId,
    bidId: this._bidId,
    customerFee: this._customerFee,
    helperFeePercent: this._helperFeePercent,
    helperFee: this._helperFee,
    helperNetPayout: this._helperNetPayout,
    cancellationFee: this._cancellationFee,
    stripeTransferId: this._stripeTransferId,
  };
}
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Added 8 new private readonly fields to Payment class
- [ ] Added 8 new optional parameters to constructor
- [ ] Added 8 new getter methods for new fields
- [ ] Updated `toJSON()` method to include new fields
- [ ] Code compiles with zero TypeScript errors
- [ ] All existing tests still pass (no regression)
- [ ] Created evidence artifact for PA03

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

# 3. Verify getter methods exist
grep -n "get taskId\|get bidId\|get customerFee\|get helperFeePercent" \
  services/payment-service/src/domain/payment.ts
# Expected: Should show 8 getter methods

# 4. Verify toJSON includes new fields
grep -n "taskId:\|bidId:\|customerFee:\|helperFeePercent:" \
  services/payment-service/src/domain/payment.ts
# Expected: Should show new fields in toJSON method
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA03_domain_model.json`

**Template:**

```json
{
  "task_id": "PA03",
  "win_code": "WA03",
  "title": "Extend Payment Domain Model",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T11:05:00Z",
  "completed_at": "2025-10-15T11:40:00Z",
  "duration_minutes": 35,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Added 8 new private readonly fields",
    "Added 8 new optional constructor parameters",
    "Added 8 new getter methods",
    "Updated toJSON() method",
    "TypeScript compiles with zero errors",
    "All existing tests pass"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - X tests passed",
    "getters_added": 8,
    "toJSON_updated": true
  },
  "files_modified": [
    "services/payment-service/src/domain/payment.ts"
  ],
  "lines_added": 45,
  "lines_removed": 0,
  "notes": "Domain model extended for Spec v3. Ready for PA04.",
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

1. **Follow existing patterns** - Match the style of existing getters and constructor
2. **Keep fields private** - Use `private readonly` for encapsulation
3. **Use optional types** - All new fields should be `| undefined`
4. **Test serialization** - Verify `toJSON()` includes all new fields
5. **Check existing tests** - Update any tests that validate the Payment class structure

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] All 8 new fields added to Payment class
- [ ] All 8 new constructor parameters added
- [ ] All 8 new getter methods implemented
- [ ] `toJSON()` method updated with new fields
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes
- [ ] Evidence artifact created at `.automation/phase2/PA03_domain_model.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA03, proceed to **PA04** - Implement Fee Calculation Logic.

**⚠️ IMPORTANT:** PA04 is a **BLOCKING TASK**. Many later tasks depend on PA04's fee calculation logic. Ensure PA04 is completed and validated before proceeding to tasks that depend on it.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check existing Payment class structure for patterns
2. Verify all constructor parameters are properly assigned
3. Check existing tests in `services/payment-service/src/domain/__tests__/`
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA03 Task Assignment**
