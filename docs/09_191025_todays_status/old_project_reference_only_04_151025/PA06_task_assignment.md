# Task Assignment: PA06 - Create Payment Capture Handler

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA06
**Duration:** 40 minutes
**Prerequisites:** PA05 complete

---

## 📋 Task Overview

Create a new handler for capturing payments when a customer accepts a bid. This implements the "capture" phase of the collect-then-transfer pattern, holding funds on the platform until task completion.

---

## 📁 Files to Create

**New file:**
```
services/payment-service/src/handlers/capture-payment-handler.ts
```

**Test file:**
```
services/payment-service/src/handlers/__tests__/capture-payment-handler.test.ts
```

---

## 🔧 Implementation Required

### 1. Create Capture Payment Handler

**File:** `services/payment-service/src/handlers/capture-payment-handler.ts`

```typescript
import { PaymentRepository } from '../repositories/payment-repository';
import { StripeClient } from '../stripe/stripe-client';
import { calculateFees, type HelperTier } from '../utils/fee-calculator';

export interface CapturePaymentRequest {
  paymentIntentId: string;      // Payment intent to capture
  taskId: string;               // Task ID
  bidId: string;                // Accepted bid ID
  amount: number;               // Task amount (øre)
  helperTier: HelperTier;       // Helper's tier for fee calculation
  customerId: string;           // Customer ID
  helperId: string;             // Helper ID
}

export interface CapturePaymentResponse {
  success: boolean;
  paymentIntentId: string;
  status: string;               // 'captured_held_for_job'
  customerFee: number;
  helperFee: number;
  helperNetPayout: number;
  message?: string;
  error?: string;
}

export class CapturePaymentHandler {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly stripeClient: StripeClient
  ) {}

  /**
   * Capture payment when bid is accepted
   * Calculates fees and stores them with the payment
   * Status: 'captured_held_for_job' (funds held until completion)
   */
  async handle(request: CapturePaymentRequest): Promise<CapturePaymentResponse> {
    try {
      // 1. Calculate fees
      const fees = calculateFees(request.amount, request.helperTier);

      // 2. Capture the payment intent via Stripe
      const captured = await this.stripeClient.capturePaymentIntent({
        paymentIntentId: request.paymentIntentId,
        amount: request.amount + fees.customerFee, // Total includes customer fee
      });

      // 3. Update payment record with Spec v3 fields
      await this.paymentRepository.update(request.paymentIntentId, {
        status: 'captured_held_for_job',
        taskId: request.taskId,
        bidId: request.bidId,
        customerFee: fees.customerFee,
        helperFeePercent: fees.helperFeePercent,
        helperFee: fees.helperFee,
        helperNetPayout: fees.helperNetPayout,
      });

      return {
        success: true,
        paymentIntentId: request.paymentIntentId,
        status: 'captured_held_for_job',
        customerFee: fees.customerFee,
        helperFee: fees.helperFee,
        helperNetPayout: fees.helperNetPayout,
        message: 'Payment captured and held for task completion',
      };
    } catch (error) {
      return {
        success: false,
        paymentIntentId: request.paymentIntentId,
        status: 'failed',
        customerFee: 0,
        helperFee: 0,
        helperNetPayout: 0,
        error: (error as Error).message,
      };
    }
  }
}
```

### 2. Create Unit Tests

