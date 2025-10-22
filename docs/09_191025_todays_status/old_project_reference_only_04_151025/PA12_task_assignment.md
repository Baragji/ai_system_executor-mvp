# Task Assignment: PA12 - Add Payment Validation to Bid Service

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA12
**Duration:** 35 minutes
**Prerequisites:** PA11 complete

---

## 📋 Task Overview

Add validation to the bid-service to prevent bid acceptance when payment capture prerequisites fail. The bid-service should validate that payment information is available and surface actionable error messages to the customer when payment issues occur.

---

## 📁 Files to Modify

**Primary file:**
```
services/bid-service/src/routes/bids.ts
```

**Integration file (may need to create):**
```
services/bid-service/src/integrations/payment-gateway.ts
```

**Related files (reference only):**
```
services/task-service/src/routes/tasks.ts (PA11 - may contain validation patterns)
```

---

## 🔧 Changes Required

### 1. Create Payment Validation Client (if doesn't exist)

**File:** `services/bid-service/src/integrations/payment-gateway.ts`

```typescript
export interface PaymentMethodValidationRequest {
  customerId: string;
  paymentMethodId?: string;
}

export interface PaymentMethodValidationResponse {
  valid: boolean;
  error?: string;
  reason?: string;
}

export class PaymentGateway {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config?: { baseUrl?: string; timeout?: number }) {
    this.baseUrl = config?.baseUrl || process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';
    this.timeout = config?.timeout || 5000;
  }

  /**
   * Validate that a customer has a valid payment method before bid acceptance
   */
  async validatePaymentMethod(
    request: PaymentMethodValidationRequest
  ): Promise<PaymentMethodValidationResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/payments/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          valid: false,
          error: data.error || 'Payment validation failed',
          reason: data.reason,
        };
      }

      return data as PaymentMethodValidationResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return {
          valid: false,
          error: 'Payment validation request timed out',
          reason: 'TIMEOUT',
        };
      }

      return {
        valid: false,
        error: (error as Error).message,
        reason: 'NETWORK_ERROR',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
```

### 2. Update Bid Acceptance Validation

**File:** `services/bid-service/src/routes/bids.ts`

Find the bid acceptance endpoint and add payment validation:

```typescript
import { PaymentGateway } from '../integrations/payment-gateway';

// In your route handler or app setup:
const paymentGateway = new PaymentGateway();

// In the bid acceptance endpoint:
fastify.post('/bids/:id/accept', async (request, reply) => {
  const { id: bidId } = request.params as { id: string };
  const { paymentMethodId } = request.body as {
    paymentMethodId?: string;
  };

  try {
    // 1. Fetch bid details
    const bid = await bidRepository.findById(bidId);
    if (!bid) {
      return reply.status(404).send({ error: 'Bid not found' });
    }

    if (bid.status !== 'pending') {
      return reply.status(400).send({
        error: 'Bid must be in pending status to accept',
        currentStatus: bid.status,
      });
    }

    // 2. Fetch task to get customer info
    const task = await taskGateway.getTask(bid.taskId);
    if (!task) {
      return reply.status(404).send({ error: 'Associated task not found' });
    }

    // 3. Validate payment method BEFORE accepting bid
    const paymentValidation = await paymentGateway.validatePaymentMethod({
      customerId: task.customerId,
      paymentMethodId,
    });

    if (!paymentValidation.valid) {
      request.log.warn({
        bidId,
        customerId: task.customerId,
        error: paymentValidation.error,
        reason: paymentValidation.reason,
      }, 'Bid acceptance blocked: payment validation failed');

      return reply.status(400).send({
        error: 'Cannot accept bid: Payment validation failed',
        reason: paymentValidation.reason,
        message: getCustomerFacingMessage(paymentValidation.reason),
        actionRequired: getActionableSteps(paymentValidation.reason),
      });
    }

    // 4. If payment valid, proceed with bid acceptance
    const acceptedBid = await bidRepository.update(bidId, {
      status: 'accepted',
      acceptedAt: new Date(),
      paymentMethodId,
    });

    request.log.info({
      bidId,
      taskId: bid.taskId,
      customerId: task.customerId,
    }, 'Bid accepted with valid payment method');

    return reply.status(200).send({
      success: true,
      bid: acceptedBid,
    });
  } catch (error) {
    request.log.error({ error, bidId }, 'Bid acceptance failed');
    return reply.status(500).send({
      error: 'Failed to accept bid',
      message: (error as Error).message,
    });
  }
});

/**
 * Convert technical payment reasons to customer-facing messages
 */
function getCustomerFacingMessage(reason?: string): string {
  switch (reason) {
    case 'NO_PAYMENT_METHOD':
      return 'Please add a payment method to your account before accepting this bid.';
    case 'PAYMENT_METHOD_EXPIRED':
      return 'Your payment method has expired. Please update your payment information.';
    case 'INSUFFICIENT_FUNDS':
      return 'Your payment method was declined. Please use a different payment method.';
    case 'TIMEOUT':
      return 'Payment validation timed out. Please try again in a moment.';
    case 'NETWORK_ERROR':
      return 'Unable to verify payment method. Please check your connection and try again.';
    default:
      return 'Unable to process payment. Please verify your payment method and try again.';
  }
}

/**
 * Provide actionable steps for customers to resolve payment issues
 */
function getActionableSteps(reason?: string): string[] {
  switch (reason) {
    case 'NO_PAYMENT_METHOD':
      return [
        'Go to Account Settings',
        'Add a valid credit or debit card',
        'Return to this bid and try accepting again',
      ];
    case 'PAYMENT_METHOD_EXPIRED':
      return [
        'Go to Payment Methods in your account',
        'Update the expiration date or add a new card',
        'Try accepting the bid again',
      ];
    case 'INSUFFICIENT_FUNDS':
      return [
        'Add a different payment method',
        'Or contact your bank to resolve the issue',
        'Try accepting the bid again',
      ];
    default:
      return [
        'Verify your payment method in Account Settings',
        'Try accepting the bid again',
        'Contact support if the issue persists',
      ];
  }
}
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Created PaymentGateway validation client (or extended existing)
- [ ] Bid acceptance endpoint validates payment method BEFORE accepting bid
- [ ] Payment validation failures prevent bid status update
- [ ] Actionable error messages returned to customer
- [ ] Error messages include reason codes and next steps
- [ ] Successful validation allows bid acceptance to proceed
- [ ] All validation failures logged with context
- [ ] Added helper functions for customer-facing messages
- [ ] Error handling for timeout and network errors
- [ ] Code compiles with zero TypeScript errors
- [ ] Created evidence artifact for PA12

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check bid service
npm --workspace services/bid-service run typecheck
# Expected: No type errors

# 2. Run bid service unit tests
npm --workspace services/bid-service test
# Expected: All tests pass

# 3. Start infrastructure
npm run dev:up

# 4. Start payment service
npm --workspace services/payment-service run dev &

# 5. Start bid service
npm --workspace services/bid-service run dev &
sleep 3

# 6. Test bid acceptance with invalid payment (should fail gracefully)
curl -X POST http://localhost:3009/bids/test_bid_123/accept \
  -H "Content-Type: application/json" \
  -d '{"paymentMethodId": "invalid"}' | jq
# Expected: 400 error with actionable message

# 7. Check logs for payment validation failure
grep "Bid acceptance blocked: payment validation failed" .data/logs/bid-service.log
# Expected: Should show logged warnings

# 8. Stop services
pkill -f "tsx watch src/index.ts"
npm run dev:down
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA12_payment_validation.json`

