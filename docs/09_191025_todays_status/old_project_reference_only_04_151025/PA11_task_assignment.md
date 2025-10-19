# Task Assignment: PA11 - Add Payment Trigger to Task Service

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA11
**Duration:** 35 minutes
**Prerequisites:** PA10 complete

---

## 📋 Task Overview

Wire the task-service's bid acceptance endpoint to trigger payment capture in the payment-service. When a customer accepts a bid, the system must automatically capture payment with fees and persist the cross-service identifiers (taskId, bidId, paymentIntentId).

---

## 📁 Files to Modify

**Primary file:**
```
services/task-service/src/routes/tasks.ts
```

**Integration file (may need to create):**
```
services/task-service/src/integrations/payment-gateway.ts
```

**Related files (reference only):**
```
services/payment-service/src/routes/payment-routes.ts (PA09)
services/api-gateway/src/routes/payment-routes.ts (PA10)
```

---

## 🔧 Changes Required

### 1. Create Payment Gateway Client (if doesn't exist)

**File:** `services/task-service/src/integrations/payment-gateway.ts`

```typescript
export interface PaymentCaptureRequest {
  paymentIntentId: string;
  taskId: string;
  bidId: string;
  amount: number;
  helperTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  customerId: string;
  helperId: string;
}

export interface PaymentCaptureResponse {
  success: boolean;
  paymentIntentId: string;
  status: string;
  customerFee: number;
  helperFee: number;
  helperNetPayout: number;
  message?: string;
  error?: string;
}

export class PaymentGateway {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config?: { baseUrl?: string; timeout?: number }) {
    this.baseUrl = config?.baseUrl || process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';
    this.timeout = config?.timeout || 5000;
  }

  async capturePayment(request: PaymentCaptureRequest): Promise<PaymentCaptureResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/payments/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment capture failed');
      }

      return data as PaymentCaptureResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Payment capture request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
```

### 2. Update Task Acceptance Endpoint

**File:** `services/task-service/src/routes/tasks.ts`

Find the bid acceptance endpoint (likely `/tasks/:id/accept` or similar) and add payment capture logic:

```typescript
import { PaymentGateway } from '../integrations/payment-gateway';

// In your route handler or app setup:
const paymentGateway = new PaymentGateway();

// In the bid acceptance endpoint:
fastify.post('/tasks/:id/accept', async (request, reply) => {
  const { id: taskId } = request.params as { id: string };
  const { bidId, paymentIntentId } = request.body as {
    bidId: string;
    paymentIntentId: string;
  };

  try {
    // 1. Validate task exists and is in correct state
    const task = await taskRepository.findById(taskId);
    if (!task) {
      return reply.status(404).send({ error: 'Task not found' });
    }

    if (task.status !== 'open') {
      return reply.status(400).send({
        error: 'Task must be in open status to accept bid'
      });
    }

    // 2. Fetch bid details (to get helper info and amount)
    const bid = await bidRepository.findById(bidId);
    if (!bid || bid.taskId !== taskId) {
      return reply.status(404).send({ error: 'Bid not found for this task' });
    }

    // 3. Capture payment via payment-service
    const captureResult = await paymentGateway.capturePayment({
      paymentIntentId,
      taskId,
      bidId,
      amount: bid.amount,
      helperTier: bid.helperTier || 'bronze', // Get from bid or helper profile
      customerId: task.customerId,
      helperId: bid.helperId,
    });

    if (!captureResult.success) {
      return reply.status(500).send({
        error: 'Payment capture failed',
        details: captureResult.error,
      });
    }

    // 4. Update task status to accepted
    await taskRepository.update(taskId, {
      status: 'accepted',
      acceptedBidId: bidId,
      acceptedAt: new Date(),
      paymentIntentId, // Store for cross-service tracking
    });

    // 5. Log the event for observability
    request.log.info({
      taskId,
      bidId,
      paymentIntentId,
      captureStatus: captureResult.status,
      customerFee: captureResult.customerFee,
      helperNetPayout: captureResult.helperNetPayout,
    }, 'Bid accepted and payment captured');

    return reply.status(200).send({
      success: true,
      taskId,
      bidId,
      status: 'accepted',
      payment: {
        status: captureResult.status,
        customerFee: captureResult.customerFee,
        helperNetPayout: captureResult.helperNetPayout,
      },
    });
  } catch (error) {
    request.log.error({ error, taskId, bidId }, 'Bid acceptance failed');
    return reply.status(500).send({
      error: 'Failed to accept bid',
      message: (error as Error).message,
    });
  }
});
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Created PaymentGateway client (or equivalent HTTP client)
- [ ] PaymentGateway calls `/api/payments/capture` endpoint
- [ ] Bid acceptance endpoint fetches task and bid data
- [ ] Bid acceptance calls payment gateway to capture payment
- [ ] Payment capture failure prevents task status update
- [ ] Task status updates to 'accepted' only after successful capture
- [ ] paymentIntentId stored in task record for cross-service tracking
- [ ] Event logged with taskId, bidId, paymentIntentId, and capture status
- [ ] Error handling for payment timeout, network errors, and capture failures
- [ ] Code compiles with zero TypeScript errors
- [ ] Created evidence artifact for PA11

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check task service
npm --workspace services/task-service run typecheck
# Expected: No type errors

# 2. Run task service unit tests
npm --workspace services/task-service test
# Expected: All tests pass

# 3. Start infrastructure
npm run dev:up

# 4. Start payment service
npm --workspace services/payment-service run dev &

# 5. Start task service
npm --workspace services/task-service run dev &
sleep 3

# 6. Test bid acceptance triggers payment capture (manual test)
# Create a task, create a bid, then accept bid via API
# Verify payment capture is called and task status updates

# 7. Check logs for payment capture event
grep "Bid accepted and payment captured" .data/logs/task-service.log
# Expected: Should show logged events

# 8. Stop services
pkill -f "tsx watch src/index.ts"
npm run dev:down
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA11_payment_trigger.json`

