# Task Assignment: PA04 - Implement Fee Calculation Logic

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA04
**Duration:** 45 minutes
**Prerequisites:** PA03 complete
**⚠️ BLOCKING TASK:** Many tasks depend on this

---

## 📋 Task Overview

Create a new fee calculation module that implements Spec v3 fee logic: customer fee (13%, ≤119 DKK), helper tier fees (10-20%), and cancellation fee (10%, ≤150 DKK).

---

## 📁 Files to Create

**New file:**
```
services/payment-service/src/utils/fee-calculator.ts
```

**Test file:**
```
services/payment-service/src/utils/__tests__/fee-calculator.test.ts
```

---

## 🔧 Implementation Required

### 1. Create Fee Calculator Module

**File:** `services/payment-service/src/utils/fee-calculator.ts`

```typescript
/**
 * Fee Calculator for Spec v3
 *
 * Customer fee: 13% with cap at 119 DKK
 * Helper fee: Tier-based (10%, 12.7%, 16.4%, 20%)
 * Cancellation fee: 10% with cap at 150 DKK
 */

export type HelperTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface FeeCalculationResult {
  customerFee: number;      // 13% of amount (≤119 DKK)
  helperFeePercent: number; // Tier-based percentage
  helperFee: number;        // Calculated from amount
  helperNetPayout: number;  // amount - helperFee
  totalFees: number;        // customerFee + helperFee
}

export interface CancellationFeeResult {
  cancellationFee: number;  // 10% of amount (≤150 DKK)
}

/**
 * Calculate all fees for a task payment
 * @param amount - Task amount in DKK (smallest currency unit, e.g., øre)
 * @param helperTier - Helper's tier (bronze, silver, gold, platinum)
 * @returns Fee calculation breakdown
 */
export function calculateFees(
  amount: number,
  helperTier: HelperTier
): FeeCalculationResult {
  // Customer fee: 13% with cap at 119 DKK (11900 øre)
  const customerFeeRaw = Math.round(amount * 0.13);
  const customerFee = Math.min(customerFeeRaw, 11900);

  // Helper fee: Tier-based
  const helperFeePercent = getHelperFeePercent(helperTier);
  const helperFee = Math.round(amount * helperFeePercent);
  const helperNetPayout = amount - helperFee;

  const totalFees = customerFee + helperFee;

  return {
    customerFee,
    helperFeePercent,
    helperFee,
    helperNetPayout,
    totalFees,
  };
}

/**
 * Calculate cancellation fee
 * @param amount - Task amount in DKK (smallest currency unit, e.g., øre)
 * @returns Cancellation fee (10% with cap at 150 DKK)
 */
export function calculateCancellationFee(amount: number): CancellationFeeResult {
  // Cancellation fee: 10% with cap at 150 DKK (15000 øre)
  const cancellationFeeRaw = Math.round(amount * 0.10);
  const cancellationFee = Math.min(cancellationFeeRaw, 15000);

  return { cancellationFee };
}

/**
 * Get helper fee percentage based on tier
 * @param helperTier - Helper's tier
 * @returns Fee percentage (decimal)
 */
function getHelperFeePercent(helperTier: HelperTier): number {
  const tierFees: Record<HelperTier, number> = {
    bronze: 0.20,    // 20.0%
    silver: 0.164,   // 16.4%
    gold: 0.127,     // 12.7%
    platinum: 0.102, // 10.2%
  };

  return tierFees[helperTier];
}
```

### 2. Create Unit Tests

