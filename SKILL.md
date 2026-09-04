---
name: fikashop-payments-skills
description: Integrate fikashop-api for payments (wallet top-up, invoice pay), subscriptions (plans, subscribe, features, dunning recovery, change/cancel), and host webhooks. Use for fikashop checkout, input_fields, X-Partner-Id, subscriptions, feature billing, or webhook setup.
---

# Fikashop Payments Skills

**Read first:** [contracts/SUBSCRIPTIONS.md](contracts/SUBSCRIPTIONS.md) (subscriptions) · [contracts/REFERENCE.md](contracts/REFERENCE.md) (payments + webhooks) · Fixtures: [contracts/fixtures](contracts/fixtures) ([index](contracts/fixtures/README.md))

## Which flow?

| Goal | Flow | Key endpoints |
| ---- | ---- | ------------- |
| Top up partner wallet | **Checkout A** | `GET …/balance/` → `POST …/wallet-deposit/` |
| Pay a shared invoice | **Checkout B** | `GET …/public/{uuid}/` → `POST …/pay/` → `POST /payments/process/{ref}/` |
| Subscribe / manage plans | **Subscriptions C** | `GET …/plans/`, `POST …/`, features, `change-plan/`, `cancel/` |
| Confirm async payment | **Webhooks** | Register `POST /shop/api/admin/webhooks/endpoints/`; verify `Fikashop-Signature` |
| Manage plan catalog (server) | **Admin catalog** | `POST /shop/api/admin/subscription-plans/` — [ADMIN-SUBSCRIPTIONS.md](contracts/ADMIN-SUBSCRIPTIONS.md) |

All client flows need **`Authorization: Bearer`** (end-user OIDC from `https://oidc.fikachu.com`) and **`X-Partner-Id`** before calling wallet, invoice, or subscription APIs.

### Server vs client tokens

| Context | Token | Example |
|---------|-------|---------|
| **Server** | `FIKASHOP_ADMIN_ACCESS_TOKEN` (dashboard **Settings → API keys**) | Webhooks — [server-webhook-setup.ts](docs/examples/server-webhook-setup.ts); catalog — [admin-subscription-catalog.ts](docs/examples/admin-subscription-catalog.ts) |
| **Client** (React/RN) | User OIDC `access_token` only | [subscribe-and-topup.ts](docs/examples/subscribe-and-topup.ts), [checkout-invoice.ts](docs/examples/checkout-invoice.ts) |

Never ship the admin token in client bundles (`EXPO_PUBLIC_*`, mobile storage). See [contracts/PRODUCTION.md](contracts/PRODUCTION.md).

## Roles

| Who          | Does what                                                           |
| ------------ | ------------------------------------------------------------------- |
| Host API     | OIDC, `X-Partner-Id` / `billing_partner_base_url`, webhook endpoint |
| Client       | `Bearer` + `X-Partner-Id` → fikashop checkout & subscription APIs   |
| fikashop-api | Methods, wallets, capture, subscriptions, outbound webhooks         |

Client initiates; host webhook confirms (especially after `redirect` payments).

## Client essentials

**Auth:** fikashop uses **`https://oidc.fikachu.com`**. Apps already on that IdP reuse the **same end-user access token** on fikashop-api.

| Context | Token |
|---------|-------|
| Client (RN/web checkout) | User OIDC `access_token` |
| Server (webhooks admin) | `FIKASHOP_ADMIN_ACCESS_TOKEN` from dashboard API keys — env only |

**Pitfall:** never use the admin token in React Native / Expo client code.

**Partner (`X-Partner-Id`):**

- `GET /shop/api/admin/partners/` — list businesses for the signed-in user; use `code` or `id` from `results[]`
- Or host profile: `X-Partner-Id` + `billing_partner_base_url`

Then `client.configurePartner(baseUrl, partnerId)` before wallet/invoice/subscription calls.

**Methods** — from API, never hardcoded:

- Top-up: `GET …/subscriptions/balance/` → exclude `wallet` method
- Invoice: `GET …/public/{uuid}/` → honor `public_pay_blocked`

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

## Subscriptions C

Full detail: **[contracts/SUBSCRIPTIONS.md](contracts/SUBSCRIPTIONS.md)** — endpoints, fixtures, recovery, feature API, errors.

Base path: `/subscriptions/api/subscriptions/`.

### Dashboard + catalog

1. `GET …/subscriptions/` — paginated subscriptions + wallet `balance` (`?page=`/`?size=`, `?tags=` AND, `?point=`); filter on `active`, `cancelled`, `unpaid_invoices`
2. `GET …/plans/` — read-only catalog; `?tags=` (AND), `?point=lng,lat` (geofence), `?includes=subscribed_plan_cost_id`; subscribe with `costs[].slug`
3. `GET …/plans/{plan_id}/` — single plan (same scope rules)
4. `GET …/usage-by-plan/{plan_id}/` or `…/usage-by-id/{subscription_id}/` — subscription + `feature_usage`
5. `GET …/plan-options/?for_subscription={uuid}` — same-plan billing options for change-plan UI

Fixtures: [subscriptions-list.json](contracts/fixtures/subscriptions-list.json), [subscription-plans.json](contracts/fixtures/subscription-plans.json)

### Subscribe

`POST …/` with `{ "plan_cost_slug": "pro-monthly" }` — immediate wallet charge via `PlanManager`.

