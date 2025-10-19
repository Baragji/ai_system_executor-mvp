# Task Assignment: PA08 - Create Cancellation Fee Handler

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA08
**Duration:** 45 minutes
**Prerequisites:** PA07 complete
**⚠️ BLOCKING TASK:** PA10 and PA11 depend on this

---

## 📋 Task Overview

Create a new handler for processing cancellation fees when a task is cancelled. Implements Spec v3 cancellation logic: 10% fee (≤150 DKK), refunds remainder to customer.

---

## 📁 Files to Create

**New file:**
```
services/payment-service/src/handlers/cancellation-fee-handler.ts
```

**Test file:**
```
services/payment-service/src/handlers/__tests__/cancellation-fee-handler.test.ts
```

---

## 🔧 Implementation Required

### 1. Create Cancellation Fee Handler

**File:** `services/payment-service/src/handlers/cancellation-fee-handler.ts`

```typescript
import { PaymentRepository } from '../repositories/payment-repository';
import { StripeClient } from '../stripe/stripe-client';
import { calculateCancellationFee } from '../utils/fee-calculator';

export interface CancellationFeeRequest {
  paymentIntentId: string;      // Payment intent to process
  taskId: string;               // Task ID
  bidId: string;                // Bid ID
  cancelledBy: 'customer' | 'helper'; // Who cancelled
  reason?: string;              // Cancellation reason
}

export interface CancellationFeeResponse {
  success: boolean;
  paymentIntentId: string;
  cancellationFee: number;
  refundAmount: number;         // Amount refunded to customer
  status: string;               // 'refunded' or 'failed'
  message?: string;
  error?: string;
}

export class CancellationFeeHandler {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly stripeClient: StripeClient
  ) {}

  /**
   * Process cancellation fee and refund
   * Charges 10% cancellation fee (≤150 DKK), refunds remainder
   * Works for both customer and helper cancellations
   */
  async handle(request: CancellationFeeRequest): Promise<CancellationFeeResponse> {
    try {
      // 1. Fetch payment record
      const payment = await this.paymentRepository.findById(request.paymentIntentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // 2. Verify payment is in correct state (captured)
      if (payment.status !== 'captured_held_for_job') {
        throw new Error(
          `Payment must be in 'captured_held_for_job' status for cancellation, but is '${payment.status}'`
        );
      }

      // 3. Calculate cancellation fee
      const { cancellationFee } = calculateCancellationFee(payment.amount);

      // 4. Calculate refund amount
      // Total captured: amount + customerFee
      const totalCaptured = payment.amount + (payment.customerFee || 0);
      const refundAmount = totalCaptured - cancellationFee;

      // 5. Process refund via Stripe
      const refund = await this.stripeClient.refundPaymentIntent({
        paymentIntentId: request.paymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer', // Stripe requires a reason
        metadata: {
          taskId: request.taskId,
          bidId: request.bidId,
          cancelledBy: request.cancelledBy,
          cancellationFee: cancellationFee.toString(),
          cancellationReason: request.reason || 'Not specified',
        },
      });

      // 6. Update payment record
      await this.paymentRepository.update(request.paymentIntentId, {
        status: 'refunded',
        cancellationFee,
      });

      return {
        success: true,
        paymentIntentId: request.paymentIntentId,
        cancellationFee,
        refundAmount,
        status: 'refunded',
        message: `Cancellation processed: ${cancellationFee / 100} DKK fee charged, ${refundAmount / 100} DKK refunded`,
      };
    } catch (error) {
      return {
        success: false,
        paymentIntentId: request.paymentIntentId,
        cancellationFee: 0,
        refundAmount: 0,
        status: 'failed',
        error: (error as Error).message,
      };
    }
  }
}
```

### 2. Create Unit Tests

