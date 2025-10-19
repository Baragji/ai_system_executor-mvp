# Task Assignment: PA07 - Create Payment Transfer Handler

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA07
**Duration:** 40 minutes
**Prerequisites:** PA06 complete

---

## 📋 Task Overview

Create a new handler for transferring payments to helpers after task completion. This implements the "transfer" phase of the collect-then-transfer pattern, moving funds from platform to helper's connected account.

---

## 📁 Files to Create

**New file:**
```
services/payment-service/src/handlers/transfer-payment-handler.ts
```

**Test file:**
```
services/payment-service/src/handlers/__tests__/transfer-payment-handler.test.ts
```

---

## 🔧 Implementation Required

### 1. Create Transfer Payment Handler

**File:** `services/payment-service/src/handlers/transfer-payment-handler.ts`

```typescript
import { PaymentRepository } from '../repositories/payment-repository';
import { StripeClient } from '../stripe/stripe-client';

export interface TransferPaymentRequest {
  paymentIntentId: string;      // Payment intent to transfer from
  taskId: string;               // Task ID
  bidId: string;                // Bid ID
  helperStripeAccountId: string; // Helper's Stripe connected account
}

export interface TransferPaymentResponse {
  success: boolean;
  paymentIntentId: string;
  stripeTransferId?: string;
  status: string;               // 'transferred_to_helper'
  helperNetPayout?: number;
  message?: string;
  error?: string;
}

export class TransferPaymentHandler {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly stripeClient: StripeClient
  ) {}

  /**
   * Transfer payment to helper after task completion
   * Moves funds from platform to helper's connected account
   * Status: 'transferred_to_helper'
   */
  async handle(request: TransferPaymentRequest): Promise<TransferPaymentResponse> {
    try {
      // 1. Fetch payment record
      const payment = await this.paymentRepository.findById(request.paymentIntentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // 2. Verify payment is in correct state
      if (payment.status !== 'captured_held_for_job') {
        throw new Error(
          `Payment must be in 'captured_held_for_job' status, but is '${payment.status}'`
        );
      }

      // 3. Verify helperNetPayout is set
      if (!payment.helperNetPayout) {
        throw new Error('Helper net payout not calculated');
      }

      // 4. Create Stripe transfer
      const transfer = await this.stripeClient.createTransfer({
        amount: payment.helperNetPayout,
        currency: payment.currency,
        destination: request.helperStripeAccountId,
        transferGroup: request.taskId,
        metadata: {
          taskId: request.taskId,
          bidId: request.bidId,
          paymentIntentId: request.paymentIntentId,
          helperNetPayout: payment.helperNetPayout.toString(),
        },
      });

      // 5. Update payment record
      await this.paymentRepository.update(request.paymentIntentId, {
        status: 'transferred_to_helper',
        stripeTransferId: transfer.id,
      });

      return {
        success: true,
        paymentIntentId: request.paymentIntentId,
        stripeTransferId: transfer.id,
        status: 'transferred_to_helper',
        helperNetPayout: payment.helperNetPayout,
        message: 'Payment transferred to helper successfully',
      };
    } catch (error) {
      return {
        success: false,
        paymentIntentId: request.paymentIntentId,
        status: 'failed',
        error: (error as Error).message,
      };
    }
  }
}
```

### 2. Create Unit Tests

