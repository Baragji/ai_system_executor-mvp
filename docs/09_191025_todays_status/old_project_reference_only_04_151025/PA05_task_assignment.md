# Task Assignment: PA05 - Add Stripe Connect Transfer Method

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA05
**Duration:** 40 minutes
**Prerequisites:** PA04 complete

---

## 📋 Task Overview

Add a new method to the Stripe client for creating Connect transfers to helpers after task completion. This implements the "transfer" phase of the collect-then-transfer pattern.

---

## 📁 Files to Modify

**Primary file:**
```
services/payment-service/src/stripe/stripe-client.ts
```

**Test file:**
```
services/payment-service/src/stripe/__tests__/stripe-client.test.ts
```

---

## 🔧 Changes Required

### 1. Add Transfer Method to StripeClient

**Add this method to the StripeClient class:**

```typescript
/**
 * Create a Stripe Connect transfer to helper
 * Transfers funds from platform to helper's connected account
 *
 * @param params - Transfer parameters
 * @returns Transfer object with ID and status
 */
async createTransfer(params: {
  amount: number;              // Amount to transfer (øre)
  currency: string;            // Currency code (e.g., 'dkk')
  destination: string;         // Helper's Stripe connected account ID
  transferGroup?: string;      // Group transfers (optional, use taskId)
  metadata?: Record<string, string>; // Metadata (taskId, bidId, etc.)
}): Promise<{
  id: string;                  // Stripe transfer ID
  amount: number;
  currency: string;
  destination: string;
  status: string;              // 'pending' | 'paid' | 'failed'
  created: number;
}> {
  try {
    const transfer = await this.stripe.transfers.create({
      amount: params.amount,
      currency: params.currency,
      destination: params.destination,
      transfer_group: params.transferGroup,
      metadata: params.metadata || {},
    });

    return {
      id: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination,
      status: transfer.status || 'pending',
      created: transfer.created,
    };
  } catch (error) {
    this.logger.error('Stripe transfer creation failed', {
      error,
      destination: params.destination,
      amount: params.amount,
    });
    throw new Error(`Stripe transfer failed: ${(error as Error).message}`);
  }
}
```

### 2. Add Unit Tests

**Add these tests to `stripe-client.test.ts`:**

```typescript
describe('StripeClient.createTransfer', () => {
  it('should create a transfer successfully', async () => {
    const mockTransfer = {
      id: 'tr_test123',
      amount: 80000,
      currency: 'dkk',
      destination: 'acct_helper123',
      status: 'pending',
      created: Math.floor(Date.now() / 1000),
    };

    // Mock Stripe transfers.create
    mockStripe.transfers.create.mockResolvedValue(mockTransfer);

    const result = await stripeClient.createTransfer({
      amount: 80000,
      currency: 'dkk',
      destination: 'acct_helper123',
      transferGroup: 'task_abc123',
      metadata: {
        taskId: 'task_abc123',
        bidId: 'bid_xyz789',
      },
    });

    expect(result.id).toBe('tr_test123');
    expect(result.amount).toBe(80000);
    expect(result.destination).toBe('acct_helper123');
    expect(mockStripe.transfers.create).toHaveBeenCalledWith({
      amount: 80000,
      currency: 'dkk',
      destination: 'acct_helper123',
      transfer_group: 'task_abc123',
      metadata: {
        taskId: 'task_abc123',
        bidId: 'bid_xyz789',
      },
    });
  });

  it('should handle transfer creation failure', async () => {
    mockStripe.transfers.create.mockRejectedValue(
      new Error('Insufficient funds in platform account')
    );

    await expect(
      stripeClient.createTransfer({
        amount: 80000,
        currency: 'dkk',
        destination: 'acct_helper123',
      })
    ).rejects.toThrow('Stripe transfer failed');
  });

  it('should include metadata in transfer', async () => {
    const mockTransfer = {
      id: 'tr_test123',
      amount: 80000,
      currency: 'dkk',
      destination: 'acct_helper123',
      status: 'pending',
      created: Math.floor(Date.now() / 1000),
    };

    mockStripe.transfers.create.mockResolvedValue(mockTransfer);

    await stripeClient.createTransfer({
      amount: 80000,
      currency: 'dkk',
      destination: 'acct_helper123',
      metadata: {
        taskId: 'task_123',
        helperNetPayout: '80000',
      },
    });

    expect(mockStripe.transfers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          taskId: 'task_123',
          helperNetPayout: '80000',
        },
      })
    );
  });
});
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Added `createTransfer()` method to StripeClient class
- [ ] Method accepts amount, currency, destination, transferGroup, metadata
- [ ] Method returns transfer object with id, amount, status
- [ ] Method logs errors with context
- [ ] Method throws error on failure
- [ ] Added ≥3 unit tests covering success, failure, and metadata cases
- [ ] All tests pass
- [ ] Code compiles with zero TypeScript errors
- [ ] No regression in existing tests
- [ ] Created evidence artifact for PA05

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check payment service
npm --workspace services/payment-service run typecheck
# Expected: No type errors

# 2. Run Stripe client tests
npm --workspace services/payment-service test -- stripe-client
# Expected: All tests pass (including new transfer tests)

# 3. Run all payment service tests (regression check)
npm --workspace services/payment-service test
# Expected: All tests pass

# 4. Verify method signature
grep -A 10 "async createTransfer" \
  services/payment-service/src/stripe/stripe-client.ts
# Expected: Should show method signature with all parameters
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA05_stripe_transfer.json`