**File:** `services/payment-service/src/utils/__tests__/fee-calculator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateFees,
  calculateCancellationFee,
  type HelperTier,
} from '../fee-calculator';

describe('Fee Calculator', () => {
  describe('calculateFees', () => {
    it('should calculate customer fee at 13% with cap at 119 DKK', () => {
      // Amount: 1000 DKK (100000 øre)
      // Customer fee: 13% = 130 DKK, but capped at 119 DKK
      const result = calculateFees(100000, 'bronze');
      expect(result.customerFee).toBe(11900); // 119 DKK
    });

    it('should calculate customer fee below cap', () => {
      // Amount: 500 DKK (50000 øre)
      // Customer fee: 13% = 65 DKK (no cap applied)
      const result = calculateFees(50000, 'bronze');
      expect(result.customerFee).toBe(6500); // 65 DKK
    });

    it('should calculate bronze tier helper fee at 20%', () => {
      const result = calculateFees(100000, 'bronze');
      expect(result.helperFeePercent).toBe(0.20);
      expect(result.helperFee).toBe(20000); // 200 DKK
      expect(result.helperNetPayout).toBe(80000); // 800 DKK
    });

    it('should calculate silver tier helper fee at 16.4%', () => {
      const result = calculateFees(100000, 'silver');
      expect(result.helperFeePercent).toBe(0.164);
      expect(result.helperFee).toBe(16400); // 164 DKK
      expect(result.helperNetPayout).toBe(83600); // 836 DKK
    });

    it('should calculate gold tier helper fee at 12.7%', () => {
      const result = calculateFees(100000, 'gold');
      expect(result.helperFeePercent).toBe(0.127);
      expect(result.helperFee).toBe(12700); // 127 DKK
      expect(result.helperNetPayout).toBe(87300); // 873 DKK
    });

    it('should calculate platinum tier helper fee at 10.2%', () => {
      const result = calculateFees(100000, 'platinum');
      expect(result.helperFeePercent).toBe(0.102);
      expect(result.helperFee).toBe(10200); // 102 DKK
      expect(result.helperNetPayout).toBe(89800); // 898 DKK
    });

    it('should calculate total fees correctly', () => {
      const result = calculateFees(100000, 'bronze');
      expect(result.totalFees).toBe(31900); // 119 + 200 DKK
    });
  });

  describe('calculateCancellationFee', () => {
    it('should calculate cancellation fee at 10% with cap at 150 DKK', () => {
      // Amount: 2000 DKK (200000 øre)
      // Cancellation fee: 10% = 200 DKK, but capped at 150 DKK
      const result = calculateCancellationFee(200000);
      expect(result.cancellationFee).toBe(15000); // 150 DKK
    });

    it('should calculate cancellation fee below cap', () => {
      // Amount: 1000 DKK (100000 øre)
      // Cancellation fee: 10% = 100 DKK (no cap applied)
      const result = calculateCancellationFee(100000);
      expect(result.cancellationFee).toBe(10000); // 100 DKK
    });

    it('should handle small amounts correctly', () => {
      // Amount: 50 DKK (5000 øre)
      // Cancellation fee: 10% = 5 DKK
      const result = calculateCancellationFee(5000);
      expect(result.cancellationFee).toBe(500); // 5 DKK
    });
  });
});
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Created `services/payment-service/src/utils/fee-calculator.ts` with all functions
- [ ] Implemented `calculateFees()` with customer fee (13%, ≤119 DKK)
- [ ] Implemented `calculateFees()` with helper tier fees (10.2-20%)
- [ ] Implemented `calculateCancellationFee()` (10%, ≤150 DKK)
- [ ] Created comprehensive unit tests (≥90% coverage)
- [ ] All tests pass
- [ ] Code compiles with zero TypeScript errors
- [ ] No regression in existing tests
- [ ] Created evidence artifact for PA04

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check payment service
npm --workspace services/payment-service run typecheck
# Expected: No type errors

# 2. Run fee calculator tests
npm --workspace services/payment-service test -- fee-calculator
# Expected: All tests pass

# 3. Check test coverage
npm --workspace services/payment-service test -- --coverage fee-calculator
# Expected: ≥90% coverage

# 4. Run all payment service tests (regression check)
npm --workspace services/payment-service test
# Expected: All tests pass

# 5. Verify module exports
grep -n "export function calculateFees\|export function calculateCancellationFee" \
  services/payment-service/src/utils/fee-calculator.ts
# Expected: Should show both export statements
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA04_fee_calculator.json`

**Template:**

```json
{
  "task_id": "PA04",
  "win_code": "WA04",
  "title": "Implement Fee Calculation Logic",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T11:40:00Z",
  "completed_at": "2025-10-15T12:25:00Z",
  "duration_minutes": 45,
  "status": "COMPLETED",
  "blocking_task": true,
  "acceptance_criteria_met": [
    "Created fee-calculator.ts module",
    "Implemented calculateFees() with customer fee logic",
    "Implemented calculateFees() with helper tier fees",
    "Implemented calculateCancellationFee()",
    "Created comprehensive unit tests",
    "All tests pass (X tests)",
    "Test coverage ≥90%",
    "TypeScript compiles with zero errors",
    "No regression in existing tests"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - X tests passed",
    "coverage": "95%",
    "regression_check": "PASS - all tests pass"
  },
  "files_created": [
    "services/payment-service/src/utils/fee-calculator.ts",
    "services/payment-service/src/utils/__tests__/fee-calculator.test.ts"
  ],
  "lines_added": 150,
  "test_results": {
    "total_tests": 10,
    "passed": 10,
    "failed": 0
  },
  "notes": "Fee calculation logic implemented and tested. This is a blocking task - many downstream tasks depend on this module.",
  "issues_encountered": []
}
```

---

## ⏱️ Time Box

**Maximum time:** 45 minutes

If you exceed 45 minutes, stop and report:
- What you've completed
- What's blocking you
- Estimated time needed to complete

---

## 💡 Implementation Tips

1. **Currency handling:** All amounts are in smallest currency unit (øre, not DKK)
   - 1 DKK = 100 øre
   - Example: 119 DKK = 11900 øre

2. **Rounding:** Use `Math.round()` for fee calculations to avoid floating point issues

3. **Tier fees:** Double-check the helper tier percentages:
   - Bronze: 20.0%
   - Silver: 16.4%
   - Gold: 12.7%
   - Platinum: 10.2%

4. **Test edge cases:**
   - Zero amounts
   - Very small amounts
   - Amounts at cap boundaries
   - All four helper tiers

5. **Export types:** Export `HelperTier` type for use in other modules

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] `fee-calculator.ts` created with all functions
- [ ] `fee-calculator.test.ts` created with ≥10 tests
- [ ] All tests pass
- [ ] Test coverage ≥90%
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes (no regression)
- [ ] Evidence artifact created at `.automation/phase2/PA04_fee_calculator.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA04, you can proceed to **PA05** - Add Stripe Connect Transfer Method.

**⚠️ IMPORTANT:** This is a BLOCKING TASK. Do NOT proceed to tasks PA05-PA15 until PA04 is fully complete and validated. Many downstream tasks depend on the fee calculation logic implemented here.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check Spec v3 documentation for fee structure details
2. Verify currency unit handling (øre vs DKK)
3. Review test examples for coverage requirements
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA04 Task Assignment**
