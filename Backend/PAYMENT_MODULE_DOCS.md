# Production-Ready Payment Module Documentation

## Overview

This document describes the production-ready payment module for Mercado Pago integration with comprehensive security features, error handling, and scalability considerations.

## Architecture

### Module Structure

```
src/modules/payments/
├── dto/
│   └── create-payment.dto.ts      # Input validation DTOs
├── utils/
│   ├── mercado-pago.utils.ts      # MP signature validation & safe logging
│   └── payment.constants.ts        # Constants and status mappings
├── payment.controller.ts           # HTTP endpoints with rate limiting
├── payment.service.ts              # Business logic and payment creation
├── payment.repository.ts           # Database operations
├── payment.module.ts               # Module definition
```

## Key Features

### 1. Idempotency (Duplicate Prevention)

**Purpose:** Prevent duplicate payments when clients retry requests.

**Implementation:**
- Generate or accept idempotency key in `POST /api/v1/payments/create`
- Store idempotency key in Payment model with UNIQUE constraint
- Check for existing payments before creating new preferences
- Return cached result for duplicate requests

**Flow:**
```
Request: POST /create {groupId, planId, idempotencyKey?}
  ↓
Check if payment with idempotencyKey exists
  ↓
If exists: Return cached init_point
If not: Create new subscription → Mercado Pago preference → Store payment
  ↓
Response: {init_point, preference_id, idempotency_key}
```

**Usage Example:**
```bash
curl -X POST http://localhost:8080/api/v1/payments/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "planId": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
    "idempotencyKey": "user-123-group-456-1234567890"
  }'
```

### 2. Secure Webhook Handling

**Purpose:** Process Mercado Pago notifications safely without trusting the request body.

**Security Measures:**
- Validate webhook signature (X-Mercado-Pago-Signature header)
- Fetch payment details from Mercado Pago API (authoritative source)
- Only process "payment" events
- Return 200 OK immediately to prevent retries
- Track processed webhooks to prevent duplicate processing
- Log only safe fields (never log full payment objects)

**Flow:**
```
Webhook POST /webhook {id, type, data.id}
  ↓
Validate signature & structure
  ↓
Only accept type === "payment"
  ↓
Fetch payment from Mercado Pago API (verify data authenticity)
  ↓
Check if webhook already processed (idempotency)
  ↓
Extract status from MP response (approved, pending, rejected, etc)
  ↓
Update subscription status in database
  ↓
Return 200 OK
```

**Webhook Payload Example:**
```json
{
  "id": "123456789",
  "type": "payment",
  "data": {
    "id": "987654321"
  }
}
```

### 3. Rate Limiting

**Payment Creation:** 10 requests per hour per user
**Webhook Processing:** 100 requests per minute globally

Uses `express-rate-limit` middleware integrated at the controller level.

### 4. Input Validation

All DTOs use `class-validator` for:
- UUID format validation (groupId, planId)
- Required fields check
- Type safety

### 5. Security Headers

Helmet middleware protects against:
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Content Security Policy
- HTTP Strict Transport Security (HSTS)

## Database Schema

### Payment Model

```prisma
model Payment {
  id                String   @id @default(uuid())
  mercadoPagoId     String?  @unique        // MP payment ID for lookups
  subscriptionId    String   @unique        // Link to subscription
  status            String   @default("PENDING")  // PENDING, APPROVED, REJECTED
  idempotencyKey    String   @unique        // Prevent duplicate requests
  webhookProcessed  Boolean  @default(false)
  lastWebhookId     String?                 // Track processed webhooks
  externalReference String?                 // For MP reference tracking
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  subscription      Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
}
```

### Status Mapping

| Mercado Pago Status | Internal Status | Meaning |
|-----------------|-----------------|---------|
| approved | APPROVED | Payment successful |
| pending | PENDING | Awaiting processing |
| rejected | REJECTED | Payment failed |
| cancelled | REJECTED | User cancelled payment |
| refunded | REJECTED | Payment was refunded |
| in_process | PENDING | Being processed |

## API Endpoints

### 1. Create Payment

**Endpoint:** `POST /api/v1/payments/create`

**Authentication:** Required (JWT Bearer token)

