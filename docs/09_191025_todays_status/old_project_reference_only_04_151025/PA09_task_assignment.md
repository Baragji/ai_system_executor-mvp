# Task Assignment: PA09 - Add API Endpoints for Payment Flows

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA09
**Duration:** 45 minutes
**Prerequisites:** PA08 complete
**⚠️ BLOCKING TASK:** PA12 and PA13 depend on this

---

## 📋 Task Overview

Add three new API endpoints to payment-service for Spec v3 payment flows: capture payment, transfer payment, and process cancellation. Expose handlers via REST API.

---

## 📁 Files to Modify

**Primary file:**
```
services/payment-service/src/routes/payment-routes.ts
```

**Related files (reference only):**
```
services/payment-service/src/handlers/capture-payment-handler.ts (PA06)
services/payment-service/src/handlers/transfer-payment-handler.ts (PA07)
services/payment-service/src/handlers/cancellation-fee-handler.ts (PA08)
```

---

## 🔧 Changes Required

### 1. Add Route Handlers to Payment Routes

**Add these three new routes:**

```typescript
// POST /api/payments/capture
// Capture payment when bid is accepted
fastify.post('/api/payments/capture', async (request, reply) => {
  const body = request.body as {
    paymentIntentId: string;
    taskId: string;
    bidId: string;
    amount: number;
    helperTier: 'bronze' | 'silver' | 'gold' | 'platinum';
    customerId: string;
    helperId: string;
  };

  // Validate request body
  if (!body.paymentIntentId || !body.taskId || !body.bidId || !body.amount || !body.helperTier) {
    return reply.status(400).send({
      error: 'Missing required fields',
      required: ['paymentIntentId', 'taskId', 'bidId', 'amount', 'helperTier', 'customerId', 'helperId'],
    });
  }

  try {
    const captureHandler = new CapturePaymentHandler(
      paymentRepository,
      stripeClient
    );

    const result = await captureHandler.handle({
      paymentIntentId: body.paymentIntentId,
      taskId: body.taskId,
      bidId: body.bidId,
      amount: body.amount,
      helperTier: body.helperTier,
      customerId: body.customerId,
      helperId: body.helperId,
    });

    if (result.success) {
      return reply.status(200).send(result);
    } else {
      return reply.status(500).send(result);
    }
  } catch (error) {
    return reply.status(500).send({
      error: (error as Error).message,
    });
  }
});

// POST /api/payments/transfer
// Transfer payment to helper after task completion
fastify.post('/api/payments/transfer', async (request, reply) => {
  const body = request.body as {
    paymentIntentId: string;
    taskId: string;
    bidId: string;
    helperStripeAccountId: string;
  };

  // Validate request body
  if (!body.paymentIntentId || !body.taskId || !body.bidId || !body.helperStripeAccountId) {
    return reply.status(400).send({
      error: 'Missing required fields',
      required: ['paymentIntentId', 'taskId', 'bidId', 'helperStripeAccountId'],
    });
  }

  try {
    const transferHandler = new TransferPaymentHandler(
      paymentRepository,
      stripeClient
    );

    const result = await transferHandler.handle({
      paymentIntentId: body.paymentIntentId,
      taskId: body.taskId,
      bidId: body.bidId,
      helperStripeAccountId: body.helperStripeAccountId,
    });

    if (result.success) {
      return reply.status(200).send(result);
    } else {
      return reply.status(500).send(result);
    }
  } catch (error) {
    return reply.status(500).send({
      error: (error as Error).message,
    });
  }
});

// POST /api/payments/cancel
// Process cancellation fee and refund
fastify.post('/api/payments/cancel', async (request, reply) => {
  const body = request.body as {
    paymentIntentId: string;
    taskId: string;
    bidId: string;
    cancelledBy: 'customer' | 'helper';
    reason?: string;
  };

  // Validate request body
  if (!body.paymentIntentId || !body.taskId || !body.bidId || !body.cancelledBy) {
    return reply.status(400).send({
      error: 'Missing required fields',
      required: ['paymentIntentId', 'taskId', 'bidId', 'cancelledBy'],
    });
  }

  if (body.cancelledBy !== 'customer' && body.cancelledBy !== 'helper') {
    return reply.status(400).send({
      error: 'Invalid cancelledBy value',
      allowed: ['customer', 'helper'],
    });
  }

  try {
    const cancellationHandler = new CancellationFeeHandler(
      paymentRepository,
      stripeClient
    );

    const result = await cancellationHandler.handle({
      paymentIntentId: body.paymentIntentId,
      taskId: body.taskId,
      bidId: body.bidId,
      cancelledBy: body.cancelledBy,
      reason: body.reason,
    });

    if (result.success) {
      return reply.status(200).send(result);
    } else {
      return reply.status(500).send(result);
    }
  } catch (error) {
    return reply.status(500).send({
      error: (error as Error).message,
    });
  }
});
```

