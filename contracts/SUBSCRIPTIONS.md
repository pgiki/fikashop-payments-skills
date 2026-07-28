# Subscriptions API — integration guide

Self-contained contract for third-party apps integrating with fikashop-api **Subscriptions** (`/subscriptions/api/subscriptions/`).

**Fixtures:** every response below links to [fixtures/](fixtures/) JSON you can use for UI mocks and SDK tests. Index: [fixtures/README.md](fixtures/README.md).

**Payments cross-links:** wallet top-up (Checkout A), public invoice pay (Checkout B), and webhooks are in [REFERENCE.md](REFERENCE.md) §§3–6.

---

## Short answer

Subscriptions bill from the user's **partner-scoped wallet**. Users subscribe to a **plan cost slug** (e.g. `pro-monthly`) from the catalog — not the plan slug. On subscribe, the wallet is charged immediately:

- Sufficient funds → `active: true`
- Insufficient funds → `active: false` and `unpaid_invoices[]` may list a dunning invoice to collect

The catalog is **read-only** for typical integrators — use slugs from `GET …/plans/`. Metered capabilities use the **feature API**: gate with `GET …/features/{code}/access/`, record usage with `POST …/features/{code}/bill/`.

```text
Bearer + X-Partner-Id
  → GET …/plans/?point=lng,lat&includes=subscribed_plan_cost_id
  → GET …/plans/{plan_id}/     plan detail (optional)
  → (optional) GET …/balance/
  → POST …/                   subscribe (costs[].slug)
  → GET …/usage-by-plan/{plan_id}/   or …/usage-by-id/{subscription_id}/
  → GET …/features/{code}/access/   gate UI / API (?point= optional)
  → POST …/features/{code}/bill/    record usage (+ wallet if overage)
  → (optional) POST …/change-plan/ or …/cancel/
```

---

## Authentication and partner scoping

| Header / query | Purpose |
|----------------|---------|
| `Authorization: Bearer {access_token}` | Required — OIDC from `https://oidc.fikachu.com` |
| `X-Partner-Id: {partner_code_or_id}` | Scopes wallet and subscription billing |
| `?partner=` | Alternative to `X-Partner-Id` |

**Resolve partner:** `GET /shop/api/admin/partners/` → use `results[].code` or `id`. Fixture: [partners-list.json](fixtures/partners-list.json).

**Precedence:** query `?partner=` → header `X-Partner-Id` → session `partner_id` (browser only). Numeric = partner PK; non-numeric = partner code (e.g. `acme-mobility`).

Send the **same** `X-Partner-Id` on subscribe, balance, deposit, feature bill, and transactions.

### Subscription `meta` (billing provenance)

Persisted on subscribe; used for renewals when HTTP partner context is absent:

```json
{
  "partner_id": 42,
  "partner_code": "acme-mobility",
  "source": "api_subscribe",
  "plan_cost_slug": "pro-monthly"
}
```

| Key | Meaning |
|-----|---------|
| `partner_id` | Billing partner PK; `null` = global wallet |
| `partner_code` | Denormalized partner code |
| `dunning_paid_invoice_uuids` | Invoice UUIDs already applied to restore billing |

### Subscribed partner vs billing partner

Two partner scopes apply on subscribe:

| Scope | Source | Stored on |
|-------|--------|-----------|
| **Billing** | `?partner=` / `X-Partner-Id` | `meta.partner_id` — wallet debits and renewals |
| **Subscribed partner** | JSON body `subscribed_partner` (int PK or string code) | Top-level `subscribed_partner_id` / `subscribed_partner_code` on the subscription — feature access and entitlements |

```json
POST /subscriptions/api/subscriptions/?partner=platform-wallet
{
  "plan_cost_slug": "pro-monthly",
  "subscribed_partner": "shop-a"
}
```

Use the same int-or-code resolution as request partner scoping. Omit body `subscribed_partner` when entitlements are not shop-specific. Feature access/bill endpoints filter by `?subscribed_partner=` when present (billing partner context does not select the subscription row).

---

## Endpoint summary

Base path: **`/subscriptions/api/subscriptions/`**