**Template:**

```json
{
  "task_id": "PA12",
  "win_code": "WA12",
  "title": "Add Payment Validation to Bid Service",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T17:00:00Z",
  "completed_at": "2025-10-15T17:35:00Z",
  "duration_minutes": 35,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Created PaymentGateway validation client",
    "Bid acceptance validates payment before accepting",
    "Payment failures prevent bid status update",
    "Actionable error messages returned",
    "Error messages include reason codes and steps",
    "Successful validation allows acceptance",
    "All failures logged with context",
    "Helper functions for customer messages",
    "Error handling for timeout and network",
    "TypeScript compiles with zero errors"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - all tests pass",
    "integration_test": "PASS - payment failures block bid acceptance"
  },
  "files_created": [
    "services/bid-service/src/integrations/payment-gateway.ts"
  ],
  "files_modified": [
    "services/bid-service/src/routes/bids.ts"
  ],
  "lines_added": 150,
  "api_endpoints_modified": [
    "POST /bids/:id/accept"
  ],
  "error_messages_added": {
    "NO_PAYMENT_METHOD": "Customer-facing message with action steps",
    "PAYMENT_METHOD_EXPIRED": "Customer-facing message with action steps",
    "INSUFFICIENT_FUNDS": "Customer-facing message with action steps",
    "TIMEOUT": "Customer-facing message with action steps",
    "NETWORK_ERROR": "Customer-facing message with action steps"
  },
  "notes": "Bid service now validates payment before acceptance. Customers get actionable error messages.",
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

1. **Fail fast:** Validate payment BEFORE any bid status changes
2. **User experience:** Provide clear, actionable error messages
3. **Logging:** Log all payment failures for debugging and fraud detection
4. **Timeout handling:** Payment validation should timeout quickly (3-5 seconds)
5. **Testing:** Mock payment gateway to test all failure scenarios
6. **Customer support:** Error messages should guide customers to resolution

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] PaymentGateway validation client created
- [ ] Bid acceptance validates payment first
- [ ] All error scenarios handled with customer-facing messages
- [ ] Logging for all validation failures
- [ ] `npm --workspace services/bid-service run typecheck` passes
- [ ] `npm --workspace services/bid-service test` passes (no regression)
- [ ] Evidence artifact created at `.automation/phase2/PA12_payment_validation.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA12, proceed to **PA13** - Integration Tests for Payment Lifecycle.

**Note:** PA13 is NOT blocked. You can proceed immediately after completing PA12.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check payment-service validation endpoint exists
2. Review PA11 for task-service integration patterns
3. Test with different payment failure scenarios
4. Verify customer-facing messages are clear and helpful
5. Report to PM with evidence artifact showing what you've completed

---

**End of PA12 Task Assignment**
