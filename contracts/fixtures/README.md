# Fixtures index

Example payloads aligned with [fikashop-api](https://github.com/pgiki/fikashop) serializers and provider responses. Use these when building UI or validating SDK helpers — field names and shapes match production API contracts.

**Related:** [REFERENCE.md](../REFERENCE.md) · [SUBSCRIPTIONS.md](../SUBSCRIPTIONS.md) · [ADMIN-SUBSCRIPTIONS.md](../ADMIN-SUBSCRIPTIONS.md) · [status-map.json](../status-map.json)

## Client setup

| File | Endpoint | Notes |
|------|----------|-------|
| [partners-list.json](partners-list.json) | `GET /shop/api/admin/partners/` | Paginated admin partners; use `code` or `id` for `X-Partner-Id`. Includes `url`, `wallet_id` (UUID), `business_type` + nested `storefront`. |

## Payment methods & balance

| File | Endpoint | Notes |
|------|----------|-------|
| [balance-with-methods.json](balance-with-methods.json) | `GET /subscriptions/api/subscriptions/balance/` | `wallet_id`, `balance` (4 dp), deposit-eligible methods. Synthetic `wallet` entry includes `meta.balance`, `meta.wallet_id`, `meta.partner`. |
| [subscription-payment-methods.json](subscription-payment-methods.json) | `GET /subscriptions/api/subscriptions/payment-methods/` | Deposit methods with `?exclude_codes=`; no synthetic wallet row. |

## Subscriptions — list, catalog, subscribe

| File | Endpoint | Notes |
|------|----------|-------|
| [subscriptions-list.json](subscriptions-list.json) | `GET /subscriptions/api/subscriptions/` | `balance` + `subscriptions[]` with `meta`, `feature_usage[]`, billing dates, `links`. Optional `?point=` geo filter. |
| [subscription-plans.json](subscription-plans.json) | `GET /subscriptions/api/subscriptions/plans/` | Plan catalog; `tags[]`; `partner_*`; `service_area`; `costs[]`; `features[]` (+ `meta`). |
| [subscription-plan-detail.json](subscription-plan-detail.json) | `GET …/plans/{plan_id}/` | Single plan (same shape as catalog row). |
| [subscription-plans-with-subscribed-cost.json](subscription-plans-with-subscribed-cost.json) | `GET …/plans/?includes=subscribed_plan_cost_id` | Catalog with opt-in `subscribed_plan_cost_id` (UUID or null). |
| [subscription-plans-filtered-by-tag.json](subscription-plans-filtered-by-tag.json) | `GET /subscriptions/api/subscriptions/plans/?tags=enterprise` | Subset when filtering by tag (AND). |
| [usage-by-plan-response.json](usage-by-plan-response.json) | `GET …/usage-by-plan/{plan_id}/` | `UserSubscription` + `feature_usage[]` (also usage-by-id). |
| [point-invalid-400.json](point-invalid-400.json) | `GET …/plans/?point=bad` (400) | Malformed `?point=` query. |
| [subscribe-response.json](subscribe-response.json) | `POST /subscriptions/api/subscriptions/` (201) | Activated subscription after successful wallet charge. |
| [subscribe-response-inactive-dunning.json](subscribe-response-inactive-dunning.json) | `POST /subscriptions/api/subscriptions/` (201) | Underfunded subscribe: `active: false`, `unpaid_invoices[]`. |
| [subscribe-error-unknown-slug.json](subscribe-error-unknown-slug.json) | `POST /subscriptions/api/subscriptions/` (400) | Unknown `plan_cost_slug` without bootstrap `plan` block. |

## Subscriptions — admin catalog (server)

Staff token + `X-Partner-Id`. See [ADMIN-SUBSCRIPTIONS.md](../ADMIN-SUBSCRIPTIONS.md).

| File | Endpoint | Notes |
|------|----------|-------|
| [admin-plan-create-full-request.json](admin-plan-create-full-request.json) | `POST /shop/api/admin/subscription-plans/` | Nested `costs[]`, `features[]`, `pricing_tiers[]`. |
| [admin-plan-create-full-response.json](admin-plan-create-full-response.json) | `POST …/subscription-plans/` (201) | Full plan with `partner_id`, nested rows. |
| [admin-plan-create-request.json](admin-plan-create-request.json) | `POST …/subscription-plans/` | Minimal create with tags only. |
| [admin-plan-patch-request.json](admin-plan-patch-request.json) | `PATCH …/subscription-plans/{id}/` | Upsert cost price + feature quota. |
| [admin-plan-cost-create-request.json](admin-plan-cost-create-request.json) | `POST …/subscription-plans/{id}/costs/` | Incremental cost add. |
| [admin-plan-feature-create-request.json](admin-plan-feature-create-request.json) | `POST …/subscription-plans/{id}/features/` | Incremental feature add. |
| [admin-plan-delete-blocked-409.json](admin-plan-delete-blocked-409.json) | `DELETE …/plan-costs/{id}/` (409) | Cost referenced by subscriptions. |

## Subscriptions — change plan, cancel, options

| File | Endpoint | Notes |
|------|----------|-------|
| [plan-options-all.json](plan-options-all.json) | `GET /subscriptions/api/subscriptions/plan-options/` | All plan costs across catalog. |
| [plan-options-for-subscription.json](plan-options-for-subscription.json) | `GET …/plan-options/?for_subscription=` | Same-plan alternate costs (excludes current). |
| [change-plan-request.json](change-plan-request.json) | POST body | `subscription_id`, `target_plan_cost_slug`, `effective_mode`. |
| [change-plan-response.json](change-plan-response.json) | `POST …/change-plan/` (200) | Updated subscription after immediate change. |
| [change-plan-error-next-cycle.json](change-plan-error-next-cycle.json) | `POST …/change-plan/` (400) | `effective_mode=next_cycle` not supported. |
| [cancel-request.json](cancel-request.json) | POST body | `{ "subscription_id": "uuid" }`. |
| [cancel-response.json](cancel-response.json) | `POST …/cancel/` (200) | `cancelled: true`, `active: false`. |

## Subscriptions — feature access & bill

| File | Endpoint | Notes |
|------|----------|-------|
| [feature-access-allowed.json](feature-access-allowed.json) | `GET …/features/{code}/access/` (200) | Quota feature allowed with `used` / `remaining`. |
| [feature-access-quota-exhausted.json](feature-access-quota-exhausted.json) | `GET …/access/` (200) | `allowed: false`, quota exhausted. |
| [feature-access-not-on-plan.json](feature-access-not-on-plan.json) | `GET …/access/` (200) | Feature not on current plan. |
| [feature-access-no-subscription.json](feature-access-no-subscription.json) | `GET …/access/` (403) | No active subscription. |
| [feature-bill-response.json](feature-bill-response.json) | `POST …/features/{code}/bill/` (200) | Within quota — no wallet charge (`amount_charged: 0`). |
| [feature-bill-overage-charged.json](feature-bill-overage-charged.json) | `POST …/bill/` (200) | Overage unit debited from wallet. |
| [feature-bill-insufficient-wallet.json](feature-bill-insufficient-wallet.json) | `POST …/bill/` (402) | Wallet debit failed. |
| [feature-bill-quota-exceeded.json](feature-bill-quota-exceeded.json) | `POST …/bill/` (429) | Quota exceeded, no overage configured. |

## Subscriptions — transactions

| File | Endpoint | Notes |
|------|----------|-------|
| [subscription-transactions-page1.json](subscription-transactions-page1.json) | `GET /subscriptions/api/subscriptions/transactions/` | Paginated `results[]`; `transaction_type` deposit / subscription. |

## Checkout A — wallet top-up

| File | Direction | Notes |
|------|-----------|-------|
| [wallet-deposit-request.json](wallet-deposit-request.json) | POST body | M-Pesa top-up with `variant` + `input_fields.billing_phone`. |
| [wallet-deposit-request-tigo.json](wallet-deposit-request-tigo.json) | POST body | Tigo Pesa variant. |
| [wallet-deposit-confirmed.json](wallet-deposit-confirmed.json) | POST response | Synchronous confirm: `status: confirmed`. |
| [wallet-deposit-redirect.json](wallet-deposit-redirect.json) | POST response | Card / hosted checkout redirect; `meta.intent: wallet-deposit`. |

## Checkout B — public invoice pay

| File | Direction | Notes |
|------|-----------|-------|
| [public-invoice-with-methods.json](public-invoice-with-methods.json) | GET response | Full invoice detail; use dunning `uuid` from subscribe inactive fixture. |
| [public-invoice-blocked.json](public-invoice-blocked.json) | GET response | Withdrawal-request invoice: `public_pay_blocked: true`. |
| [public-pay-init.json](public-pay-init.json) | POST response (201) | `payment_reference`, `process_url`, `amount`, `currency`. |
| [capture-request.json](capture-request.json) | POST body | Generic capture with text + checkbox `input_fields`. |
| [capture-request-payintz.json](capture-request-payintz.json) | POST body | PayInTZ capture with optional `operator` field. |
| [capture-success.json](capture-success.json) | POST response | STK push initiated: `status: success`. |
| [capture-redirect.json](capture-redirect.json) | POST response | Card redirect from `/payments/process/{ref}/`. |
| [capture-error.json](capture-error.json) | POST response | Validation error when required `input_fields` missing. |

## Host webhooks

| File | Direction | Notes |
|------|-----------|-------|
| [webhook-payment-paid.json](webhook-payment-paid.json) | Inbound POST | Legacy flat payload; correlate via `invoice_id`. |
| [webhook-payment-pending.json](webhook-payment-pending.json) | Inbound POST | Async payment still processing. |
| [webhook-payment-failed.json](webhook-payment-failed.json) | Inbound POST | Failed / declined payment. |
| [webhook-event-envelope.json](webhook-event-envelope.json) | Inbound POST (unified) | Stripe-style envelope; verify `Fikashop-Signature`. |
| [webhook-wallet-deposit-succeeded.json](webhook-wallet-deposit-succeeded.json) | Inbound POST (unified) | `wallet.deposit_succeeded` — subscription recovery Path A. |
| [webhook-subscription-created.json](webhook-subscription-created.json) | Inbound POST (unified) | `subscription.created` after subscribe. |
| [webhook-subscription-updated.json](webhook-subscription-updated.json) | Inbound POST (unified) | Activation, renewal, dunning recovery. |
| [webhook-subscription-cancelled.json](webhook-subscription-cancelled.json) | Inbound POST (unified) | User/system cancel. |
| [webhook-subscription-past-due.json](webhook-subscription-past-due.json) | Inbound POST (unified) | Dunning invoice / failed renewal. |
| [webhook-payment-succeeded.json](webhook-payment-succeeded.json) | Inbound POST (unified) | Gateway payment confirmed. |
| [webhook-payment-failed.json](webhook-payment-failed.json) | Inbound POST (unified) | Gateway payment error. |
| [webhook-payment-refunded.json](webhook-payment-refunded.json) | Inbound POST (unified) | Refund posted. |
| [webhook-invoice-payment-succeeded-dunning.json](webhook-invoice-payment-succeeded-dunning.json) | Inbound POST (unified) | Dunning invoice paid → subscription recovery Path B. |
| [webhook-signed-request.txt](webhook-signed-request.txt) | HMAC example | Compact JSON body + Python one-liner for signature verification. |

## Cross-fixture identifiers

These IDs tie examples together across flows:

| Field | Value | Used in |
|-------|-------|---------|
| User subscription UUID | `f47ac10b-58cc-4372-a567-0e02b2c3d479` | list, subscribe, change/cancel, feature access/bill |
| Underfunded subscription UUID | `c3d4e5f6-a7b8-9012-cdef-123456789012` | subscribe inactive dunning |
| Plan cost slug | `pro-monthly` | subscribe, list, plans |
| Plan cost slug (yearly) | `pro-yearly` | change-plan, plan-options |
| Dunning invoice UUID | `d4e5f6a7-b8c9-0123-def0-234567890123` | subscribe inactive → public invoice pay |
| Public invoice UUID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | public invoice, pay init, capture |
| External invoice ref | `ext-inv-rider-8842` | public invoice GET, webhooks |
| Partner code | `acme-mobility` | partners list, subscription `meta`, balance `meta.partner: 42` |
| Partner id | `42` | subscription `meta.partner_id` |
| Wallet UUID | `7c9e6679-7425-40de-944b-e07fc1f90ae7` | balance, partners list, webhook deposit |
| Feature codes | `sms_outbound`, `partner_site_ai_credits` | plans, access, bill fixtures |

## API sources (fikashop-api)

- `CheckoutAvailablePaymentMethodSerializer` — `shop/oscarapi/serializers/payment.py`
- `SubscriptionBalanceResponseSerializer` — `subscriptions/api/serializers/subscription.py`
- `UserSubscriptionSerializer` / plan serializers — `subscriptions/api/serializers/`
- `PublicInvoiceDetailResponseSerializer` — `invoices/serializers.py`
- Payment methods helper — `subscriptions/api/payment_methods.py`
- Synthetic wallet method — balance endpoint in `subscriptions/api/views/viewset.py`