| Method | Path | Purpose | Fixture(s) |
|--------|------|---------|------------|
| GET | `/` | List subscriptions + wallet `balance`; optional `?point=` geo filter | [subscriptions-list.json](fixtures/subscriptions-list.json) |
| POST | `/` | Subscribe (`plan_cost_slug`) | [subscribe-response.json](fixtures/subscribe-response.json), [subscribe-response-inactive-dunning.json](fixtures/subscribe-response-inactive-dunning.json) |
| GET | `/plans/` | Plan catalog; `?tags=`, `?point=`, `?includes=subscribed_plan_cost_id` | [subscription-plans.json](fixtures/subscription-plans.json), [subscription-plans-filtered-by-tag.json](fixtures/subscription-plans-filtered-by-tag.json), [subscription-plans-with-subscribed-cost.json](fixtures/subscription-plans-with-subscribed-cost.json) |
| GET | `/plans/{plan_id}/` | Single plan (same catalog rules) | [subscription-plan-detail.json](fixtures/subscription-plan-detail.json) |
| GET | `/usage-by-plan/{plan_id}/` | Active `UserSubscription` for plan (+ `feature_usage`); optional `?point=` | [usage-by-plan-response.json](fixtures/usage-by-plan-response.json) |
| GET | `/usage-by-id/{subscription_id}/` | Caller’s `UserSubscription` by id | [usage-by-plan-response.json](fixtures/usage-by-plan-response.json) |
| GET | `/features/{code}/access/` | Check feature access; optional `?point=` | [feature-access-allowed.json](fixtures/feature-access-allowed.json) |
| POST | `/features/{code}/bill/` | Bill feature usage; optional `?point=` | [feature-bill-response.json](fixtures/feature-bill-response.json) |
| GET | `/plan-options/` | Alternate costs; optional `?point=` | [plan-options-all.json](fixtures/plan-options-all.json) |
| POST | `/change-plan/` | Change billing option (`immediate` prorate / `next_cycle` pending) | [change-plan-response.json](fixtures/change-plan-response.json), [change-plan-next-cycle-response.json](fixtures/change-plan-next-cycle-response.json) |
| POST | `/cancel/` | Cancel subscription | [cancel-response.json](fixtures/cancel-response.json) |
| GET | `/balance/` | Balance + deposit methods | [balance-with-methods.json](fixtures/balance-with-methods.json) |
| GET | `/payment-methods/` | Deposit methods only | [subscription-payment-methods.json](fixtures/subscription-payment-methods.json) |
| GET | `/transactions/` | Wallet history | [subscription-transactions-page1.json](fixtures/subscription-transactions-page1.json) |
| POST | `/wallet-deposit/` | Top-up wallet | [wallet-deposit-request.json](fixtures/wallet-deposit-request.json) |
| POST | `/wallet-debit/` | Withdrawal hold (partner required) | Out of scope — see appendix |

---

## Key concepts

| Concept | Source | Use |
|---------|--------|-----|
| Plan cost | `plans[].costs[].slug` | Value for `plan_cost_slug` on subscribe |
| Subscription | `GET …/` | Billing state, `feature_usage[]` |
| Feature code | `features[]` / `feature_usage[]` | Path segment for access/bill |
| Unpaid invoice | `unpaid_invoices[]` | Pay via public invoice API or top up wallet |
| Billing retry | `billing_retry_exhausted` | When `true`, Celery skips auto-billing until payment succeeds |

`GET …/` returns **all** subscriptions (active, inactive, cancelled). Filter client-side on `active`, `cancelled`, and `unpaid_invoices`.

---

## 1. List subscriptions

```http
GET /subscriptions/api/subscriptions/
Authorization: Bearer {access_token}
X-Partner-Id: {partner_code}
```

**Response `200`:** [subscriptions-list.json](fixtures/subscriptions-list.json)

---

## 2. Subscribe

```http
POST /subscriptions/api/subscriptions/
Authorization: Bearer {access_token}
X-Partner-Id: {partner_code}
Content-Type: application/json
Idempotency-Key: {uuid}

{
  "plan_cost_slug": "pro-monthly",
  "subscribed_partner": "shop-a",
  "client_reference": "order-8842",
  "metadata": { "cart_id": "cart-99" }
}
```

