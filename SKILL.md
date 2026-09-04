---
name: fikashop-payments-skills
description: Integrate fikashop for payments (wallet top-up, invoice pay), subscriptions (plans, subscribe, features, dunning recovery, change/cancel), and webhook handling. Use for checkout, input_fields, X-Partner-Id, subscriptions, feature billing, or webhook setup.
---

# Fikashop Payments Integration

**Read first:** [REFERENCE.md](contracts/REFERENCE.md) (endpoints, response formats, webhooks) · [SUBSCRIPTIONS.md](contracts/SUBSCRIPTIONS.md) (subscriptions) · [fixtures/](contracts/fixtures/) ([index](contracts/fixtures/README.md))

## Overview

Fikashop provides payment processing, wallet management, and subscription billing. You integrate by calling our REST API from your app (client) and your server.

**You need two things to start:**
1. An OIDC access token from `https://oidc.fikachu.com` (end-user token for client calls)
2. A partner code — from `GET /shop/api/admin/partners/` or your host profile

## Which flow?

| Goal | Flow | Key endpoints |
| ---- | ---- | ------------- |
| Top up partner wallet | **Checkout A** | `GET …/balance/` → `POST …/wallet-deposit/` |
| Pay a shared invoice | **Checkout B** | `GET …/public/{uuid}/` → `POST …/pay/` → `POST /payments/process/{ref}/` |
| Subscribe / manage plans | **Subscriptions** | `GET …/plans/`, `POST …/`, features, `change-plan/`, `cancel/` |
| Confirm async payment | **Webhooks** | Register `POST /shop/api/admin/webhooks/endpoints/`; verify `Fikashop-Signature` |

### Tokens

| Context | Token | Use |
|---------|-------|-----|
| **Client** (React, RN, web) | User OIDC `access_token` from `https://oidc.fikachu.com` | Wallet, invoice pay, subscribe, feature bill |
| **Server** (backend jobs) | `FIKASHOP_ADMIN_ACCESS_TOKEN` from dashboard **Settings → API keys** | Register webhook endpoints, admin partner APIs |

**Never** ship the admin token in client bundles (`EXPO_PUBLIC_*`, mobile storage).

### Partner (`X-Partner-Id`)

```http
GET /shop/api/admin/partners/
Authorization: Bearer {access_token}
```

Returns businesses for the signed-in user. Use each row's **`code`** or **`id`** as `X-Partner-Id`. Then:

```ts
client.configurePartner('https://api.fikashop.app', partnerCode);
```

Do not call wallet, invoice, or subscription APIs until `X-Partner-Id` is set.

## Client essentials

**Methods** — always from API, never hardcoded:
- Top-up: `GET …/subscriptions/balance/` → exclude `wallet` method
- Invoice: `GET …/public/{uuid}/` → respect `public_pay_blocked`

**input_fields** — from selected method only:
- Submit keyed by `field.code` (not `label`/`name`)
- `text` → string; `checkbox`/`boolean` → boolean
- Reset form when method changes
- Invoice pay: submit `input_fields` on **capture** (`POST /payments/process/{ref}/`), not on `/pay/`

**Checkout A (top-up):** balance → `POST …/wallet-deposit/` with `variant` + `input_fields`

**Checkout B (invoice):** public GET → `POST …/pay/` → `payment_reference` → `POST …/payments/process/{ref}/` with `action: capture`
- `/payments/` is **root-mounted** — do not prefix with `/shop/api/`
- Pay response includes `process_url` as well as `payment_reference`

### Response envelope

All payment responses (top-up, capture, wallet deposit) return the same shape:

```json
{
  "status": "<semantic>",
  "detail": "<human-readable>",
  "meta": { ... }
}
```

| `status` value | Meaning | Next action |
|----------------|---------|-------------|
| `"success"` | Synchronous confirm (e.g. LIPA Pay emulator) | Done — poll invoice or balance |
| `"waiting"` | Async provider accepted (STK push sent) | Wait for webhook or poll |
| `"redirect"` | User must visit `redirect_url` | Open URL in browser |
| `"error"` | Validation or provider error | Show `detail` to user |

Error responses add a `code` field (HTTP status) and omit `meta`:

```json
{ "status": "error", "code": 400, "detail": "Missing billing_phone for PayInTZ collection" }
```

Do not confuse `status` (semantic outcome) with the raw django-payments status in webhooks (`confirmed`, `error`, etc.). Canonical status mapping: [status-map.json](contracts/status-map.json)

## Subscriptions

Full detail: [SUBSCRIPTIONS.md](contracts/SUBSCRIPTIONS.md) — endpoints, fixtures, recovery, feature API, errors.

Base path: `/subscriptions/api/subscriptions/`.

### Dashboard + catalog

