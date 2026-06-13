# fikashop-payments-skills

Integrate **fikashop-api** for **payments** (wallet top-up, invoice pay), **subscriptions** (plans, subscribe, change/cancel), and **host webhooks** (async confirmation).

Auth is via **[oidc.fikachu.com](https://oidc.fikachu.com)** — reuse the same access token if your app already uses that IdP. List businesses with `GET /shop/api/admin/partners/` to obtain `X-Partner-Id` (`code` or `id`).

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | Cursor agent skill — use `@fikashop-payments-skills` |
| [contracts/REFERENCE.md](contracts/REFERENCE.md) | Full API contract (start here) |
| [packages/ts](packages/ts) | Client SDK |
| [packages/python](packages/python) | Webhook verify + handlers |
| [contracts/fixtures](contracts/fixtures) | Example JSON payloads |
| [contracts/status-map.json](contracts/status-map.json) | Canonical status normalization |

## Integration map

| Use case | Flow | SDK helpers |
|----------|------|-------------|
| Wallet top-up | Checkout A | `getDepositPaymentMethods`, `walletDeposit` |
| Pay shared invoice | Checkout B | `getPublicInvoice`, `initiatePublicPay`, `capturePayment` |
| Subscribe to plan | Subscriptions | `getSubscriptionPlans`, `subscribeToPlan`, `listSubscriptions` |
| Async confirmation | Webhooks | `verifyUnifiedFikashopSignature`, `process_unified_webhook` (Python) |

## Install as a Cursor skill

In the fikashop monorepo, this directory is already at `fikashop/fikashop-payments-skills`. Symlink it:

```bash
ln -sf "$(pwd)/fikashop-payments-skills" ~/.cursor/skills/fikashop-payments-skills
```

Or clone standalone:

```bash
git clone https://github.com/fikachu/fikashop-payments-skills.git
ln -s "$(pwd)/fikashop-payments-skills" ~/.cursor/skills/fikashop-payments-skills
```

## Quick start

**Client (TypeScript)**

```bash
cd packages/ts && npm install && npm test
```

```ts
import {
  createFikashopClient,
  listUserPartners,
  parsePartnerList,
  getDepositPaymentMethods,
  getSubscriptionPlans,
  subscribeToPlan,
  walletDeposit,
} from '@fikashop/payment-gateway-client';

const client = createFikashopClient({
  baseUrl: 'https://api.fikashop.app',
  getAccessToken: async () => token, // same token from oidc.fikachu.com
});

const partnersResp = await listUserPartners(client);
const partners = parsePartnerList(partnersResp.data);
client.configurePartner('https://api.fikashop.app', partners[0].code);
// mobility apps: client.configurePartner(profile.billing_partner_base_url, xPartnerId);

// Wallet top-up
const { methods } = await getDepositPaymentMethods(client);
await walletDeposit(client, { total: '10000.00', variant: methods[0].code, currency: 'TZS' });

// Subscribe (requires sufficient wallet balance)
const plansResp = await getSubscriptionPlans(client);
const slug = plansResp.data?.[0]?.costs?.[0]?.slug;
if (slug) await subscribeToPlan(client, slug);
```

**Webhooks (Python — unified events, preferred)**

```bash
pip install -e packages/python[dev] && pytest tests/python
```

```python
from fikashop_gateway import InMemoryUnifiedWebhookHandler, process_unified_webhook

result = process_unified_webhook(
    raw_body=request.body,
    fikashop_signature=request.headers.get("Fikashop-Signature", ""),
    legacy_signature=request.headers.get("X-Fikachu-Signature", ""),
    secret=os.environ["BILLING_WEBHOOK_SECRET"],
    handler=InMemoryUnifiedWebhookHandler(),
)
```

Legacy flat payload (`{ invoice_id, status }`): use `process_payment_webhook` instead.

Examples: [docs/examples](docs/examples/) — [checkout-invoice.ts](docs/examples/checkout-invoice.ts), [subscribe-and-topup.ts](docs/examples/subscribe-and-topup.ts).

## Local dev

- fikashop-api: `http://127.0.0.1:8076`
- Host profile: `X-Partner-Id` + `billing_partner_base_url`
- Webhooks: expose host via ngrok for async tests

See [CONTRIBUTING.md](CONTRIBUTING.md) for change workflow.

MIT — [LICENSE](LICENSE)
