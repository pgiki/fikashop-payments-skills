# Stripe → Fikashop concept mapping

For teams migrating from Stripe Billing / Checkout patterns.

| Stripe | Fikashop |
|--------|----------|
| Customer | Authenticated user (`Authorization: Bearer`) + `X-Partner-Id` |
| Price | `PlanCost` slug (`plan_cost_slug`) |
| Subscription | `UserSubscription` (`POST /subscriptions/api/subscriptions/`) |
| Customer portal (cancel) | `POST …/cancel/` |
| Subscription update | `POST …/change-plan/` (`immediate` with unused-time credit + full new charge, or `next_cycle` pending until renewal) |
| Invoice | Dunning `Invoice` linked via `subject` |
| PaymentIntent / Charge | Wallet debit or `GatewayPayment` (deposit / invoice pay) |
| Checkout Session | **Not provided** — use Checkout A (wallet deposit) or Checkout B (public invoice pay) |
| Idempotency-Key | Same header on subscribe, wallet-deposit, feature bill (24h cache) |
| client_reference | `client_reference` + `metadata` on subscribe → stored in `UserSubscription.meta` |
| Stripe webhooks | Unified envelope + `Fikashop-Signature` |

## Webhook event mapping

| Stripe (approx.) | Fikashop |
|------------------|----------|
| `customer.subscription.created` | `subscription.created` |
| `customer.subscription.updated` | `subscription.updated` |
| `customer.subscription.deleted` | `subscription.cancelled` |
| `invoice.payment_failed` | `subscription.past_due` (+ pending invoice) |
| `invoice.paid` (dunning) | `invoice.payment_succeeded` → `subscription.updated` |
| `payment_intent.succeeded` | `payment.succeeded` / `wallet.deposit_succeeded` |
| `payment_intent.payment_failed` | `payment.failed` |
| `charge.refunded` | `payment.refunded` |

## Intentional differences

- **Wallet-first billing** — subscribe debits partner-scoped wallet; card/PSP is for top-up and dunning invoice pay, not direct subscription charge
- **Two-step PSP checkout** — `/pay/` then `/payments/process/{ref}/` with `input_fields` on capture
- **No hosted Payment Element** — render forms from API `input_fields`
- **Admin API key** — dashboard OIDC token for server setup; not a Stripe-style restricted secret key per customer (future P3)

See [PRODUCTION.md](PRODUCTION.md) for operational guidance.