1. `GET …/subscriptions/` — paginated subscriptions + wallet `balance` (`?page=`/`?size=`, `?tags=` AND, `?point=`); filter on `active`, `cancelled`, `unpaid_invoices`
2. `GET …/plans/` — read-only catalog; `?tags=` (AND), `?point=lng,lat` (geofence), `?includes=subscribed_plan_cost_id`; subscribe with `costs[].slug`
3. `GET …/plans/{plan_id}/` — single plan (same scope rules)
4. `GET …/usage-by-plan/{plan_id}/` or `…/usage-by-id/{subscription_id}/` — subscription + `feature_usage`
5. `GET …/plan-options/?for_subscription={uuid}` — same-plan billing options for change-plan UI

### Subscribe

`POST …/` with `{ "plan_cost_slug": "pro-monthly" }` — immediate wallet charge.

**Billing vs subscribed partner:** wallet debits use `X-Partner-Id` / `?partner=` (stored in `meta.partner_id`). Shop-specific entitlements use optional body `subscribed_partner` (returned as `subscribed_partner_id` / `subscribed_partner_code`).

| Result | Meaning | Next step |
|--------|---------|-----------|
| `201`, `active: true` | Funded | Gate features |
| `201`, `active: false`, `unpaid_invoices[]` | Underfunded / dunning | Path A (top-up) or Path B (pay invoice uuid) — see SUBSCRIPTIONS.md recovery |

### Feature gate → bill

1. `GET …/features/{code}/access/` — read `allowed` before each gated action
2. If allowed, perform action, then `POST …/features/{code}/bill/` with `{ "quantity": 1 }`
3. Pass `?subscription_id=` when user has multiple active subscriptions; `?subscribed_partner=` when entitlements are shop-specific; `?point=` to require a covering plan fence
4. Handle `402` (insufficient wallet → top up), `429` (quota exceeded, no overage)
5. Pass **`Idempotency-Key`** on bill for safe retries (24h cache)

### Change / cancel / history

- Change: `POST …/change-plan/` — `immediate` (prorate credit + charge new + restart dates; `402` if underfunded) or `next_cycle` (schedule `pending_plan_cost_*` until renewal)
- Cancel: `POST …/cancel/` with `subscription_id`
- History: `GET …/transactions/?page=&size=`

### Recovery (underfunded / failed renewal)

- **Path A:** `wallet-deposit` → wait for `wallet.deposit_succeeded` or poll balance → system retries billing ~1 min
- **Path B:** pay `unpaid_invoices[].uuid` via Checkout B → `invoice.payment_succeeded` restores subscription **without second wallet debit**
- Watch `billing_retry_exhausted: true` — auto-billing paused until payment succeeds

If `status` is `'redirect'` on deposit, open `redirect_url`. If `'waiting'`, wait for webhook (STK push or async PSP). If `'success'`, payment confirmed synchronously.

## Webhooks (server)

Mobile clients **never** receive webhooks. Your server registers an endpoint, then fikashop delivers event envelopes to it as `POST` requests.

### 1. Register your endpoint

Requires the **server admin token** (`FIKASHOP_ADMIN_ACCESS_TOKEN`). Send your receiver URL and a secret — fikashop signs every delivery with that secret:

```http
POST /shop/api/admin/webhooks/endpoints/
Authorization: Bearer {admin_token}
X-Partner-Id: {partner_code}
Content-Type: application/json

{
  "url": "https://your-app.example/webhooks/fikashop",
  "secret": "whsec_your_shared_secret",
  "enabled": true,
  "is_default": true,
  "subscribed_events": []
}
```

- `subscribed_events: []` (empty) = receive **all** event types. To limit, list event names (e.g. `["payment.succeeded", "subscription.updated"]`).
- `secret` is **write-only** — never returned in responses; keep it server-side.
- Returns `201` with the created endpoint (`id`, `uuid`, `url`, `enabled`, `is_default`, `subscribed_events`, `created_at`).

Ready-to-run: [server-webhook-setup.ts](docs/examples/server-webhook-setup.ts) (TS) · [server-webhook-setup.py](docs/examples/server-webhook-setup.py) (Python)

### 2. Receive and verify events

- **`Fikashop-Signature`** = HMAC-SHA256 over `{timestamp}.{raw_body}`
- Verify **raw request bytes** — do not re-serialize JSON
- Dedupe on envelope **`id`** (stable event id)
- Route with `createWebhookRouter` / `processUnifiedWebhook` (TS) or `create_webhook_router` / `process_unified_webhook` (Python)

Acknowledge promptly with `200`; fikashop retries failed deliveries.

### 3. Handle event types