**File:** `services/payment-service/src/handlers/__tests__/cancellation-fee-handler.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancellationFeeHandler } from '../cancellation-fee-handler';
import type { PaymentRepository } from '../../repositories/payment-repository';
import type { StripeClient } from '../../stripe/stripe-client';

describe('CancellationFeeHandler', () => {
  let handler: CancellationFeeHandler;
  let mockPaymentRepository: PaymentRepository;
  let mockStripeClient: StripeClient;

  beforeEach(() => {
    mockPaymentRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    } as any;

    mockStripeClient = {
      refundPaymentIntent: vi.fn(),
    } as any;

    handler = new CancellationFeeHandler(
      mockPaymentRepository,
      mockStripeClient
    );
  });

  it('should process cancellation fee with cap at 150 DKK', async () => {
    // Amount: 2000 DKK (200000 øre)
    // Customer fee: 119 DKK (11900 øre) - capped
    // Total captured: 2119 DKK (211900 øre)
    // Cancellation fee: 10% of 2000 = 200 DKK, but capped at 150 DKK (15000 øre)
    // Refund: 211900 - 15000 = 196900 øre (1969 DKK)
    const mockPayment = {
      id: 'pi_test123',
      status: 'captured_held_for_job',
      amount: 200000,
      currency: 'dkk',
      customerFee: 11900,
      taskId: 'task_abc',
      bidId: 'bid_xyz',
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    mockStripeClient.refundPaymentIntent = vi.fn().mockResolvedValue({
      id: 're_test456',
      amount: 196900,
      status: 'succeeded',
    });

    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      cancelledBy: 'customer' as const,
      reason: 'Changed mind',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(true);
    expect(response.cancellationFee).toBe(15000); // 150 DKK (capped)
    expect(response.refundAmount).toBe(196900); // 1969 DKK
    expect(response.status).toBe('refunded');

    // Verify Stripe refund was called
    expect(mockStripeClient.refundPaymentIntent).toHaveBeenCalledWith({
      paymentIntentId: 'pi_test123',
      amount: 196900,
      reason: 'requested_by_customer',
      metadata: expect.objectContaining({
        taskId: 'task_abc',
        bidId: 'bid_xyz',
        cancelledBy: 'customer',
        cancellationFee: '15000',
      }),
    });

    // Verify payment repository was updated
    expect(mockPaymentRepository.update).toHaveBeenCalledWith(
      'pi_test123',
      expect.objectContaining({
        status: 'refunded',
        cancellationFee: 15000,
      })
    );
  });

  it('should process cancellation fee below cap', async () => {
    // Amount: 1000 DKK (100000 øre)
    // Customer fee: 119 DKK (11900 øre) - capped
    // Total captured: 1119 DKK (111900 øre)
    // Cancellation fee: 10% of 1000 = 100 DKK (10000 øre) - below cap
    // Refund: 111900 - 10000 = 101900 øre (1019 DKK)
    const mockPayment = {
      id: 'pi_test789',
      status: 'captured_held_for_job',
      amount: 100000,
      currency: 'dkk',
      customerFee: 11900,
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    mockStripeClient.refundPaymentIntent = vi.fn().mockResolvedValue({
      id: 're_test012',
      amount: 101900,
      status: 'succeeded',
    });

    const request = {
      paymentIntentId: 'pi_test789',
      taskId: 'task_def',
      bidId: 'bid_uvw',
      cancelledBy: 'helper' as const,
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(true);
    expect(response.cancellationFee).toBe(10000); // 100 DKK (no cap)
    expect(response.refundAmount).toBe(101900); // 1019 DKK
  });

  it('should handle customer cancellation', async () => {
    const mockPayment = {
      id: 'pi_customer',
      status: 'captured_held_for_job',
      amount: 50000,
      customerFee: 6500,
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);
    mockStripeClient.refundPaymentIntent = vi.fn().mockResolvedValue({
      id: 're_cust',
      amount: 51500,
      status: 'succeeded',
    });

    const request = {
      paymentIntentId: 'pi_customer',
      taskId: 'task_ghi',
      bidId: 'bid_rst',
      cancelledBy: 'customer' as const,
      reason: 'No longer needed',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(true);
    expect(mockStripeClient.refundPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          cancelledBy: 'customer',
          cancellationReason: 'No longer needed',
        }),
      })
    );
  });

  it('should handle helper cancellation', async () => {
    const mockPayment = {
      id: 'pi_helper',
      status: 'captured_held_for_job',
      amount: 50000,
      customerFee: 6500,
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);
    mockStripeClient.refundPaymentIntent = vi.fn().mockResolvedValue({
      id: 're_help',
      amount: 51500,
      status: 'succeeded',
    });

    const request = {
      paymentIntentId: 'pi_helper',
      taskId: 'task_jkl',
      bidId: 'bid_mno',
      cancelledBy: 'helper' as const,
      reason: 'Unable to complete',
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(true);
    expect(mockStripeClient.refundPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          cancelledBy: 'helper',
        }),
      })
    );
  });

  it('should fail if payment not found', async () => {
    mockPaymentRepository.findById = vi.fn().mockResolvedValue(null);

    const request = {
      paymentIntentId: 'pi_notfound',
      taskId: 'task_xyz',
      bidId: 'bid_abc',
      cancelledBy: 'customer' as const,
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toBe('Payment not found');
    expect(mockStripeClient.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it('should fail if payment not in captured_held_for_job status', async () => {
    const mockPayment = {
      id: 'pi_test123',
      status: 'transferred_to_helper', // Wrong status
      amount: 100000,
      customerFee: 11900,
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      cancelledBy: 'customer' as const,
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toContain('captured_held_for_job');
    expect(mockStripeClient.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it('should handle Stripe refund failure', async () => {
    const mockPayment = {
      id: 'pi_test123',
      status: 'captured_held_for_job',
      amount: 100000,
      customerFee: 11900,
    };

    mockPaymentRepository.findById = vi.fn().mockResolvedValue(mockPayment);

    mockStripeClient.refundPaymentIntent = vi.fn().mockRejectedValue(
      new Error('Refund failed')
    );

    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      cancelledBy: 'customer' as const,
    };

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toBe('Refund failed');
    expect(mockPaymentRepository.update).not.toHaveBeenCalled();
  });
});
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Created `CancellationFeeHandler` class with `handle()` method
- [ ] Method calculates cancellation fee (10%, ≤150 DKK)
- [ ] Method calculates refund amount (total captured - cancellation fee)
- [ ] Method processes refund via Stripe
- [ ] Method updates payment record with cancellation fee and status
- [ ] Method handles both customer and helper cancellations
- [ ] Method validates payment status (must be `captured_held_for_job`)
- [ ] Added ≥7 unit tests covering success and failure cases
- [ ] All tests pass
- [ ] Code compiles with zero TypeScript errors
- [ ] No regression in existing tests
- [ ] Created evidence artifact for PA08

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check payment service
npm --workspace services/payment-service run typecheck
# Expected: No type errors

# 2. Run cancellation fee handler tests
npm --workspace services/payment-service test -- cancellation-fee-handler
# Expected: All tests pass

# 3. Run all payment service tests (regression check)
npm --workspace services/payment-service test
# Expected: All tests pass

# 4. Verify handler exports
grep -n "export class CancellationFeeHandler" \
  services/payment-service/src/handlers/cancellation-fee-handler.ts
# Expected: Should show class export
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA08_cancellation_handler.json`