**File:** `services/payment-service/src/handlers/__tests__/capture-payment-handler.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CapturePaymentHandler } from '../capture-payment-handler';
import type { PaymentRepository } from '../../repositories/payment-repository';
import type { StripeClient } from '../../stripe/stripe-client';

describe('CapturePaymentHandler', () => {
  let handler: CapturePaymentHandler;
  let mockPaymentRepository: PaymentRepository;
  let mockStripeClient: StripeClient;

  beforeEach(() => {
    mockPaymentRepository = {
      update: vi.fn(),
    } as any;

    mockStripeClient = {
      capturePaymentIntent: vi.fn(),
    } as any;

    handler = new CapturePaymentHandler(
      mockPaymentRepository,
      mockStripeClient
    );
  });

  it('should capture payment and calculate fees for bronze tier', async () => {
    const request = {
      paymentIntentId: 'pi_test123',
      taskId: 'task_abc',
      bidId: 'bid_xyz',
      amount: 100000, // 1000 DKK
      helperTier: 'bronze' as const,
      customerId: 'cust_123',
      helperId: 'helper_456',
    };

    mockStripeClient.capturePaymentIntent = vi.fn().mockResolvedValue({
      id: 'pi_test123',
      status: 'succeeded',
    });

    const response = await handler.handle(request);

    expect(response.success).toBe(true);
    expect(response.paymentIntentId).toBe('pi_test123');
    expect(response.status).toBe('captured_held_for_job');
    expect(response.customerFee).toBe(11900); // 119 DKK (capped)
    expect(response.helperFee).toBe(20000); // 200 DKK (20%)
    expect(response.helperNetPayout).toBe(80000); // 800 DKK

    // Verify Stripe capture was called with amount + customer fee
    expect(mockStripeClient.capturePaymentIntent).toHaveBeenCalledWith({
      paymentIntentId: 'pi_test123',
      amount: 111900, // 1000 + 119 DKK
    });

    // Verify payment repository was updated
    expect(mockPaymentRepository.update).toHaveBeenCalledWith(
      'pi_test123',
      expect.objectContaining({
        status: 'captured_held_for_job',
        taskId: 'task_abc',
        bidId: 'bid_xyz',
        customerFee: 11900,
        helperFee: 20000,
        helperNetPayout: 80000,
      })
    );
  });

  it('should capture payment for platinum tier with lower fees', async () => {
    const request = {
      paymentIntentId: 'pi_test456',
      taskId: 'task_def',
      bidId: 'bid_uvw',
      amount: 100000,
      helperTier: 'platinum' as const,
      customerId: 'cust_789',
      helperId: 'helper_012',
    };

    mockStripeClient.capturePaymentIntent = vi.fn().mockResolvedValue({
      id: 'pi_test456',
      status: 'succeeded',
    });

    const response = await handler.handle(request);

    expect(response.success).toBe(true);
    expect(response.helperFee).toBe(10200); // 102 DKK (10.2%)
    expect(response.helperNetPayout).toBe(89800); // 898 DKK
  });

  it('should handle capture failure gracefully', async () => {
    const request = {
      paymentIntentId: 'pi_fail',
      taskId: 'task_fail',
      bidId: 'bid_fail',
      amount: 100000,
      helperTier: 'bronze' as const,
      customerId: 'cust_fail',
      helperId: 'helper_fail',
    };

    mockStripeClient.capturePaymentIntent = vi.fn().mockRejectedValue(
      new Error('Stripe capture failed')
    );

    const response = await handler.handle(request);

    expect(response.success).toBe(false);
    expect(response.status).toBe('failed');
    expect(response.error).toBe('Stripe capture failed');
    expect(mockPaymentRepository.update).not.toHaveBeenCalled();
  });

  it('should include customer fee in total capture amount', async () => {
    const request = {
      paymentIntentId: 'pi_test789',
      taskId: 'task_ghi',
      bidId: 'bid_rst',
      amount: 50000, // 500 DKK
      helperTier: 'silver' as const,
      customerId: 'cust_345',
      helperId: 'helper_678',
    };

    mockStripeClient.capturePaymentIntent = vi.fn().mockResolvedValue({
      id: 'pi_test789',
      status: 'succeeded',
    });

    await handler.handle(request);

    // Customer fee: 13% of 500 = 65 DKK (6500 øre)
    // Total capture: 500 + 65 = 565 DKK (56500 øre)
    expect(mockStripeClient.capturePaymentIntent).toHaveBeenCalledWith({
      paymentIntentId: 'pi_test789',
      amount: 56500,
    });
  });
});
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Created `CapturePaymentHandler` class with `handle()` method
- [ ] Method calculates fees using `calculateFees()` from PA04
- [ ] Method captures payment via Stripe (amount + customer fee)
- [ ] Method updates payment record with Spec v3 fields
- [ ] Method sets status to `captured_held_for_job`
- [ ] Method handles errors gracefully
- [ ] Added ≥4 unit tests covering success, failure, tiers, and customer fee
- [ ] All tests pass
- [ ] Code compiles with zero TypeScript errors
- [ ] No regression in existing tests
- [ ] Created evidence artifact for PA06

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check payment service
npm --workspace services/payment-service run typecheck
# Expected: No type errors

# 2. Run capture handler tests
npm --workspace services/payment-service test -- capture-payment-handler
# Expected: All tests pass

# 3. Run all payment service tests (regression check)
npm --workspace services/payment-service test
# Expected: All tests pass

# 4. Verify handler exports
grep -n "export class CapturePaymentHandler" \
  services/payment-service/src/handlers/capture-payment-handler.ts
# Expected: Should show class export
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA06_capture_handler.json`

**Template:**

```json
{
  "task_id": "PA06",
  "win_code": "WA06",
  "title": "Create Payment Capture Handler",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T13:05:00Z",
  "completed_at": "2025-10-15T13:45:00Z",
  "duration_minutes": 40,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Created CapturePaymentHandler class",
    "Method calculates fees using calculateFees()",
    "Method captures payment via Stripe",
    "Method updates payment record with Spec v3 fields",
    "Method sets status to captured_held_for_job",
    "Method handles errors gracefully",
    "Added ≥4 unit tests",
    "All tests pass",
    "TypeScript compiles with zero errors",
    "No regression in existing tests"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - X tests passed (including 4 new tests)",
    "regression_check": "PASS - all tests pass"
  },
  "files_created": [
    "services/payment-service/src/handlers/capture-payment-handler.ts",
    "services/payment-service/src/handlers/__tests__/capture-payment-handler.test.ts"
  ],
  "lines_added": 200,
  "test_results": {
    "new_tests": 4,
    "all_passed": true
  },
  "notes": "Capture handler implements collect phase of collect-then-transfer. Ready for PA07.",
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

1. **Fee calculation:** Use the `calculateFees()` function from PA04
2. **Total capture amount:** Task amount + customer fee (customer pays both)
3. **Status:** Use `captured_held_for_job` (new status from PA02)
4. **Error handling:** Return error response, don't throw
5. **Testing:** Mock both repository and Stripe client
6. **Dependency injection:** Constructor takes repository and Stripe client

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] `CapturePaymentHandler` class created
- [ ] `handle()` method implemented
- [ ] ≥4 unit tests added
- [ ] All tests pass
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes (no regression)
- [ ] Evidence artifact created at `.automation/phase2/PA06_capture_handler.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA06, proceed to **PA07** - Create Payment Transfer Handler.

**Note:** PA07 is NOT blocked. You can proceed immediately after completing PA06.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check PA04 fee calculator exports
2. Review existing handler patterns in the codebase
3. Verify Stripe client methods from PA05
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA06 Task Assignment**
