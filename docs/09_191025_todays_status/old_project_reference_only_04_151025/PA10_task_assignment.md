# Task Assignment: PA10 - Add Payment Gateway Routes

**Phase:** 2 - Payment Service Spec v3 Upgrade
**Win Code:** WA10
**Duration:** 30 minutes
**Prerequisites:** PA08, PA09 complete

---

## 📋 Task Overview

Add proxy routes to API Gateway for the three new payment endpoints. Enable external access to capture, transfer, and cancel operations through the gateway.

---

## 📁 Files to Modify

**Primary file:**
```
services/api-gateway/src/routes/payment-routes.ts
```

**Related files (reference only):**
```
services/payment-service/src/routes/payment-routes.ts (PA09)
```

---

## 🔧 Changes Required

### 1. Add Gateway Proxy Routes

**Add these three new proxy routes to the gateway:**

```typescript
// POST /api/payments/capture
// Proxy to payment-service capture endpoint
fastify.post('/api/payments/capture', async (request, reply) => {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(request.headers.authorization && {
          Authorization: request.headers.authorization,
        }),
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();

    return reply.status(response.status).send(data);
  } catch (error) {
    return reply.status(500).send({
      error: 'Payment capture failed',
      message: (error as Error).message,
    });
  }
});

// POST /api/payments/transfer
// Proxy to payment-service transfer endpoint
fastify.post('/api/payments/transfer', async (request, reply) => {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.authorization && {
          Authorization: request.headers.authorization,
        }),
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();

    return reply.status(response.status).send(data);
  } catch (error) {
    return reply.status(500).send({
      error: 'Payment transfer failed',
      message: (error as Error).message,
    });
  }
});

// POST /api/payments/cancel
// Proxy to payment-service cancel endpoint
fastify.post('/api/payments/cancel', async (request, reply) => {
  try {
    const response = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.authorization && {
          Authorization: request.headers.authorization,
        }),
      },
      body: JSON.stringify(request.body),
    });

    const data = await response.json();

    return reply.status(response.status).send(data);
  } catch (error) {
    return reply.status(500).send({
      error: 'Payment cancellation failed',
      message: (error as Error).message,
    });
  }
});
```

### 2. Verify PAYMENT_SERVICE_URL Constant

**Ensure this constant exists at the top of the file:**

```typescript
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';
```

---

## ✅ Acceptance Criteria

You must complete ALL of the following:

- [ ] Added `POST /api/payments/capture` proxy route to gateway
- [ ] Added `POST /api/payments/transfer` proxy route to gateway
- [ ] Added `POST /api/payments/cancel` proxy route to gateway
- [ ] All routes proxy requests to payment-service
- [ ] All routes forward request body as JSON
- [ ] All routes forward authorization headers
- [ ] All routes return payment-service response with correct status code
- [ ] All routes handle errors gracefully (500 on failure)
- [ ] Verified PAYMENT_SERVICE_URL constant exists
- [ ] Code compiles with zero TypeScript errors
- [ ] All existing tests still pass (no regression)
- [ ] Created evidence artifact for PA10

---

## 🔍 Validation Commands

Run these commands to validate your changes:

```bash
# 1. Type check API gateway
npm --workspace services/api-gateway run typecheck
# Expected: No type errors

# 2. Run all API gateway tests (regression check)
npm --workspace services/api-gateway test
# Expected: All tests pass

# 3. Start both services
npm --workspace services/payment-service run dev &
npm --workspace services/api-gateway run dev &
sleep 5

# 4. Test capture endpoint via gateway (should return 400 - missing fields)
curl -X POST http://localhost:3000/api/payments/capture \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expected: 400 error from payment-service via gateway

# 5. Test transfer endpoint via gateway (should return 400 - missing fields)
curl -X POST http://localhost:3000/api/payments/transfer \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expected: 400 error from payment-service via gateway

# 6. Test cancel endpoint via gateway (should return 400 - missing fields)
curl -X POST http://localhost:3000/api/payments/cancel \
  -H "Content-Type: application/json" \
  -d '{}' | jq
# Expected: 400 error from payment-service via gateway

# 7. Stop services
pkill -f "tsx watch src/index.ts"
```

---

## 📦 Evidence Artifact

Create this file: `.automation/phase2/PA10_gateway_routes.json`

**Template:**

```json
{
  "task_id": "PA10",
  "win_code": "WA10",
  "title": "Add Payment Gateway Routes",
  "developer": "YOUR_NAME",
  "started_at": "2025-10-15T15:55:00Z",
  "completed_at": "2025-10-15T16:25:00Z",
  "duration_minutes": 30,
  "status": "COMPLETED",
  "acceptance_criteria_met": [
    "Added POST /api/payments/capture proxy route",
    "Added POST /api/payments/transfer proxy route",
    "Added POST /api/payments/cancel proxy route",
    "All routes proxy to payment-service",
    "All routes forward request body",
    "All routes forward auth headers",
    "All routes return correct status codes",
    "All routes handle errors gracefully",
    "Verified PAYMENT_SERVICE_URL constant",
    "TypeScript compiles with zero errors",
    "All existing tests pass"
  ],
  "validation_outputs": {
    "typecheck": "PASS - 0 errors",
    "unit_tests": "PASS - all tests pass",
    "regression_check": "PASS",
    "gateway_tests": {
      "capture_via_gateway": "PASS - proxies to payment-service",
      "transfer_via_gateway": "PASS - proxies to payment-service",
      "cancel_via_gateway": "PASS - proxies to payment-service"
    }
  },
  "files_modified": [
    "services/api-gateway/src/routes/payment-routes.ts"
  ],
  "gateway_routes_added": [
    "POST /api/payments/capture",
    "POST /api/payments/transfer",
    "POST /api/payments/cancel"
  ],
  "lines_added": 90,
  "notes": "Gateway routes added for Spec v3 payment flows. External clients can now access payment operations via gateway.",
  "issues_encountered": []
}
```

---

## ⏱️ Time Box

**Maximum time:** 30 minutes

If you exceed 30 minutes, stop and report:
- What you've completed
- What's blocking you
- Estimated time needed to complete

---

## 💡 Implementation Tips

1. **Proxy pattern:** Use `fetch()` to forward requests to payment-service
2. **Headers:** Always forward `Authorization` header if present
3. **Status codes:** Return the same status code from payment-service
4. **Error handling:** Wrap fetch in try/catch, return 500 on error
5. **Service URL:** Use environment variable with fallback to localhost
6. **Testing:** Test via gateway (port 3000) to verify proxy works
7. **Body:** Use `JSON.stringify(request.body)` to forward body

---

## ✅ Completion Checklist

Before marking this task complete:

- [ ] All 3 proxy routes added to gateway payment-routes.ts
- [ ] PAYMENT_SERVICE_URL constant verified
- [ ] `npm --workspace services/api-gateway run typecheck` passes
- [ ] `npm --workspace services/api-gateway test` passes (no regression)
- [ ] Manual curl tests pass (gateway proxies to payment-service)
- [ ] Evidence artifact created at `.automation/phase2/PA10_gateway_routes.json`
- [ ] All validation commands executed successfully

---

## 🚀 Next Task

After completing PA10, proceed to **PA11** - Update Payment Service Health Check.

**Note:** PA11 is NOT blocked. You can proceed immediately after completing PA10.

---

## ❓ Questions or Issues?

If you encounter any issues:

1. Check existing gateway proxy routes for patterns
2. Verify payment-service is running on correct port (3004)
3. Test payment-service endpoints directly before testing via gateway
4. Report to PM with evidence artifact showing what you've completed

---

**End of PA10 Task Assignment**