**Template:**

```json
{
  "task_id": "PA08",
  "win_code": "WA08",
  "title": "Create Cancellation Fee Handler",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T14:25:00Z",
  "completed_at": "2025-10-15T15:10:00Z",
  "duration_minutes": 45,
  "status": "COMPLETED",
  "blocking_task": true,
  "acceptance_criteria_met": [
    "Created CancellationFeeHandler class",
    "Method calculates cancellation fee (10%, ≤150 DKK)",
    "Method calculates refund amount",
    "Method processes refund via Stripe",
    "Method updates payment record",
    "Method handles customer and helper cancellations",
    "Method validates payment status",
    "Added ≥7 unit tests",
    "All tests pass",
    "TypeScript compiles with zero errors",
    "No regression in existing tests"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - X tests passed (including 7 new tests)",
    "regression_check": "PASS - all tests pass"
  },
  "files_created": [
    "services/payment-service/src/handlers/cancellation-fee-handler.ts",
    "services/payment-service/src/handlers/__tests__/cancellation-fee-handler.test.ts"
  ],
  "lines_added": 300,
  "test_results": {
    "new_tests": 7,
    "all_passed": true
  },
  "notes": "Cancellation fee handler implemented. This is a blocking task - PA10 and PA11 depend on this logic.",
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

1. **Fee calculation:** Use `calculateCancellationFee()` from PA04
2. **Refund amount:** Total captured (amount + customerFee) - cancellation fee
3. **Status validation:** Only process from `captured_held_for_job` status
4. **Metadata:** Include taskId, bidId, cancelledBy, cancellationFee for tracking
5. **Cancellation types:** Support both customer and helper cancellations
6. **Testing:** Test cap (≥150 DKK), below cap, customer/helper, failures

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] `CancellationFeeHandler` class created
- [ ] `handle()` method implemented with all logic
- [ ] ≥7 unit tests added (2 cap scenarios + customer + helper + 3 failures)
- [ ] All tests pass
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes (no regression)
- [ ] Evidence artifact created at `.automation/phase2/PA08_cancellation_handler.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA08, proceed to **PA09** - Add API Endpoints for Payment Flows.

**⚠️ IMPORTANT:** This is a BLOCKING TASK. Do NOT proceed to PA10 or PA11 until PA08 is fully complete and validated. These tasks depend on the cancellation logic implemented here.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check PA04 for `calculateCancellationFee()` function
2. Review Stripe refund API documentation
3. Check existing handlers for error handling patterns
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA08 Task Assignment**
