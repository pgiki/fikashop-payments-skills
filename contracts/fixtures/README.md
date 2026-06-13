# Fixtures index

Example payloads aligned with [fikashop-api](https://github.com/fikachu/fikashop) serializers and provider responses. Use these when building UI or validating SDK helpers — field names and shapes match production API contracts.

**Related:** [REFERENCE.md](../REFERENCE.md) · [status-map.json](../status-map.json)

## Client setup

| File | Endpoint | Notes |
|------|----------|-------|
| [partners-list.json](partners-list.json) | `GET /shop/api/admin/partners/` | Paginated admin partners; use `code` or `id` for `X-Partner-Id`. Includes `url`, `wallet_id` (UUID), `business_type_kind`. |

## Payment methods & balance

| File | Endpoint | Notes |
|------|----------|-------|
| [balance-with-methods.json](balance-with-methods.json) | `GET /invoices/api/subscriptions/balance/` | `wallet_id`, `balance` (4 dp), deposit-eligible methods. Synthetic `wallet` entry includes `meta.balance`, `meta.wallet_id`, `meta.partner`. Methods use `CheckoutAvailablePaymentMethod` shape: `method_type`, `image_url`, `input_fields[]` with `code`, `is_required`, `schema`. |

## Subscriptions

| File | Endpoint | Notes |
|------|----------|-------|
| [subscriptions-list.json](subscriptions-list.json) | `GET /invoices/api/subscriptions/` | `balance` + `subscriptions[]` with nested plan cost. |
| [subscription-plans.json](subscription-plans.json) | `GET /invoices/api/subscriptions/plans/` | Plan catalog; each plan has `costs[]` with `slug` for subscribe. |
| [subscribe-response.json](subscribe-response.json) | `POST /invoices/api/subscriptions/` (201) | Activated `UserSubscription` after successful subscribe. |

## Checkout A — wallet top-up

| File | Direction | Notes |
|------|-----------|-------|
| [wallet-deposit-request.json](wallet-deposit-request.json) | POST body | M-Pesa top-up with `variant` + `input_fields.billing_phone`. |
| [wallet-deposit-request-tigo.json](wallet-deposit-request-tigo.json) | POST body | Tigo Pesa variant (from `subscriptions/tests/test_wallet_recharge.py`). |
| [wallet-deposit-confirmed.json](wallet-deposit-confirmed.json) | POST response | Synchronous confirm (emulator / cash test mode): `status: confirmed`. |
| [wallet-deposit-redirect.json](wallet-deposit-redirect.json) | POST response | Card / hosted checkout redirect; includes `detail` and `meta.intent`. |

## Checkout B — public invoice pay

| File | Direction | Notes |
|------|-----------|-------|
| [public-invoice-with-methods.json](public-invoice-with-methods.json) | GET response | Full invoice detail: line items, totals, `external_invoice_reference` (host correlation id), `payment_terms`, `supports_online_payment`. |
| [public-invoice-blocked.json](public-invoice-blocked.json) | GET response | Withdrawal-request invoice: `public_pay_blocked: true`, empty `payment_methods`. |
| [public-pay-init.json](public-pay-init.json) | POST response (201) | All fields from `PublicInvoicePayResponseSerializer`: `payment_reference`, `process_url`, `payment_method_code`, `invoice_uuid`, `amount`, `currency`. |
| [capture-request.json](capture-request.json) | POST body | Generic capture with text + checkbox `input_fields`. |
| [capture-request-payintz.json](capture-request-payintz.json) | POST body | PayInTZ capture with optional `operator` field. |
| [capture-success.json](capture-success.json) | POST response | STK push initiated: `status: success`, `detail: waiting` (provider-specific). |
| [capture-redirect.json](capture-redirect.json) | POST response | Card redirect from `/payments/process/{ref}/`. |
| [capture-error.json](capture-error.json) | POST response | Validation error when required `input_fields` missing. |

## Host webhooks

| File | Direction | Notes |
|------|-----------|-------|
| [webhook-payment-paid.json](webhook-payment-paid.json) | Inbound POST | Host billing layer notifies `paid`; correlate via `invoice_id` (= `external_invoice_reference`). |
| [webhook-payment-pending.json](webhook-payment-pending.json) | Inbound POST | Async payment still processing. |
| [webhook-payment-failed.json](webhook-payment-failed.json) | Inbound POST | Failed / declined payment. |
| [webhook-event-envelope.json](webhook-event-envelope.json) | Inbound POST (unified) | Stripe-style envelope; verify `Fikashop-Signature`. |
| [webhook-signed-request.txt](webhook-signed-request.txt) | HMAC example | Compact JSON body + Python one-liner for signature verification. |

## Cross-fixture identifiers

These IDs tie the examples together across flows:

| Field | Value | Used in |
|-------|-------|---------|
| Invoice UUID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | public invoice, pay init, capture responses |
| External invoice ref | `ext-inv-rider-8842` | public invoice GET, webhooks |
| Partner code | `acme-mobility` | partners list, balance `meta.partner: 42` |
| Wallet UUID | `7c9e6679-7425-40de-944b-e07fc1f90ae7` | balance, partners list |

## API sources (fikashop-api)

- `CheckoutAvailablePaymentMethodSerializer` — `shop/oscarapi/serializers/payment.py`
- `SubscriptionBalanceResponseSerializer` — `subscriptions/serializers.py`
- `PublicInvoiceDetailResponseSerializer` / `PublicInvoicePayResponseSerializer` — `invoices/serializers.py`
- Provider capture responses — `shop/payment/utils/provider_process_response.py`, PayInTZ/Snippe providers
- Synthetic wallet method — `subscriptions/views.py` `_payment_methods()`
- Public pay blocked — `invoices/utils/public_pay.py`