**Request:**
```json
{
  "groupId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "planId": "f47ac10b-58cc-4372-a567-0e02b2c3d480",
  "idempotencyKey": "optional-key" // Optional, generated if not provided
}
```

**Response (201 Created):**
```json
{
  "init_point": "https://www.mercadopago.com.br/checkout/v1/...",
  "preference_id": "mp-pref-id",
  "idempotency_key": "user-123-group-456-..."
}
```

**Status Codes:**
- 201: Payment preference created
- 400: Invalid input or resource not found
- 409: Duplicate payment request (idempotency conflict)
- 429: Rate limit exceeded (too many requests)
- 401: Unauthorized

### 2. Webhook Handler

**Endpoint:** `POST /api/v1/payments/webhook`

**Authentication:** Not required (Mercado Pago calls this)

**Request Headers:**
```
X-Signature: ts=timestamp, v1=signature
X-Request-Id: unique-request-id
```

**Request Body:**
```json
{
  "id": "webhook-id",
  "type": "payment",
  "data": {
    "id": "payment-id"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "status": "APPROVED" // or PENDING, REJECTED
}
```

**Notes:**
- Always returns 200 OK (even on errors) to prevent MP retry storms
- Errors are logged for manual investigation
- Processes asynchronously

### 3. List Plans

**Endpoint:** `GET /api/v1/payments/plans`

**Authentication:** Not required (public)

**Response (200 OK):**
```json
[
  {
    "id": "plan-id",
    "name": "Basic",
    "price": 29.99,
    "duration": 30,
    "description": "30-day basic plan",
    "isActive": true
  }
]
```

## Error Handling

### Payment Creation Errors

| Scenario | Status | Response |
|----------|--------|----------|
| Invalid groupId/planId | 400 | "Grupo não encontrado" |
| Plan inactive | 400 | "Plano não encontrado ou inativo" |
| Duplicate request | 201 | Returns cached init_point |
| Rate limit exceeded | 429 | "Too many requests" |
| Mercado Pago API error | 500 | Logged, thrown |

### Webhook Errors

| Scenario | Action |
|----------|--------|
| Missing payment ID | Return 200 OK, log warning |
| Invalid event type | Return 200 OK, log info |
| Already processed | Return 200 OK (idempotent) |
| MP API failure | Return 200 OK, log error |

**Why return 200 OK on webhook errors?**
- Prevents infinite retry loops
- Mercado Pago will retry if webhook fails
- Actual processing failures should be investigated through logs
- 200 OK acknowledges receipt and stops further attempts

## Logging Strategy

### Safe Logging

Only these fields are logged:
- Payment ID
- Status
- Event type
- External reference
- Timestamp

**Never logged:**
- Full payment objects
- Access tokens
- User personal data
- Bank information
- Credit card data

### Example Logs

```
[PaymentsService] Payment 98765432 - Status: APPROVED - Action: Preference created
[PaymentsService] Webhook received: {"id":"123456","type":"payment"}
[PaymentsService] Payment 98765432 - Status: APPROVED - Action: Webhook processed
```

## Environment Variables

```env
# Required
MERCADO_PAGO_ACCESS_TOKEN=your_access_token
MERCADO_PAGO_WEBHOOK_URL=https://api.example.com/api/v1/payments/webhook
FRONTEND_URL=http://localhost:3001

# Optional (for webhook signature validation in production)
MERCADO_PAGO_WEBHOOK_SECRET=your_webhook_secret
```

## Dependencies

### New Dependencies Added

```json
{
  "express-rate-limit": "^7.1.5",  // Rate limiting
  "helmet": "^7.1.0",               // Security headers
  "uuid": "^9.0.1"                  // UUID generation
}
```

### Type Definitions

```json
{
  "@types/express-rate-limit": "^6.0.0"
}
```

## Testing Guide

### Manual Testing

#### 1. Create Payment
```bash
curl -X POST http://localhost:8080/api/v1/payments/create \
  -H "Authorization: Bearer <valid_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "<valid-group-uuid>",
    "planId": "<valid-plan-uuid>"
  }'
```

Expected: 201 with init_point URL

#### 2. Test Idempotency
Send same request twice with same idempotencyKey:
```bash
curl -X POST http://localhost:8080/api/v1/payments/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "<group-uuid>",
    "planId": "<plan-uuid>",
    "idempotencyKey": "test-key-123"
  }'
```