### 2. Add Imports

**Add these imports at the top of the file:**

```typescript
import { CapturePaymentHandler } from '../handlers/capture-payment-handler';
import { TransferPaymentHandler } from '../handlers/transfer-payment-handler';
import { CancellationFeeHandler } from '../handlers/cancellation-fee-handler';
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Added `POST /api/payments/capture` endpoint
- [ ] Added `POST /api/payments/transfer` endpoint
- [ ] Added `POST /api/payments/cancel` endpoint
- [ ] All endpoints validate request body
- [ ] All endpoints return proper status codes (200 success, 400 validation error, 500 server error)
- [ ] All endpoints instantiate and call appropriate handlers
- [ ] Added imports for all three handlers
- [ ] Code compiles with zero TypeScript errors
- [ ] All existing tests still pass (no regression)
- [ ] Created evidence artifact for PA09

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check payment service
npm --workspace services/payment-service run typecheck
# Expected: No type errors

# 2. Run all payment service tests (regression check)
npm --workspace services/payment-service test
# Expected: All tests pass

# 3. Start payment service
npm --workspace services/payment-service run dev &
sleep 3

# 4. Test capture endpoint (should return 400 - missing fields)
curl -X POST http://localhost:3004/api/payments/capture \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expected: 400 error with "Missing required fields"

# 5. Test transfer endpoint (should return 400 - missing fields)
curl -X POST http://localhost:3004/api/payments/transfer \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expected: 400 error with "Missing required fields"

# 6. Test cancel endpoint (should return 400 - missing fields)
curl -X POST http://localhost:3004/api/payments/cancel \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expected: 400 error with "Missing required fields"

# 7. Stop payment service
pkill -f "tsx watch src/index.ts"
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA09_api_endpoints.json`

**Template:**

```json
{
  "task_id": "PA09",
  "win_code": "WA09",
  "title": "Add API Endpoints for Payment Flows",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T15:10:00Z",
  "completed_at": "2025-10-15T15:55:00Z",
  "duration_minutes": 45,
  "status": "COMPLETED",
  "blocking_task": true,
  "acceptance_criteria_met": [
    "Added POST /api/payments/capture endpoint",
    "Added POST /api/payments/transfer endpoint",
    "Added POST /api/payments/cancel endpoint",
    "All endpoints validate request body",
    "All endpoints return proper status codes",
    "All endpoints call appropriate handlers",
    "Added imports for handlers",
    "TypeScript compiles with zero errors",
    "All existing tests pass"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - all tests pass",
    "regression_check": "PASS",
    "endpoint_tests": {
      "capture_endpoint": "PASS - returns 400 for missing fields",
      "transfer_endpoint": "PASS - returns 400 for missing fields",
      "cancel_endpoint": "PASS - returns 400 for missing fields"
    }
  },
  "files_modified": [
    "services/payment-service/src/routes/payment-routes.ts"
  ],
  "endpoints_added": [
    "POST /api/payments/capture",
    "POST /api/payments/transfer",
    "POST /api/payments/cancel"
  ],
  "lines_added": 150,
  "notes": "API endpoints added for Spec v3 payment flows. This is a blocking task - PA12 and PA13 integration tests depend on these endpoints.",
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

1. **Validation:** Always validate request body before calling handlers
2. **Status codes:**
   - 200: Success
   - 400: Validation error (missing/invalid fields)
   - 500: Server error (handler failed)
3. **Handler instantiation:** Create handler instances in each route
4. **Error handling:** Wrap handler calls in try/catch
5. **Response format:** Return handler response directly if success, or error object if failed
6. **Testing:** Use curl to test validation (all endpoints should reject empty body)

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] All 3 endpoints added to payment-routes.ts
- [ ] All imports added
- [ ] All endpoints validate request body
- [ ] `npm --workspace services/payment-service run typecheck` passes
- [ ] `npm --workspace services/payment-service test` passes (no regression)
- [ ] Manual curl tests pass (validation errors returned)
- [ ] Evidence artifact created at `.automation/phase2/PA09_api_endpoints.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA09, proceed to **PA10** - Add Payment Gateway Routes.

**⚠️ IMPORTANT:** This is a BLOCKING TASK. Do NOT proceed to PA12 or PA13 until PA09 is fully complete and validated. Integration tests depend on these endpoints.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check existing payment routes for patterns
2. Verify handler imports are correct
3. Test with curl to validate endpoints work
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA09 Task Assignment**
