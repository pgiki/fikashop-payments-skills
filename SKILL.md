---
name: fikashop-payments-skills
description: Integrate fikashop-api as a payment-gateway proxy for payment methods, checkout input_fields, wallet top-up, shared-invoice pay, and host webhooks. Use for fikashop payments, input_fields forms, X-Partner-Id clients, or payment webhook setup.
---

# Fikashop Payments Skills

**Read first:** [contracts/REFERENCE.md](contracts/REFERENCE.md) · Fixtures: [contracts/fixtures](contracts/fixtures)

## Roles


| Who          | Does what                                                           |
| ------------ | ------------------------------------------------------------------- |
| Host API     | OIDC, `X-Partner-Id` / `billing_partner_base_url`, webhook endpoint |
| Client       | `Bearer` + `X-Partner-Id` → fikashop checkout APIs                  |
| fikashop-api | Methods, wallets, capture, outbound webhooks                        |


Client initiates; host webhook confirms (especially after `redirect` payments).

## Client essentials

**Auth:** fikashop uses **`https://oidc.fikachu.com`**. Apps already on that IdP reuse the **same Bearer token** on fikashop-api.

**Partner (`X-Partner-Id`):**

- `GET /shop/api/admin/partners/` — list businesses for the signed-in user; use `code` or `id` from `results[]`
- Or host profile: `X-Partner-Id` + `billing_partner_base_url`

Then `client.configurePartner(baseUrl, partnerId)` before wallet/invoice calls.

**Methods** — from API, never hardcoded:

- Top-up: `GET …/subscriptions/balance/` → exclude `wallet` method
- Invoice: `GET …/public/{uuid}/` → honor `public_pay_blocked`

**input_fields** — from selected method only:

- Submit keyed by `field.code` (not `label`/`name`)
- `text` → string; `checkbox`/`boolean` → boolean
- Reset form when method changes

**Checkout A (top-up):** balance → `POST …/wallet-deposit/` with `variant` + `input_fields`

**Checkout B (invoice):** public GET → `POST …/pay/` → `payment_reference` → `POST …/payments/process/{ref}/` with `action: capture`

If `status === 'redirect'`, open `redirect_url`.

## Webhook essentials (server)

`POST {host}/billing/v1/webhooks/fikashop`

- `X-Fikachu-Signature` = HMAC-SHA256(secret, **raw body**).hexdigest()
- Payload: `{ invoice_id, status }` — idempotent on `event_id`
- Use `packages/python` or `packages/ts` `verifyFikashopSignature`

## SDK

- Client: `createFikashopClient`, `getInputFieldsForMethod`, `walletDeposit`, `capturePayment` — `packages/ts`
- Webhooks: `process_payment_webhook` — `packages/python`

## Pitfalls

Wrong submit keys · JSON re-serialize before HMAC · webhooks on mobile · missing invoice correlation