**Billing vs subscribed partner:** wallet debits use `X-Partner-Id` / `?partner=` (stored in `meta.partner_id`). Shop-specific entitlements use optional body `subscribed_partner` (returned as `subscribed_partner_id` / `subscribed_partner_code`). See [SUBSCRIPTIONS.md § Subscribed vs billing](contracts/SUBSCRIPTIONS.md#subscribed-partner-vs-billing-partner).

| Result | Meaning | Next step |
|--------|---------|-----------|
| `201`, `active: true` | Funded | Gate features |
| `201`, `active: false`, `unpaid_invoices[]` | Underfunded / dunning | Path A (top-up) or Path B (pay invoice uuid) — see SUBSCRIPTIONS.md recovery |

Fixtures: [subscribe-response.json](contracts/fixtures/subscribe-response.json), [subscribe-response-inactive-dunning.json](contracts/fixtures/subscribe-response-inactive-dunning.json)

### Feature gate → bill

1. `GET …/features/{code}/access/` — read `allowed` before each gated action
2. If allowed, perform action, then `POST …/features/{code}/bill/` with `{ "quantity": 1 }`
3. Pass `?subscription_id=` when user has multiple active subscriptions; `?subscribed_partner=` when entitlements are shop-specific; `?point=` to require a covering plan fence
4. Handle `402` (insufficient wallet → Checkout A), `429` (quota exceeded, no overage)
5. Pass **`Idempotency-Key`** on bill for safe retries (24h cache)

Fixtures: [feature-access-allowed.json](contracts/fixtures/feature-access-allowed.json), [feature-bill-response.json](contracts/fixtures/feature-bill-response.json)

Optional: `checkFeatureAccess(client, code, { subscriptionId, subscribedPartner, point })` · `billFeatureUsage(client, code, { idempotencyKey, subscriptionId, subscribedPartner, point, quantity })`

### Change / cancel / history

- Change: `POST …/change-plan/` — `immediate` (prorate credit + charge new + restart dates; `402` if underfunded) or `next_cycle` (schedule `pending_plan_cost_*` until renewal)
- Cancel: `POST …/cancel/` with `subscription_id`
- History: `GET …/transactions/?page=&size=`

### Recovery (underfunded / failed renewal)

- **Path A:** `wallet-deposit` → wait for `wallet.deposit_succeeded` or poll balance → Celery retry ~1 min
- **Path B:** pay `unpaid_invoices[].uuid` via Checkout B → `invoice.payment_succeeded` restores subscription **without second wallet debit**
- Watch `billing_retry_exhausted: true` — auto-billing paused until payment succeeds

If `status` is `'redirect'` on deposit, open `redirect_url`. If `'waiting'`, wait for webhook (STK push or async PSP). If `'success'`, payment confirmed synchronously.

## Webhook essentials (server)

Register endpoints via **`POST /shop/api/admin/webhooks/endpoints/`** — see [REFERENCE.md §6](contracts/REFERENCE.md#6-webhooks-server).

- **`Fikashop-Signature`** = HMAC-SHA256 over `{timestamp}.{raw_body}`
- Dedupe on envelope **`id`** (stable event id)
- Route with **`createWebhookRouter`** / **`processUnifiedWebhook`** (TS) or **`create_webhook_router`** / **`process_unified_webhook`** (Python)
- Subscription types: `subscription.created`, `subscription.updated`, `subscription.cancelled`, `subscription.past_due`
- Payment recovery: `wallet.deposit_succeeded`, `invoice.payment_succeeded`, `payment.succeeded`, `payment.failed`, `payment.refunded`

Examples: [express_webhook.ts](docs/examples/express_webhook.ts) · [webhook-host-handler.ts](docs/examples/webhook-host-handler.ts) · [server-webhook-setup.ts](docs/examples/server-webhook-setup.ts) · [fastapi_webhook.py](docs/examples/fastapi_webhook.py)

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

Runbooks: [contracts/PRODUCTION.md](contracts/PRODUCTION.md) · Stripe mapping: [contracts/STRIPE-MIGRATION.md](contracts/STRIPE-MIGRATION.md)

Examples: [checkout-invoice.ts](docs/examples/checkout-invoice.ts) · [subscribe-and-topup.ts](docs/examples/subscribe-and-topup.ts) · [plans-by-tag.ts](docs/examples/plans-by-tag.ts) · [admin-subscription-catalog.ts](docs/examples/admin-subscription-catalog.ts) · [feature-gating-and-bill.ts](docs/examples/feature-gating-and-bill.ts) · [dunning-recovery.ts](docs/examples/dunning-recovery.ts) · [express_webhook.ts](docs/examples/express_webhook.ts)

## Pitfalls

Wrong submit keys · JSON re-serialize before HMAC · webhooks on mobile · missing invoice correlation · `/shop/api` prefix on `/payments/process/` · subscribing before wallet has funds · ignoring `public_pay_blocked` · **`402` on feature bill** · omitting `subscription_id` for multi-sub users · omitting `subscribed_partner` on feature access/bill when entitlements are shop-specific · expecting bill idempotency without **`Idempotency-Key`** · paying dunning invoice then expecting a second wallet debit on restore · admin token in client bundles · confusing `status: "success"` (sync confirm) with `status: "waiting"` (async — wait for webhook) with raw webhook `confirmed` status