Optional body `subscribed_partner` — integer PK or string code for the **subscribed partner** business (see [Subscribed vs billing](#subscribed-partner-vs-billing-partner)). Examples: `"subscribed_partner": 42` or `"subscribed_partner": "shop-a"`.

Optional correlation: [subscribe-request-with-client-reference.json](fixtures/subscribe-request-with-client-reference.json). `client_reference` and `metadata` persist on `UserSubscription.meta` and appear in `subscription.*` webhooks.

| Response | Fixture |
|----------|---------|
| `201` — wallet funded, `active: true` | [subscribe-response.json](fixtures/subscribe-response.json) |
| `201` — underfunded, `active: false` + dunning + `recovery` | [subscribe-response-inactive-dunning.json](fixtures/subscribe-response-inactive-dunning.json) |
| `400` — unknown slug (no bootstrap `plan` block) | [subscribe-error-unknown-slug.json](fixtures/subscribe-error-unknown-slug.json) |

**Recovery hints:** read-only `recovery.recommended_action` — `none` | `wallet_topup` | `pay_dunning_invoice` plus optional `dunning_invoice_uuid`. See [PRODUCTION.md](PRODUCTION.md).

**Idempotency:** repeat the same `Idempotency-Key` within 24h to receive the cached subscribe response (safe retries after network loss).

Slug-first: third-party integrators use slugs from `GET …/plans/` only. Creating plans via API is platform/bootstrap only.

---

## 3. Plan catalog

```http
GET /subscriptions/api/subscriptions/plans/
Authorization: Bearer {access_token}
```

Filter by tag (AND — plans with **every** listed tag):

```http
GET /subscriptions/api/subscriptions/plans/?tags=enterprise
GET /subscriptions/api/subscriptions/plans/?tags=enterprise,featured
```

### Geofence (`?point=`)

```http
GET /subscriptions/api/subscriptions/plans/?point=39.28,-6.82
```

Convention: **`longitude,latitude`** (SRID 4326). When `point` is set, only plans with a non-null `service_area` that **covers** the point are returned (unfenced / null `service_area` plans are **excluded**). Same filter applies to list subscriptions, plan detail, plan-options, usage-by-plan, and feature access/bill. Malformed `point` → `400` ([point-invalid-400.json](fixtures/point-invalid-400.json)). Missing `point` → no geo filter.

Catalog responses may include GeoJSON `service_area` (`MultiPolygon` or `null`).

### Optional includes (`?includes=`)

Comma-separated optional fields. Supported today:

| Include | Field | Meaning |
|---------|-------|---------|
| `subscribed_plan_cost_id` | `subscribed_plan_cost_id` | Active `PlanCost` UUID for the caller on that plan, or `null` if not subscribed. **Omitted** unless requested. |

```http
GET /subscriptions/api/subscriptions/plans/?includes=subscribed_plan_cost_id
GET /subscriptions/api/subscriptions/plans/{plan_id}/?includes=subscribed_plan_cost_id
```

Fixture: [subscription-plans-with-subscribed-cost.json](fixtures/subscription-plans-with-subscribed-cost.json).

Each plan includes `tags: string[]`, optional `partner_id` / `partner_code`, `service_area`, billing options in `costs[]`, and `features[]` (with optional `meta`). Tags are assigned via the **admin catalog API** ([ADMIN-SUBSCRIPTIONS.md](ADMIN-SUBSCRIPTIONS.md)) or Django admin; integrators read and filter only.

With **`X-Partner-Id`**, the catalog returns partner-specific plans plus platform templates (`partner_id: null`). Subscribe and change-plan resolve `plan_cost_slug` within that partner scope.

**Response `200`:** [subscription-plans.json](fixtures/subscription-plans.json) — includes `tags[]`, `costs[]`, and `features[]` with quotas, overage rates, pricing tiers, and `meta`.

Filtered example: [subscription-plans-filtered-by-tag.json](fixtures/subscription-plans-filtered-by-tag.json) for `?tags=enterprise`.

### Plan detail

```http
GET /subscriptions/api/subscriptions/plans/{plan_id}/
GET /subscriptions/api/subscriptions/plans/{plan_id}/?point=39.28,-6.82
```

Same partner + geo visibility as the list. **Response `200`:** [subscription-plan-detail.json](fixtures/subscription-plan-detail.json). Unknown / out-of-scope id → `404`.

### Usage by plan / subscription id

```http
GET /subscriptions/api/subscriptions/usage-by-plan/{plan_id}/
GET /subscriptions/api/subscriptions/usage-by-plan/{plan_id}/?point=39.28,-6.82
GET /subscriptions/api/subscriptions/usage-by-id/{subscription_id}/
```

Returns the caller’s `UserSubscription` (`UserSubscriptionSerializer`, including `feature_usage[]`). `usage-by-plan` prefers the latest active non-cancelled row for that plan. No match → `404`. Fixture: [usage-by-plan-response.json](fixtures/usage-by-plan-response.json).

Example: [plans-by-tag.ts](../docs/examples/plans-by-tag.ts)

---

## 4. Plan options (change-plan picker)

```http
GET /subscriptions/api/subscriptions/plan-options/
GET /subscriptions/api/subscriptions/plan-options/?for_subscription={uuid}
GET /subscriptions/api/subscriptions/plan-options/?point=39.28,-6.82
```

| Query | Response fixture |
|-------|------------------|
| (none) — all costs | [plan-options-all.json](fixtures/plan-options-all.json) |
| `for_subscription` — same plan, exclude current cost | [plan-options-for-subscription.json](fixtures/plan-options-for-subscription.json) |

`change-plan` accepts **any** valid `PlanCost` slug — not limited to the `for_subscription` list.

---

## 5. Change plan

**Request:** [change-plan-request.json](fixtures/change-plan-request.json)

```http
POST /subscriptions/api/subscriptions/change-plan/
Content-Type: application/json

{
  "subscription_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "target_plan_cost_slug": "pro-yearly",
  "effective_mode": "immediate"
}
```

| `effective_mode` | Behavior |
|------------------|----------|
| `immediate` (default) | Unused-time **credit** on the current plan + charge **full** new `PlanCost.cost` + restart `date_billing_last` / `date_billing_next`. Insufficient funds → **402** (plan unchanged). |
| `next_cycle` | Keep current plan and billing dates; set `pending_plan_cost_*`. Applied on renewal (`process_due`): bill new cost, then swap. |

**Response `200`:** [change-plan-response.json](fixtures/change-plan-response.json) (includes `pending_plan_cost_id` / `pending_plan_cost_slug` when scheduled).

**Response `402`:** [change-plan-error-insufficient-funds.json](fixtures/change-plan-error-insufficient-funds.json) — immediate change only.

---

## 6. Cancel subscription

**Request:** [cancel-request.json](fixtures/cancel-request.json)

```http
POST /subscriptions/api/subscriptions/cancel/
Content-Type: application/json

{ "subscription_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479" }
```

**Response `200`:** [cancel-response.json](fixtures/cancel-response.json) — pending dunning invoices are voided.

---

## 7. Feature access (read-only)

```http
GET /subscriptions/api/subscriptions/features/sms_outbound/access/
Authorization: Bearer {access_token}
```

Optional query params when selecting which subscription row to use:

- `?subscription_id={uuid}` — when the user has multiple active subscriptions
- `?subscribed_partner={id|code}` — when entitlements are shop-specific (does **not** use billing `X-Partner-Id` for row selection)
- `?point=lng,lat` — only consider subscriptions whose plan `service_area` covers the point (same geo rules as catalog)

Without `subscription_id` / `subscribed_partner`, the **most recently started** active subscription is used (after geo filter when `point` is set).

| Scenario | Status | Fixture |
|----------|--------|---------|
| Allowed | `200`, `allowed: true` | [feature-access-allowed.json](fixtures/feature-access-allowed.json) |
| Quota exhausted | `200`, `allowed: false` | [feature-access-quota-exhausted.json](fixtures/feature-access-quota-exhausted.json) |
| Not on plan | `200`, `allowed: false` | [feature-access-not-on-plan.json](fixtures/feature-access-not-on-plan.json) |
| No active subscription | `403` | [feature-access-no-subscription.json](fixtures/feature-access-no-subscription.json) |
| Unknown feature | `404` | — |

Always call access **before** each gated action. For `rate` features, list `feature_usage[]` may zero `used` when the window elapsed — access is authoritative.

---

## 8. Feature bill (write)

```http
POST /subscriptions/api/subscriptions/features/partner_site_ai_credits/bill/
Authorization: Bearer {access_token}
X-Partner-Id: {partner_code}
Content-Type: application/json

{ "quantity": 1 }
```

Optional query params: `?subscription_id={uuid}` and/or `?subscribed_partner={id|code}` (see [§7](#7-feature-access-read-only)). `quantity` defaults to `1`, max `100`.

| Scenario | Status | Fixture |
|----------|--------|---------|
| Within quota (no charge) | `200` | [feature-bill-response.json](fixtures/feature-bill-response.json) |
| Overage / usage charge | `200` | [feature-bill-overage-charged.json](fixtures/feature-bill-overage-charged.json) |
| Insufficient wallet | `402` | [feature-bill-insufficient-wallet.json](fixtures/feature-bill-insufficient-wallet.json) |
| Quota exceeded, no overage | `429` | [feature-bill-quota-exceeded.json](fixtures/feature-bill-quota-exceeded.json) |

### Billing rules by `feature_type`

| Type | Access | Bill |
|------|--------|------|
| `boolean` | `allowed` true/false | Not billable (`400`) |
| `quota` | `used`, `remaining`, `quota` | Increments usage; overage debits wallet when `overage_rate` set |
| `rate` | Windowed `remaining` | Increments within window; no wallet charge |
| `usage` | Usage counters | Always debits wallet per `overage_rate` / tiers |

**Concurrency:** send header `Idempotency-Key` on bill for safe retries (24h cache). Bill immediately after a successful action, or accept `402`/`429` if another request consumed quota first. After overage with wallet debit, `remaining` may be **negative**.

### HTTP status matrix

| Situation | Access | Bill |
|-----------|--------|------|
| Allowed / billed | `200`, `allowed: true` | `200`, `status: "billed"` |
| Feature not on plan | `200`, `allowed: false` | `400` |
| Quota / rate exhausted (no overage) | `200`, `allowed: false` | `429` |
| No active subscription | `403` | `403` |
| Insufficient wallet | — | `402` |

---

## 9. Wallet balance and deposit methods

```http
GET /subscriptions/api/subscriptions/balance/
X-Partner-Id: {partner_code}
```

**Response `200`:** [balance-with-methods.json](fixtures/balance-with-methods.json)

Exclude `code === 'wallet'` from deposit method pickers. Synthetic `wallet` entry includes `meta.balance`, `meta.wallet_id`, `meta.partner`.

Alternative: `GET …/payment-methods/?exclude_codes=cash,wallet` → [subscription-payment-methods.json](fixtures/subscription-payment-methods.json)

### Wallet top-up

See [REFERENCE.md §4 Checkout A](REFERENCE.md#a--wallet-top-up-one-post). Request: [wallet-deposit-request.json](fixtures/wallet-deposit-request.json). Responses: [wallet-deposit-confirmed.json](fixtures/wallet-deposit-confirmed.json), [wallet-deposit-redirect.json](fixtures/wallet-deposit-redirect.json).

---

## 10. Wallet transactions

```http
GET /subscriptions/api/subscriptions/transactions/?page=1&size=20
X-Partner-Id: {partner_code}
```

**Response `200`:** [subscription-transactions-page1.json](fixtures/subscription-transactions-page1.json)

Default `size=15`, max `10000`. Results newest first. `transaction_type` values include `deposit`, `subscription`, `purchase`, `refund`, `cancellation`.

---

## Recovery playbook (underfunded subscribe / failed renewal)

When wallet debit fails at subscribe or renewal, a **pending dunning invoice** appears in `unpaid_invoices[]` (use `uuid`, not parsed `payment_terms`).

```mermaid
flowchart TD
  inactive["active: false + unpaid_invoices"]
  inactive --> pathA[Path A: wallet-deposit]
  inactive --> pathB[Path B: public invoice pay]
  pathA --> webhookA[wallet.deposit_succeeded or poll balance]
  pathB --> webhookB[invoice.payment_succeeded or poll subscriptions]
  webhookA --> active["active: true"]
  webhookB --> active
```

### Path A — Wallet top-up

1. `POST …/wallet-deposit/` with sufficient `total`
2. Wait for credit:
   - **Webhook (preferred):** `wallet.deposit_succeeded` — [webhook-wallet-deposit-succeeded.json](fixtures/webhook-wallet-deposit-succeeded.json)
   - **Poll:** `GET …/balance/` or `GET …/transactions/`
3. Celery retries wallet debit on a **~1 minute** schedule
4. Confirm `active: true` via `GET …/subscriptions/`

### Path B — Pay dunning invoice

1. Use `unpaid_invoices[].uuid`
2. Public invoice flow — [REFERENCE.md §4 Checkout B](REFERENCE.md#b--shared-invoice-two-steps):
   - `GET /invoices/api/public/{uuid}/`
   - `POST /invoices/api/public/{uuid}/pay/`
   - `POST /payments/process/{ref}/` with `action: capture`
3. When invoice is **paid**, subscription restores **without a second wallet debit**
4. Confirm via `invoice.payment_succeeded` webhook or poll `GET …/subscriptions/`

### When auto-retry stops

If `billing_retry_exhausted` is `true`, Celery skips automatic billing until payment succeeds. `payment_failure_notify_count` tracks dunning notifications for the current cycle.

Plan `grace_period` (days) affects dunning invoice `due_date`. During extended grace, a failed renewal may keep `active: true` while dunning runs.

---

## Webhooks (server-side sync)

Mobile and browser clients should **poll**; backend integrators register webhooks — [REFERENCE.md §6](REFERENCE.md#6-webhooks-server).

| Event | When to use |
|-------|-------------|
| `wallet.deposit_succeeded` | Wallet top-up confirmed — refresh balance, retry subscribe |
| `invoice.payment_succeeded` | Dunning invoice paid — refresh subscription state |
| `payment.succeeded` / `payment.failed` | Gateway session during deposit or public pay |

There are **no** partner webhooks for subscription activated/cancelled — poll `GET …/subscriptions/` or use wallet/invoice events above.

Register: `POST /shop/api/admin/webhooks/endpoints/` with `X-Partner-Id`.

---

## Errors (quick reference)

| Condition | Status | Action |
|-----------|--------|--------|
| Not authenticated | `401` | Re-authenticate |
| Bad / missing `plan_cost_slug` | `400` | Use slug from `GET …/plans/` |
| `next_cycle` change plan | `200` | Pending applied on renewal |
| Immediate change underfunded | `402` | Top up wallet; plan unchanged |
| Feature not billable | `400` | Use access only |
| No active subscription | `403` | Subscribe first |
| Unknown feature code | `404` | Use codes from catalog |
| Insufficient wallet on subscribe | `201`, `active: false` | Top up or pay dunning invoice |
| Auto-billing stopped | `billing_retry_exhausted: true` | Pay dunning or top up |
| Insufficient wallet on feature bill | `402` | Top up wallet |
| Quota / rate limit exceeded | `429` | Upgrade, wait, or enable overage |

---

## Integration checklist

- Set `X-Partner-Id` before wallet/subscribe calls
- Use `plan_cost_slug` from `GET …/plans/` (not plan slug)
- Gate paid features with `GET …/features/{code}/access/`
- Record usage with `POST …/features/{code}/bill/` after successful actions
- Handle `unpaid_invoices[]` when `active` is false
- Pass `?subscription_id=` when user has multiple active subscriptions
- Pass `?subscribed_partner=` on feature access/bill when entitlements are shop-specific
- Use wallet deposit for balance changes; use public invoice pay for dunning collection

---

## SDK (TypeScript)

```ts
import {
  listSubscriptions,
  getSubscriptionPlans,
  subscribeToPlan,
  changePlan,
  cancelSubscription,
  getPlanOptions,
  getSubscriptionTransactions,
  checkFeatureAccess,
  billFeatureUsage,
  getDepositPaymentMethods,
  walletDeposit,
} from '@fikashop/payment-gateway-client';
```

Examples: [docs/examples/subscribe-and-topup.ts](../docs/examples/subscribe-and-topup.ts), [feature-gating-and-bill.ts](../docs/examples/feature-gating-and-bill.ts), [dunning-recovery.ts](../docs/examples/dunning-recovery.ts).

---

## Appendix: wallet debit (out of scope)

`POST …/wallet-debit/` creates a withdrawal hold invoice (partner **required**). Not part of typical payment-gateway integration — see OpenAPI `/docs/` if your product needs payout holds.

---

## Related

- Payments overview: [REFERENCE.md](REFERENCE.md)
- Status normalization: [status-map.json](status-map.json)
- All fixtures: [fixtures/README.md](fixtures/README.md)