| Type | When |
|------|------|
| `payment.created` | Gateway payment session opened |
| `payment.processing` | Payment waiting / in flight |
| `payment.succeeded` | Gateway payment confirmed |
| `payment.failed` / `payment.cancelled` | Payment error or cancelled |
| `payment.refunded` | Refund posted |
| `invoice.payment_succeeded` | Invoice paid or partially paid |
| `wallet.deposit_succeeded` | Wallet top-up credited |
| `subscription.created` | User subscribed via API |
| `subscription.updated` | Activation, renewal, dunning recovery, billing state |
| `subscription.cancelled` | Subscription cancelled |
| `subscription.past_due` | Dunning invoice or failed renewal |

Full flow (register → receive → handle): [server-webhook-setup.ts](docs/examples/server-webhook-setup.ts) (register, TS) · [server-webhook-setup.py](docs/examples/server-webhook-setup.py) (register, Python) · [express_webhook.ts](docs/examples/express_webhook.ts) (receive) · [webhook-host-handler.ts](docs/examples/webhook-host-handler.ts) (process) · [fastapi_webhook.py](docs/examples/fastapi_webhook.py) (receive, Python) · [django_reference.md](docs/examples/django_reference.md) (receive, Django)

## SDK

| Layer | Key symbols (`packages/ts` unless noted) |
| ----- | ---------------------------------------- |
| Client setup | `createFikashopClient`, `configurePartner`, `listUserPartners`, `parsePartnerList` |
| Methods | `getDepositPaymentMethods`, `getInputFieldsForMethod`, `validateFieldValues`, `defaultFieldValues` |
| Checkout A | `walletDeposit` (`idempotencyKey`), `buildDepositPayload` |
| Checkout B | `getPublicInvoice`, `initiatePublicPay`, `capturePayment`, `buildCapturePayload`, `waitForInvoicePaid` |
| Subscriptions | `listSubscriptions`, `getSubscriptionPlans` / `getSubscriptionPlan` (`tags`, `point`, `includes`), `getUsageByPlan` / `getUsageById`, `subscribeToPlan` (`subscribedPartner`, `clientReference`, `metadata`, `idempotencyKey`), `changePlan`, `cancelSubscription`, `getPlanOptions`, `getSubscriptionTransactions` |
| Admin catalog (server) | `createAdminSubscriptionPlan`, `updateAdminSubscriptionPlan`, `deleteAdminSubscriptionPlan`, `createAdminPlanCost`, `updateAdminPlanCost`, `deleteAdminPlanCost`, `createAdminPlanFeature`, `updateAdminPlanFeature`, `deleteAdminPlanFeature` — [ADMIN-SUBSCRIPTIONS.md](contracts/ADMIN-SUBSCRIPTIONS.md) |
| Recovery polls | `pollSubscriptionActive`, `waitForWalletCredit` |
| Features | `checkFeatureAccess`, `billFeatureUsage` (`idempotencyKey`, `subscriptionId`, `subscribedPartner`) |
| Errors | `formatWalletFailure`, `formatSubscriptionFailure`, `formatGatewayFailure`, `describeGatewayFailure` |
| Webhooks | `verifyUnifiedFikashopSignature`, `parseUnifiedWebhookEnvelope`, `processUnifiedWebhook`, `createWebhookRouter`, `InMemoryUnifiedWebhookHandler` (TS); `process_unified_webhook`, `create_webhook_router` (Python) |

Runbooks: [PRODUCTION.md](contracts/PRODUCTION.md) · Stripe mapping: [STRIPE-MIGRATION.md](contracts/STRIPE-MIGRATION.md)

Examples: [checkout-invoice.ts](docs/examples/checkout-invoice.ts) · [subscribe-and-topup.ts](docs/examples/subscribe-and-topup.ts) · [plans-by-tag.ts](docs/examples/plans-by-tag.ts) · [admin-subscription-catalog.ts](docs/examples/admin-subscription-catalog.ts) · [feature-gating-and-bill.ts](docs/examples/feature-gating-and-bill.ts) · [dunning-recovery.ts](docs/examples/dunning-recovery.ts) · [express_webhook.ts](docs/examples/express_webhook.ts)

## Pitfalls

Wrong submit keys · JSON re-serialize before HMAC · webhooks on mobile · missing invoice correlation · `/shop/api` prefix on `/payments/process/` · subscribing before wallet has funds · ignoring `public_pay_blocked` · **`402` on feature bill** · omitting `subscription_id` for multi-sub users · omitting `subscribed_partner` on feature access/bill when entitlements are shop-specific · expecting bill idempotency without **`Idempotency-Key`** · paying dunning invoice then expecting a second wallet debit on restore · admin token in client bundles · confusing `status: "success"` (sync confirm) with `status: "waiting"` (async — wait for webhook) with raw webhook `confirmed` status