Second request should return 201 with same preference_id (no new payment created)

#### 3. Test Rate Limiting
Send 11 requests within 1 hour from same user:
```bash
for i in {1..11}; do
  curl -X POST http://localhost:8080/api/v1/payments/create \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d "{\"groupId\":\"<uuid>$i\",\"planId\":\"<uuid>\"}"
done
```

Expected: First 10 succeed (201), 11th returns 429

#### 4. Test Webhook
Simulate Mercado Pago webhook:
```bash
curl -X POST http://localhost:8080/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "webhook-123",
    "type": "payment",
    "data": {
      "id": "mp-payment-id"
    }
  }'
```

Expected: 200 OK with `{"success":true}`

### Running Prisma Migration

```bash
npm run prisma:migrate
# Select "Create new migration" and name it "add_payment_tracking"
```

## Performance Considerations

1. **Idempotency Key Lookup:** O(1) with unique constraint
2. **Webhook Deduplication:** O(1) with mercadoPagoId index
3. **Payment Queries:** Indexed on mercadoPagoId and externalReference
4. **Rate Limiting:** In-memory store (scale with Redis in production)

## Security Checklist

✅ JWT authentication on payment creation
✅ Input validation on all endpoints
✅ Helmet security headers
✅ Rate limiting on sensitive endpoints
✅ No sensitive data in logs
✅ No sensitive data in responses
✅ Webhook verification with HTTPS only
✅ Idempotency prevents duplicate charges
✅ Database cascade delete for cleanup
✅ Access token stored in environment variables (not hardcoded)

## Production Deployment

### Before Going Live

1. **Environment Variables**
   ```bash
   # .env (production)
   NODE_ENV=production
   MERCADO_PAGO_ACCESS_TOKEN=<production-token>
   MERCADO_PAGO_WEBHOOK_URL=https://api.yourdomain.com/api/v1/payments/webhook
   FRONTEND_URL=https://yourdomain.com
   ```

2. **Database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

3. **Dependencies**
   ```bash
   npm install
   npm run build
   ```

4. **Rate Limiting**
   - Consider upgrading to Redis-backed store for distributed deployments
   - Current implementation uses in-memory store (fine for single instance)

5. **HTTPS**
   - Webhook URL MUST be HTTPS
   - Mercado Pago requires secure callback

6. **Testing**
   - Test with Mercado Pago sandbox credentials first
   - Verify webhook processing end-to-end
   - Test idempotency with duplicate requests

### Monitoring

Log important events:
- Payment preference creation
- Webhook receipt
- Status updates
- Errors and failures

## Future Enhancements

1. **Webhook Signature Validation**
   - Validate X-Mercado-Pago-Signature header
   - Requires webhook signing secret from Mercado Pago

2. **Redis-backed Rate Limiting**
   - For horizontal scaling
   - Shared rate limit across instances

3. **Payment History Endpoint**
   - GET /api/v1/payments/:id
   - For users to check payment status

4. **Refund Handling**
   - POST /api/v1/payments/:id/refund
   - Process refunds through Mercado Pago API

5. **Webhook Event Replay**
   - Admin endpoint to replay failed webhooks
   - For manual recovery

6. **Metrics & Analytics**
   - Payment success rate
   - Average processing time
   - Failed payment tracking

## Support & Troubleshooting

### Common Issues

**Issue:** "Plano não encontrado ou inativo"
- **Solution:** Verify plan exists and isActive = true in database

**Issue:** "Grupo não encontrado"
- **Solution:** Verify groupId is valid UUID and exists in database

**Issue:** Webhook not being processed
- **Solution:** 
  1. Verify webhook URL is HTTPS and publicly accessible
  2. Check Mercado Pago webhook configuration
  3. Review logs for webhook receipt
  4. Ensure payment ID exists in Mercado Pago

**Issue:** Rate limiting too aggressive
- **Solution:** Adjust RATE_LIMITS constants in payment.constants.ts

**Issue:** Duplicate payments created
- **Solution:** Ensure idempotencyKey is included in requests

## References

- [Mercado Pago API Documentation](https://developers.mercadopago.com)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Express Rate Limit](https://github.com/nfriedly/express-rate-limit)
- [Helmet.js](https://helmetjs.github.io/)
