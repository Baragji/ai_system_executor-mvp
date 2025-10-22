# Task Assignment: PA13 - Integration Tests for Payment Lifecycle

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA13
**Duration:** 60 minutes
**Prerequisites:** PA12 complete

---

## 📋 Task Overview

Create comprehensive integration tests that validate the complete payment lifecycle across services: capture on bid acceptance, transfer on task completion, cancellation with fees, and dispute holds. These tests ensure the entire collect-then-transfer flow works end-to-end.

---

## 📁 Files to Create

**New test file:**
```
tests/integration/payment-lifecycle.spec.ts
```

**Related files (reference only):**
```
tests/integration/e2e-user-journey.spec.ts (existing pattern)
services/payment-service/src/handlers/*.ts (PA06-PA08)
services/task-service/src/routes/tasks.ts (PA11)
services/bid-service/src/routes/bids.ts (PA12)
```

---

## 🔧 Implementation Required

### 1. Create Payment Lifecycle Integration Tests

**File:** `tests/integration/payment-lifecycle.spec.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

/**
 * Integration tests for Spec v3 payment lifecycle
 *
 * Tests the complete collect-then-transfer flow:
 * 1. Payment capture on bid acceptance
 * 2. Payment transfer on task completion
 * 3. Cancellation with fees
 * 4. Dispute holds
 */

describe('Payment Lifecycle Integration Tests', () => {
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

  let authToken: string;
  let customerId: string;
  let helperId: string;
  let taskId: string;
  let bidId: string;
  let paymentIntentId: string;

  beforeAll(async () => {
    // Ensure services are running
    await ensureServicesReady();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Setup fresh test data for each test
    const { customer, helper, task, bid, payment } = await setupTestScenario();
    customerId = customer.id;
    helperId = helper.id;
    taskId = task.id;
    bidId = bid.id;
    paymentIntentId = payment.id;
  });

  describe('Scenario 1: Happy Path - Capture → Complete → Transfer', () => {
    it('should capture payment on bid acceptance', async () => {
      // 1. Customer accepts bid
      const acceptResponse = await fetch(`${GATEWAY_URL}/api/tasks/${taskId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          bidId,
          paymentIntentId,
        }),
      });

      expect(acceptResponse.status).toBe(200);
      const acceptData = await acceptResponse.json();

      // 2. Verify payment was captured
      expect(acceptData.payment.status).toBe('captured_held_for_job');
      expect(acceptData.payment.customerFee).toBeGreaterThan(0);
      expect(acceptData.payment.helperNetPayout).toBeGreaterThan(0);

      // 3. Verify task status updated
      expect(acceptData.status).toBe('accepted');
      expect(acceptData.bidId).toBe(bidId);

      // 4. Verify payment record in payment-service
      const paymentResponse = await fetch(
        `${GATEWAY_URL}/api/payments/${paymentIntentId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const paymentData = await paymentResponse.json();
      expect(paymentData.status).toBe('captured_held_for_job');
      expect(paymentData.taskId).toBe(taskId);
      expect(paymentData.bidId).toBe(bidId);
      expect(paymentData.customerFee).toBeDefined();
      expect(paymentData.helperNetPayout).toBeDefined();
    });

    it('should transfer payment on task completion', async () => {
      // 1. Accept bid first (setup)
      await acceptBid(taskId, bidId, paymentIntentId);

      // 2. Helper marks task complete
      await markTaskComplete(taskId, helperId);

      // 3. Customer confirms completion
      const confirmResponse = await fetch(
        `${GATEWAY_URL}/api/tasks/${taskId}/confirm-completion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(confirmResponse.status).toBe(200);
      const confirmData = await confirmResponse.json();

      // 4. Verify payment was transferred
      expect(confirmData.payment.status).toBe('transferred_to_helper');
      expect(confirmData.payment.stripeTransferId).toBeDefined();

      // 5. Verify payment record updated
      const paymentResponse = await fetch(
        `${GATEWAY_URL}/api/payments/${paymentIntentId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const paymentData = await paymentResponse.json();
      expect(paymentData.status).toBe('transferred_to_helper');
      expect(paymentData.stripeTransferId).toBeDefined();
      expect(paymentData.stripeTransferId).toMatch(/^tr_/); // Stripe transfer ID format
    });
  });

  describe('Scenario 2: Cancellation - Customer Cancels', () => {
    it('should apply cancellation fee and refund remainder', async () => {
      // 1. Accept bid first (setup)
      const acceptResult = await acceptBid(taskId, bidId, paymentIntentId);
      const originalAmount = acceptResult.payment.amount;
      const customerFee = acceptResult.payment.customerFee;

      // 2. Customer cancels task
      const cancelResponse = await fetch(
        `${GATEWAY_URL}/api/payments/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            paymentIntentId,
            taskId,
            bidId,
            cancelledBy: 'customer',
            reason: 'Changed my mind',
          }),
        }
      );

      expect(cancelResponse.status).toBe(200);
      const cancelData = await cancelResponse.json();

      // 3. Verify cancellation fee applied (10%, ≤150 DKK)
      expect(cancelData.success).toBe(true);
      expect(cancelData.cancellationFee).toBeGreaterThan(0);
      expect(cancelData.cancellationFee).toBeLessThanOrEqual(15000); // 150 DKK cap

      // 4. Verify refund amount correct
      const totalCaptured = originalAmount + customerFee;
      const expectedRefund = totalCaptured - cancelData.cancellationFee;
      expect(cancelData.refundAmount).toBe(expectedRefund);

      // 5. Verify payment status updated
      const paymentResponse = await fetch(
        `${GATEWAY_URL}/api/payments/${paymentIntentId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const paymentData = await paymentResponse.json();
      expect(paymentData.status).toBe('refunded');
      expect(paymentData.cancellationFee).toBe(cancelData.cancellationFee);
    });

    it('should respect 150 DKK cancellation fee cap', async () => {
      // 1. Create high-value task (2000 DKK)
      const highValueTask = await createTask({ amount: 200000 }); // 2000 DKK in øre
      const highValueBid = await createBid({ taskId: highValueTask.id, amount: 200000 });
      const highValuePayment = await createPayment({ amount: 200000 });

      // 2. Accept and capture
      await acceptBid(highValueTask.id, highValueBid.id, highValuePayment.id);

      // 3. Cancel
      const cancelResponse = await fetch(
        `${GATEWAY_URL}/api/payments/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            paymentIntentId: highValuePayment.id,
            taskId: highValueTask.id,
            bidId: highValueBid.id,
            cancelledBy: 'customer',
          }),
        }
      );

      const cancelData = await cancelResponse.json();

      // 4. Verify fee is capped at 150 DKK (15000 øre)
      // 10% of 2000 DKK = 200 DKK, but capped at 150 DKK
      expect(cancelData.cancellationFee).toBe(15000);
    });
  });

  describe('Scenario 3: Cancellation - Helper Cancels', () => {
    it('should apply cancellation fee when helper cancels', async () => {
      // 1. Accept bid first (setup)
      await acceptBid(taskId, bidId, paymentIntentId);

      // 2. Helper cancels task
      const cancelResponse = await fetch(
        `${GATEWAY_URL}/api/payments/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            paymentIntentId,
            taskId,
            bidId,
            cancelledBy: 'helper',
            reason: 'Unable to complete',
          }),
        }
      );

      expect(cancelResponse.status).toBe(200);
      const cancelData = await cancelResponse.json();

      // 3. Verify cancellation processed
      expect(cancelData.success).toBe(true);
      expect(cancelData.cancellationFee).toBeGreaterThan(0);
      expect(cancelData.refundAmount).toBeGreaterThan(0);

      // 4. Verify metadata includes cancelledBy
      const paymentResponse = await fetch(
        `${GATEWAY_URL}/api/payments/${paymentIntentId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const paymentData = await paymentResponse.json();
      expect(paymentData.status).toBe('refunded');
      // Note: cancelledBy tracking may be in metadata or separate field
    });
  });

  describe('Scenario 4: Payment Validation Failures', () => {
    it('should prevent bid acceptance with invalid payment method', async () => {
      // 1. Try to accept bid with invalid payment method
      const acceptResponse = await fetch(`${GATEWAY_URL}/api/bids/${bidId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          paymentMethodId: 'invalid_pm_123',
        }),
      });

      // 2. Verify request was rejected
      expect(acceptResponse.status).toBe(400);
      const errorData = await acceptResponse.json();

      // 3. Verify actionable error message
      expect(errorData.error).toBeDefined();
      expect(errorData.reason).toBeDefined();
      expect(errorData.message).toBeDefined();
      expect(errorData.actionRequired).toBeDefined();

      // 4. Verify bid status unchanged
      const bidResponse = await fetch(`${GATEWAY_URL}/api/bids/${bidId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const bidData = await bidResponse.json();
      expect(bidData.status).toBe('pending'); // Still pending, not accepted
    });

    it('should prevent transfer before payment capture', async () => {
      // 1. Try to transfer payment without capture
      const transferResponse = await fetch(
        `${GATEWAY_URL}/api/payments/transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            paymentIntentId,
            taskId,
            bidId,
            helperStripeAccountId: 'acct_test_helper',
          }),
        }
      );

      // 2. Verify transfer rejected
      expect(transferResponse.status).toBe(500); // Or 400 depending on implementation
      const errorData = await transferResponse.json();

      expect(errorData.success).toBe(false);
      expect(errorData.error).toContain('captured_held_for_job');
    });
  });

  describe('Scenario 5: Fee Calculations', () => {
    it('should apply 13% customer fee with 119 DKK cap', async () => {
      // Test below cap
      const lowValueTask = await createTask({ amount: 50000 }); // 500 DKK
      const lowValueBid = await createBid({ taskId: lowValueTask.id, amount: 50000 });
      const lowValuePayment = await createPayment({ amount: 50000 });

      const lowResult = await acceptBid(lowValueTask.id, lowValueBid.id, lowValuePayment.id);
      expect(lowResult.payment.customerFee).toBe(6500); // 13% of 500 = 65 DKK

      // Test at cap
      const highValueTask = await createTask({ amount: 100000 }); // 1000 DKK
      const highValueBid = await createBid({ taskId: highValueTask.id, amount: 100000 });
      const highValuePayment = await createPayment({ amount: 100000 });

      const highResult = await acceptBid(highValueTask.id, highValueBid.id, highValuePayment.id);
      expect(highResult.payment.customerFee).toBe(11900); // Capped at 119 DKK
    });

    it('should apply tier-based helper fees', async () => {
      const tiers = ['bronze', 'silver', 'gold', 'platinum'];
      const expectedFees = [0.20, 0.164, 0.127, 0.102]; // 20%, 16.4%, 12.7%, 10.2%

      for (let i = 0; i < tiers.length; i++) {
        const task = await createTask({ amount: 100000 });
        const bid = await createBid({
          taskId: task.id,
          amount: 100000,
          helperTier: tiers[i],
        });
        const payment = await createPayment({ amount: 100000 });

        const result = await acceptBid(task.id, bid.id, payment.id);

        expect(result.payment.helperFeePercent).toBe(expectedFees[i]);
        expect(result.payment.helperFee).toBe(100000 * expectedFees[i]);
        expect(result.payment.helperNetPayout).toBe(100000 - 100000 * expectedFees[i]);
      }
    });
  });

  describe('Scenario 6: Idempotency and Cleanup', () => {
    it('should handle duplicate bid acceptance gracefully', async () => {
      // 1. Accept bid once
      const firstAccept = await acceptBid(taskId, bidId, paymentIntentId);
      expect(firstAccept.status).toBe('accepted');

      // 2. Try to accept same bid again
      const secondAcceptResponse = await fetch(
        `${GATEWAY_URL}/api/tasks/${taskId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            bidId,
            paymentIntentId,
          }),
        }
      );

      // 3. Verify idempotent behavior (either 200 with same result or 400 with clear error)
      expect([200, 400]).toContain(secondAcceptResponse.status);

      if (secondAcceptResponse.status === 400) {
        const errorData = await secondAcceptResponse.json();
        expect(errorData.error).toContain('already accepted');
      }
    });

    it('should clean up test data successfully', async () => {
      // This test verifies cleanup doesn't leave orphaned records
      const testTask = await createTask({ amount: 10000 });
      const testBid = await createBid({ taskId: testTask.id, amount: 10000 });

      // Delete in reverse dependency order
      await deleteBid(testBid.id);
      await deleteTask(testTask.id);

      // Verify deletion
      const taskResponse = await fetch(`${GATEWAY_URL}/api/tasks/${testTask.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(taskResponse.status).toBe(404);
    });
  });
});

// Helper functions
async function ensureServicesReady(): Promise<void> {
  // Check that gateway, task, bid, and payment services are running
  // Implement health check logic
}

async function setupTestScenario() {
  // Create customer, helper, task, bid, and payment intent
  // Return IDs for test use
}

async function cleanupTestData(): Promise<void> {
  // Clean up all test data created during tests
}

async function acceptBid(taskId: string, bidId: string, paymentIntentId: string) {
  // Helper to accept bid
}

async function markTaskComplete(taskId: string, helperId: string) {
  // Helper to mark task complete
}

async function createTask(options: { amount: number }): Promise<any> {
  // Helper to create task
}

async function createBid(options: {
  taskId: string;
  amount: number;
  helperTier?: string;
}): Promise<any> {
  // Helper to create bid
}

async function createPayment(options: { amount: number }): Promise<any> {
  // Helper to create payment intent
}

async function deleteBid(bidId: string): Promise<void> {
  // Helper to delete bid
}

async function deleteTask(taskId: string): Promise<void> {
  // Helper to delete task
}
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Created integration test file `tests/integration/payment-lifecycle.spec.ts`
- [ ] Test covers capture on bid acceptance scenario
- [ ] Test covers transfer on task completion scenario
- [ ] Test covers customer cancellation with fee scenario
- [ ] Test covers helper cancellation scenario
- [ ] Test covers payment validation failures
- [ ] Test covers fee calculations (customer 13%, helper tiers)
- [ ] Test covers cancellation fee cap (150 DKK)
- [ ] Test covers customer fee cap (119 DKK)
- [ ] Test covers idempotency scenarios
- [ ] All tests have cleanup logic to avoid data pollution
- [ ] All tests pass when services are running
- [ ] Code compiles with zero TypeScript errors
- [ ] Created evidence artifact for PA13

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check root project
npm run typecheck
# Expected: No type errors

# 2. Start infrastructure
npm run dev:up

# 3. Start all services
npm run services:up &
sleep 10

# 4. Run integration tests
VITEST_MODE=integration npm run test:integration -- payment-lifecycle
# Expected: All tests pass

# 5. Stop services
npm run services:down
npm run dev:down
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA13_integration_tests.json`

**Template:**

```json
{
  "task_id": "PA13",
  "win_code": "WA13",
  "title": "Integration Tests for Payment Lifecycle",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T17:35:00Z",
  "completed_at": "2025-10-15T18:35:00Z",
  "duration_minutes": 60,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Created payment-lifecycle integration test file",
    "Test covers capture on bid acceptance",
    "Test covers transfer on completion",
    "Test covers customer cancellation",
    "Test covers helper cancellation",
    "Test covers payment validation failures",
    "Test covers fee calculations",
    "Test covers cancellation fee cap (150 DKK)",
    "Test covers customer fee cap (119 DKK)",
    "Test covers idempotency",
    "All tests have cleanup logic",
    "All tests pass",
    "TypeScript compiles with zero errors"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "integration_tests": "PASS - X tests passed"
  },
  "files_created": [
    "tests/integration/payment-lifecycle.spec.ts"
  ],
  "test_coverage": {
    "scenarios": 6,
    "test_cases": 12,
    "all_passed": true
  },
  "scenarios_tested": [
    "Happy path: capture → complete → transfer",
    "Customer cancellation with fee",
    "Helper cancellation with fee",
    "Payment validation failures",
    "Fee calculations (customer and helper)",
    "Idempotency and cleanup"
  ],
  "notes": "Comprehensive integration tests cover full payment lifecycle. All scenarios validated.",
  "issues_encountered": []
}
```

---

## ⏱️ Time Box

**Maximum time:** 60 minutes

If you exceed 60 minutes, stop and report:
- What you've completed
- What's blocking you
- Estimated time needed to complete

---

## 💡 Implementation Tips

1. **Test isolation:** Each test should be independent with its own setup/teardown
2. **Cleanup:** Always cleanup test data even if tests fail
3. **Real services:** These are integration tests - run against real services, not mocks
4. **Idempotency:** Test that operations can be retried safely
5. **Edge cases:** Test fee caps, validation failures, and error scenarios
6. **Documentation:** Comment complex test scenarios for future maintainers

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] All 12+ integration tests written
- [ ] All tests pass against running services
- [ ] Tests cover happy path and error scenarios
- [ ] Fee calculations validated (caps and tiers)
- [ ] Cleanup logic prevents data pollution
- [ ] `npm run typecheck` passes
- [ ] `VITEST_MODE=integration npm run test:integration` passes
- [ ] Evidence artifact created at `.automation/phase2/PA13_integration_tests.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA13, proceed to **PA14** - Full Validation Gate.

**Note:** PA14 runs the complete `npm run prepr:validate` pipeline to ensure all code is production-ready.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check all services are running (`npm run services:up`)
2. Review existing integration test patterns in `tests/integration/`
3. Verify infrastructure is running (`npm run dev:up`)
4. Check service health endpoints before running tests
5. Report to PM with evidence artifact showing what you've completed

---

**End of PA13 Task Assignment**
