# Production integration guide

Operational patterns for shipping fikashop payments and subscriptions in production.

See also [STRIPE-MIGRATION.md](STRIPE-MIGRATION.md) for concept mapping from Stripe.

---

## Auth tokens

| Context | Token | Storage |
|---------|-------|---------|
| **Server** (webhook registration, admin APIs) | `FIKASHOP_ADMIN_ACCESS_TOKEN` from fikashop dashboard **Settings → API keys** | Server env / secrets manager only |
| **Client** (React, React Native, web checkout) | End-user OIDC `access_token` from `https://oidc.fikachu.com` | Secure session storage — **never** admin token |

Subscription routes are **user-scoped**. The admin token configures webhooks and **subscription catalog** (`/shop/api/admin/subscription-plans/`); it does not substitute for customer login on subscribe or feature routes.

---

## Async subscription state machine

Wallet-first subscribe is synchronous when the wallet is funded; otherwise:

1. `POST …/subscriptions/` → `active: false`, optional `unpaid_invoices[]`, `recovery.recommended_action`
2. Celery `PlanManager` retries billing about **every minute**
3. Integrators recover via **webhook-first** (`subscription.past_due`, `wallet.deposit_succeeded`, `subscription.updated`) or poll helpers (`pollSubscriptionActive`)

Do **not** call subscribe again to “retry” — poll or wait for webhooks.

---

## Idempotency

Send `Idempotency-Key` (or `X-Idempotency-Key`) on:

- `POST …/subscriptions/`
- `POST …/wallet-deposit/`
- `POST …/features/{code}/bill/`

Same key + same user + partner + route returns the cached response for **24 hours**. Use a UUID per user action (subscribe tap, deposit confirm, bill click).

---

## Redirect payments

When deposit or invoice pay returns `status: redirect`:

1. Send the user to `redirect_url`
2. On return, **refresh the OIDC access token** if the session may have expired
3. Confirm via webhook (`payment.succeeded`, `wallet.deposit_succeeded`, `invoice.payment_succeeded`) — do not assume success from the redirect alone

---

## Webhook recovery (recommended)

Register endpoints with the server admin token — see [docs/examples/server-webhook-setup.ts](../docs/examples/server-webhook-setup.ts).

**Subscription catalog admin** (plans, costs, features) uses the same admin token with `X-Partner-Id` — see [ADMIN-SUBSCRIPTIONS.md](ADMIN-SUBSCRIPTIONS.md) and [docs/examples/admin-subscription-catalog.ts](../docs/examples/admin-subscription-catalog.ts). Keep catalog management on your backend; customers still use user tokens for `GET …/plans/` and subscribe.

| Event | Action |
|-------|--------|
| `subscription.past_due` | Show pay dunning or top-up UI |
| `wallet.deposit_succeeded` | Poll subscription or refresh dashboard |
| `subscription.updated` with `active: true` | Unlock features |
| `invoice.payment_succeeded` (dunning) | Same as `subscription.updated` after dunning pay |

Use `createWebhookRouter()` from the SDK to dispatch by `type`. Node backends can use `processUnifiedWebhook()` (TS parity with Python).

**Poll helpers:** `pollSubscriptionActive`, `waitForWalletCredit`, `waitForInvoicePaid` (Checkout B / dunning Path B).

---

## Recovery hints (`recovery` on subscription JSON)

| `recommended_action` | Meaning |
|----------------------|---------|
| `none` | No action required |
| `wallet_topup` | Fund wallet; Celery will retry billing |
| `pay_dunning_invoice` | Pay `recovery.dunning_invoice_uuid` via Checkout B |

Fixture: [fixtures/subscribe-response-inactive-dunning.json](fixtures/subscribe-response-inactive-dunning.json)

---

## Sandbox / livemode

Webhook envelopes include `livemode: true|false`. Test PSP credentials and dev API hosts emit `livemode: false`. Treat test webhooks as non-settlement events in your ledger.

---

## Pitfalls

- **Prorated `change-plan`:** `immediate` credits unused time and charges the full new plan (restart billing window); `next_cycle` schedules `pending_plan_cost` until renewal. Insufficient wallet → HTTP 402.
- **Same `X-Partner-Id`** on subscribe, balance, deposit, feature bill, and transactions
- **Never** put `FIKASHOP_ADMIN_ACCESS_TOKEN` in `EXPO_PUBLIC_*` or client bundles
