---
name: fikashop-payments-skills
description: Integrate fikashop-api for payments (wallet top-up, invoice pay), subscriptions (plans, subscribe, change/cancel), and host webhooks. Use for fikashop checkout, input_fields, X-Partner-Id, subscriptions, or webhook setup.
---

# Fikashop Payments Skills

**Read first:** [contracts/REFERENCE.md](contracts/REFERENCE.md) · Fixtures: [contracts/fixtures](contracts/fixtures) ([index](contracts/fixtures/README.md))

## Which flow?

| Goal | Flow | Key endpoints |
| ---- | ---- | ------------- |
| Top up partner wallet | **Checkout A** | `GET …/balance/` → `POST …/wallet-deposit/` |
| Pay a shared invoice | **Checkout B** | `GET …/public/{uuid}/` → `POST …/pay/` → `POST /payments/process/{ref}/` |
| Subscribe / manage plans | **Subscriptions C** | `GET …/plans/`, `POST …/` (subscribe), `POST …/change-plan/`, `POST …/cancel/` |
| Confirm async payment | **Webhooks** | Register `POST /shop/api/admin/webhooks/endpoints/`; verify `Fikashop-Signature` |

All client flows need **`Authorization: Bearer`** (from `https://oidc.fikachu.com`) and **`X-Partner-Id`** before calling wallet, invoice, or subscription APIs.

## Roles

| Who          | Does what                                                           |
| ------------ | ------------------------------------------------------------------- |
| Host API     | OIDC, `X-Partner-Id` / `billing_partner_base_url`, webhook endpoint |
| Client       | `Bearer` + `X-Partner-Id` → fikashop checkout & subscription APIs   |
| fikashop-api | Methods, wallets, capture, subscriptions, outbound webhooks         |

Client initiates; host webhook confirms (especially after `redirect` payments).

## Client essentials

**Auth:** fikashop uses **`https://oidc.fikachu.com`**. Apps already on that IdP reuse the **same Bearer token** on fikashop-api.

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

**Subscriptions C:**

1. Dashboard: `GET …/subscriptions/` (list + balance) + `GET …/plans/` (catalog)
2. Subscribe: `POST …/subscriptions/` with `{ "plan_cost_slug": "…" }` — charges partner wallet via `PlanManager`
3. Insufficient balance → Checkout A top-up, then retry subscribe
4. Change plan: `POST …/change-plan/` with `subscription_id`, `target_plan_cost_slug`, optional `effective_mode`
5. Cancel: `POST …/cancel/` with `subscription_id`
6. History: `GET …/transactions/` (paginated)

Base path: `/invoices/api/subscriptions/` (duplicate mount at `/subscriptions/api/subscriptions/`).

If `status === 'redirect'`, open `redirect_url`.

## Webhook essentials (server)

Register endpoints via **`POST /shop/api/admin/webhooks/endpoints/`** — see [fikashop-api docs/README-webhooks.md](../../fikashop-api/docs/README-webhooks.md).

- **`Fikashop-Signature`** = HMAC-SHA256 over `{timestamp}.{raw_body}` (preferred)
- Legacy **`X-Fikachu-Signature`** still sent during migration (body-only)
- Dedupe on envelope **`id`** (stable event id)
- Key types: `payment.succeeded`, `payment.failed`, `invoice.payment_succeeded`, `invoice.settlement_posted`, `wallet.deposit_succeeded`

## SDK

| Layer | Key symbols (`packages/ts` unless noted) |
| ----- | ---------------------------------------- |
| Client setup | `createFikashopClient`, `configurePartner`, `listUserPartners`, `parsePartnerList` |
| Methods | `getDepositPaymentMethods`, `getInputFieldsForMethod`, `validateFieldValues`, `defaultFieldValues` |
| Checkout A | `walletDeposit`, `buildDepositPayload` |
| Checkout B | `getPublicInvoice`, `initiatePublicPay`, `capturePayment`, `buildCapturePayload` |
| Subscriptions | `listSubscriptions`, `getSubscriptionPlans`, `subscribeToPlan`, `changePlan`, `cancelSubscription`, `getSubscriptionTransactions` |
| Webhooks | `verifyUnifiedFikashopSignature`, `parseUnifiedWebhookEnvelope`, `normalizeWebhookStatus` (TS); `process_unified_webhook`, `process_payment_webhook` (Python) |

Examples: [docs/examples/checkout-invoice.ts](docs/examples/checkout-invoice.ts) · [docs/examples/subscribe-and-topup.ts](docs/examples/subscribe-and-topup.ts)

## Pitfalls

Wrong submit keys · JSON re-serialize before HMAC · webhooks on mobile · missing invoice correlation · `/shop/api` prefix on `/payments/process/` · subscribing before wallet has funds · ignoring `public_pay_blocked`