**Template:**

```json
{
  "task_id": "PA11",
  "win_code": "WA11",
  "title": "Add Payment Trigger to Task Service",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T16:25:00Z",
  "completed_at": "2025-10-15T17:00:00Z",
  "duration_minutes": 35,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Created PaymentGateway client",
    "PaymentGateway calls /api/payments/capture",
    "Bid acceptance fetches task and bid data",
    "Bid acceptance calls payment gateway",
    "Payment failure prevents task update",
    "Task updates to accepted after successful capture",
    "paymentIntentId stored in task record",
    "Event logged with cross-service identifiers",
    "Error handling for timeout and failures",
    "TypeScript compiles with zero errors"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - all tests pass",
    "integration_test": "PASS - bid acceptance triggers payment capture"
  },
  "files_created": [
    "services/task-service/src/integrations/payment-gateway.ts"
  ],
  "files_modified": [
    "services/task-service/src/routes/tasks.ts"
  ],
  "lines_added": 120,
  "api_endpoints_modified": [
    "POST /tasks/:id/accept"
  ],
  "cross_service_integration": {
    "calls": "payment-service /api/payments/capture",
    "stores": "paymentIntentId in task record",
    "logs": "taskId, bidId, paymentIntentId, capture status"
  },
  "notes": "Task service now triggers payment capture on bid acceptance. Cross-service identifiers tracked.",
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

1. **Error handling:** Payment capture can fail - ensure task status isn't updated on failure
2. **Timeout:** Set reasonable timeout (5 seconds) for payment service calls
3. **Logging:** Log all cross-service calls with identifiers for debugging
4. **Idempotency:** Consider what happens if bid acceptance is called twice
5. **Validation:** Validate task is in 'open' status before accepting
6. **Testing:** You may need to mock PaymentGateway in existing tests

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] PaymentGateway client created and tested
- [ ] Bid acceptance endpoint updated
- [ ] Payment capture called before task status update
- [ ] Cross-service identifiers stored and logged
- [ ] Error handling for all failure scenarios
- [ ] `npm --workspace services/task-service run typecheck` passes
- [ ] `npm --workspace services/task-service test` passes (no regression)
- [ ] Evidence artifact created at `.automation/phase2/PA11_payment_trigger.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA11, proceed to **PA12** - Add Payment Validation to Bid Service.

**Note:** PA12 is NOT blocked. You can proceed immediately after completing PA11.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check PA09 payment-service endpoints are working
2. Verify payment-service is running and accessible
3. Check task-service has access to bid repository
4. Review existing task acceptance logic before modifying
5. Report to PM with evidence artifact showing what you've completed

---

**End of PA11 Task Assignment**