**File:** `services/payment-service/src/handlers/__tests__/transfer-payment-handler.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransferPaymentHandler } from '../transfer-payment-handler';
import type { PaymentRepository } from '../../repositories/payment-repository';
import type { StripeClient } from '../../stripe/stripe-client';

describe('TransferPaymentHandler', () => {
  let handler: TransferPaymentHandler;
  let mockPaymentRepository: PaymentRepository;
  let mockStripeClient: StripeClient;

  beforeEach(() => {
    mockPaymentRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    } as any;

    mockStripeClient = {
      createTransfer: vi.fn(),
    } as any;

    handler = new TransferPaymentHandler(
      mockPaymentRepository,
      mockStripeClient
    );
  });

  it('should transfer payment to helper successfully', async () => {
    const mockPayment = {
      id: 'pi_test123',
      status: 'captured_held_for_job',
      amount: 100000,
      currency: 'dkk',
      helperNetPayout: 80000, // 800 DKK after 20% fee
      taskId: 'task_abc',
      bidId: 'bid_xyz',
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    mockStripeClient.createTransfer = vi.fn().mockResolvedValue({
      id: 'tr_test456',
      amount: 80000,
      currency: 'dkk',
      destination: 'acct_helper123',
      status: 'pending',
    });

    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      helperStripeAccountId: 'acct_helper123',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(true);
    expect(response.paymentIntentId).toBe('pi_test123');
    expect(response.stripeTransferId).toBe('tr_test456');
    expect(response.status).toBe('transferred_to_helper');
    expect(response.helperNetPayout).toBe(80000);

    // Verify Stripe transfer was called correctly
    expect(mockStripeClient.createTransfer).toHaveBeenCalledWith({
      amount: 80000,
      currency: 'dkk',
      destination: 'acct_helper123',
      transferGroup: 'task_abc',
      metadata: {
        taskId: 'task_abc',
        bidId: 'bid_xyz',
        paymentIntentId: 'pi_test123',
        helperNetPayout: '80000',
      },
    });

    // Verify payment repository was updated
    expect(mockPaymentRepository.update).toHaveBeenCalledWith(
      'pi_test123',
      expect.objectContaining({
        status: 'transferred_to_helper',
        stripeTransferId: 'tr_test456',
      })
    );
  });

  it('should fail if payment not found', async () => {
    mockPaymentRepository.findById = vi.fn().mockResolvedValue(null);

    const request = {
      paymentIntentId: 'pi_notfound',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      helperStripeAccountId: 'acct_helper123',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toBe('Payment not found');
    expect(mockStripeClient.createTransfer).not.toHaveBeenCalled();
  });

  it('should fail if payment not in captured_held_for_job status', async () => {
    const mockPayment = {
      id: 'pi_test123',
      status: 'pending', // Wrong status
      amount: 100000,
      currency: 'dkk',
      helperNetPayout: 80000,
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      helperStripeAccountId: 'acct_helper123',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toContain('captured_held_for_job');
    expect(mockStripeClient.createTransfer).not.toHaveBeenCalled();
  });

  it('should fail if helperNetPayout not set', async () => {
    const mockPayment = {
      id: 'pi_test123',
      status: 'captured_held_for_job',
      amount: 100000,
      currency: 'dkk',
      helperNetPayout: undefined, // Missing payout
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      helperStripeAccountId: 'acct_helper123',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toBe('Helper net payout not calculated');
    expect(mockStripeClient.createTransfer).not.toHaveBeenCalled();
  });

  it('should handle Stripe transfer failure', async () => {
    const mockPayment = {
      id: 'pi_test123',
      status: 'captured_held_for_job',
      amount: 100000,
      currency: 'dkk',
      helperNetPayout: 80000,
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    mockStripeClient.createTransfer = vi.fn().mockRejectedValue(
      new Error('Insufficient funds in platform account')
    );

    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      helperStripeAccountId: 'acct_helper123',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toBe('Insufficient funds in platform account');
    expect(mockPaymentRepository.update).not.toHaveBeenCalled();
  });
});
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Created `TransferPaymentHandler` class with `handle()` method
- [ ] Method fetches payment record and validates status
- [ ] Method verifies payment is in `captured_held_for_job` status
- [ ] Method verifies `helperNetPayout` is set
- [ ] Method creates Stripe transfer with correct amount
- [ ] Method updates payment record with transfer ID and new status
- [ ] Method handles errors gracefully (payment not found, wrong status, transfer failure)
- [ ] Added ≥5 unit tests covering success and failure cases
- [ ] All tests pass
- [ ] Code compiles with zero TypeScript errors
- [ ] No regression in existing tests
- [ ] Created evidence artifact for PA07

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check payment service
npm --workspace services/payment-service run typecheck
# Expected: No type errors

# 2. Run transfer handler tests
npm --workspace services/payment-service test -- transfer-payment-handler
# Expected: All tests pass

# 3. Run all payment service tests (regression check)
npm --workspace services/payment-service test
# Expected: All tests pass

# 4. Verify handler exports
grep -n "export class TransferPaymentHandler" \
  services/payment-service/src/handlers/transfer-payment-handler.ts
# Expected: Should show class export
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA07_transfer_handler.json`

**Template:**

```json
{
  "task_id": "PA07",
  "win_code": "WA07",
  "title": "Create Payment Transfer Handler",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T13:45:00Z",
  "completed_at": "2025-10-15T14:25:00Z",
  "duration_minutes": 40,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Created TransferPaymentHandler class",
    "Method fetches and validates payment record",
    "Method verifies captured_held_for_job status",
    "Method verifies helperNetPayout is set",
    "Method creates Stripe transfer",
    "Method updates payment record with transfer ID",
    "Method handles errors gracefully",
    "Added ≥5 unit tests",
    "All tests pass",
    "TypeScript compiles with zero errors",
    "No regression in existing tests"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - X tests passed (including 5 new tests)",
    "regression_check": "PASS - all tests pass"
  },
  "files_created": [
    "services/payment-service/src/handlers/transfer-payment-handler.ts",
    "services/payment-service/src/handlers/__tests__/transfer-payment-handler.test.ts"
  ],
  "lines_added": 250,
  "test_results": {
    "new_tests": 5,
    "all_passed": true
  },
  "notes": "Transfer handler implements transfer phase of collect-then-transfer. Ready for PA08.",
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

1. **Status validation:** Only transfer from `captured_held_for_job` status
2. **Amount:** Transfer `helperNetPayout` (already has fees deducted)
3. **Metadata:** Include taskId, bidId, paymentIntentId for tracking
4. **Transfer group:** Use taskId for grouping related transfers
5. **Error handling:** Check payment exists, status is correct, payout is set
6. **Testing:** Mock repository.findById and stripeClient.createTransfer

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] `TransferPaymentHandler` class created
- [ ] `handle()` method implemented with validation
- [ ] ≥5 unit tests added (success + 4 failure cases)
- [ ] All tests pass
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes (no regression)
- [ ] Evidence artifact created at `.automation/phase2/PA07_transfer_handler.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA07, proceed to **PA08** - Create Cancellation Fee Handler.

**⚠️ IMPORTANT:** PA08 is a **BLOCKING TASK**. Tasks PA10 and PA11 depend on PA08's cancellation logic. Ensure PA08 is completed and validated before proceeding to dependent tasks.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check PA05 Stripe transfer method
2. Review PA06 capture handler for patterns
3. Verify repository methods support status updates
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA07 Task Assignment**