**Template:**

```json
{
  "task_id": "PA05",
  "win_code": "WA05",
  "title": "Add Stripe Connect Transfer Method",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T12:25:00Z",
  "completed_at": "2025-10-15T13:05:00Z",
  "duration_minutes": 40,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Added createTransfer() method to StripeClient",
    "Method accepts all required parameters",
    "Method returns transfer object",
    "Method logs errors with context",
    "Method throws error on failure",
    "Added ≥3 unit tests",
    "All tests pass",
    "TypeScript compiles with zero errors",
    "No regression in existing tests"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - X tests passed (including 3 new transfer tests)",
    "regression_check": "PASS - all tests pass"
  },
  "files_modified": [
    "services/payment-service/src/stripe/stripe-client.ts",
    "services/payment-service/src/stripe/__tests__/stripe-client.test.ts"
  ],
  "lines_added": 80,
  "test_results": {
    "new_tests": 3,
    "all_passed": true
  },
  "notes": "Stripe Connect transfer method implemented. Ready for PA06.",
  "issues_encountered": []
}
```

---

## ⏱️ Time Box

**Maximum time:** 40 minutes

If you exceed 40 minutes, stop and report:
- What you've completed
- What's blocking you
- Estimated time needed to complete

---

## 💡 Implementation Tips

1. **Stripe API:** Use `this.stripe.transfers.create()` from the Stripe SDK
2. **Error handling:** Wrap in try/catch and log with context
3. **Metadata:** Always pass metadata for tracking (taskId, bidId, etc.)
4. **Transfer group:** Use taskId as transfer_group for grouping related transfers
5. **Testing:** Mock `this.stripe.transfers.create` in tests
6. **Documentation:** Add JSDoc comments explaining the collect-then-transfer pattern

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] `createTransfer()` method added to StripeClient
- [ ] Method signature matches specification
- [ ] Error handling and logging implemented
- [ ] ≥3 unit tests added
- [ ] All tests pass
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes (no regression)
- [ ] Evidence artifact created at `.automation/phase2/PA05_stripe_transfer.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA05, proceed to **PA06** - Create Payment Capture Handler.

**Note:** PA06 is NOT blocked. You can proceed immediately after completing PA05.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check Stripe Connect documentation for transfer API
2. Review existing StripeClient methods for patterns
3. Verify Stripe SDK types are correct
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA05 Task Assignment**
