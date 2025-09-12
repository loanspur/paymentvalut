Here's a **Product Requirements Document (PRD)** you can paste into Cursor AI to guide the implementation of your secure **Payments Vault System** with **Supabase Vault, Edge Functions, USSD integration, and LoanSpur loan creation**. I've structured it to cover **problem, goals, architecture, data models, API contracts, workflows, and edge cases** so Cursor can generate code consistently.

---

# 📄 PRD: Payments Vault - Secure M-Pesa B2C Disbursement with Supabase & USSD Integration

## 1. Problem Statement

We previously experienced fraud where M-Pesa B2C credentials (consumer key/secret) were compromised. We now require a secure system that:

* Keeps Safaricom B2C credentials safe (never exposed to USSD app).
* Disburses funds only via a secure Supabase function.
* Notifies the USSD app with transaction results so it can send SMS and create loans in LoanSpur **only after successful disbursement**.
* Maintains auditability, retries, and idempotency.

---

## 2. Goals & Non-Goals

### Goals

* Store all M-Pesa credentials in **Supabase Vault / Edge Function secrets**.
* Provide a secure `POST /disburse` API that:

  * Validates requests.
  * Calls M-Pesa B2C.
  * Returns an acknowledgment to USSD.
* Receive and process **Safaricom callbacks** (`ResultURL`, `QueueTimeOutURL`).
* Notify USSD backend asynchronously with the **final result** (`TransactionReceipt`).
* Persist all requests and results for reconciliation.
* Support both **UI-triggered disbursements** and **USSD-triggered disbursements**.

### Non-Goals

* No direct USSD → M-Pesa communication.
* No secret sharing outside Supabase.
* No customer SMS sending directly from Supabase; that responsibility remains with the USSD backend.

---

## 3. System Architecture

**Components**

1. **Supabase Edge Functions**

   * `/disburse`: secure entrypoint for disbursement requests.
   * `/mpesa/b2c/result`: receives final success/failure callbacks.
   * `/mpesa/b2c/timeout`: receives timeout callbacks.
   * `/partners-create`: generates API keys for USSD partners (hashed in DB).
2. **Supabase Database**

   * `partners`: authorized USSD backends + hashed API keys.
   * `disbursement_requests`: all requests (pending, accepted, failed, success).
   * `disbursement_callbacks`: raw Safaricom callback data.
3. **USSD Backend**

   * Calls `/disburse` with `x-api-key`.
   * Waits for callback/webhook before SMS + loan creation.
   * Creates loan in LoanSpur only after receiving `transaction_receipt`.

---

## 4. Data Model

### Table: `partners`

* `id` (uuid, pk)
* `name` (text)
* `api_key_hash` (text, sha256 of key)
* `is_active` (boolean)
* `last_used_at` (timestamp)

### Table: `disbursement_requests`

* `id` (uuid, pk) = `disbursement_id`
* `origin` (enum: ui, ussd)
* `tenant_id` (text)
* `customer_id` (text)
* `client_request_id` (text, idempotency key)
* `msisdn` (text)
* `amount` (numeric)
* `status` (enum: queued, accepted, failed, success)
* `conversation_id` (text)
* `transaction_receipt` (text, nullable)
* `result_code` (text, nullable)
* `result_desc` (text, nullable)
* `created_at` (timestamp)

### Table: `disbursement_callbacks`

* `id` (uuid, pk)
* `conversation_id` (text)
* `result` (jsonb)
* `created_at` (timestamp)

---

## 5. API Contracts

### 5.1 USSD → `/disburse`

**Request**

```json
{
  "amount": 1200,
  "msisdn": "2547XXXXXXXX",
  "tenant_id": "TEN123",
  "customer_id": "CUST456",
  "client_request_id": "USSD-2025-09-09-000123"
}
```

**Response (success/accepted)**

```json
{
  "status": "accepted",
  "disbursement_id": "uuid",
  "conversation_id": "AG_2025...123",
  "will_callback": true
}
```

**Response (immediate rejection)**

```json
{
  "status": "rejected",
  "error_code": "B2C_1001",
  "error_message": "Invalid MSISDN"
}
```

---

### 5.2 Safaricom → `/mpesa/b2c/result`

**Callback (success example)**

```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "ConversationID": "AG_2025...123",
    "OriginatorConversationID": "12345",
    "TransactionID": "LGXXXXXXX",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "TransactionAmount", "Value": 1200 },
        { "Key": "TransactionReceipt", "Value": "LGXXXXXXX" },
        { "Key": "ReceiverPartyPublicName", "Value": "2547XXXXXXXX" }
      ]
    }
  }
}
```

**Our handler must:**

* Update `disbursement_requests.status=success`.
* Store `transaction_receipt=LGXXXXXXX`.
* Notify USSD backend.

---

### 5.3 Our system → USSD (Webhook)

**Payload**

```json
{
  "disbursement_id": "uuid",
  "conversation_id": "AG_2025...123",
  "result_code": 0,
  "result_desc": "The service request is processed successfully.",
  "transaction_receipt": "LGXXXXXXX",
  "amount": 1200,
  "msisdn": "2547XXXXXXXX",
  "processed_at": "2025-09-10T12:34:56Z"
}
```

---

## 6. Workflow

1. **USSD sends request** → `/disburse` with `x-api-key`.
2. **Edge Function**:

   * Validates partner key.
   * Creates DB row with status=queued.
   * Calls Safaricom B2C.
   * Responds to USSD with `accepted` + `conversation_id`.
3. **Safaricom callback** → `/mpesa/b2c/result`.
4. **Edge Function**:

   * Marks request as `success` or `failed`.
   * Stores `transaction_receipt` if success.
   * Calls USSD webhook with final result.
5. **USSD backend**:

   * On success: sends SMS + creates loan in LoanSpur with `transaction_receipt`.
   * On failure: informs customer, does not create loan.

---

## 7. Security

* **Secrets**: stored in Supabase Vault/Edge Function secrets.
* **Partner keys**: hashed with SHA-256; plaintext only shown once on creation.
* **Auth**: USSD → `x-api-key`, UI → Supabase Auth (admin role).
* **Idempotency**: enforced by `client_request_id`.
* **Transport**: HTTPS only.

---

## 8. Edge Cases

* Safaricom rejects immediately → return `status=rejected`.
* Safaricom accepts but fails later → `status=failed` on callback.
* Callback not delivered → retry webhook + allow USSD to poll `/status`.
* Duplicate request → return existing `disbursement_id` without double payout.

---

## 9. Deliverables

* Supabase SQL migrations: `partners`, `disbursement_requests`, `disbursement_callbacks`.
* Edge Functions: `/disburse`, `/partners-create`, `/mpesa/b2c/result`, `/mpesa/b2c/timeout`.
* Next.js admin UI: trigger disbursements manually, view logs, manage partner keys.
* Slack notifications (optional).
* API documentation in Swagger/OpenAPI format (generated in Cursor).


