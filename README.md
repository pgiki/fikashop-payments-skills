# fikashop-payments-skills

Integrate **fikashop-api as a payment-gateway proxy**: client checkout (methods, `input_fields`, top-up, invoice pay) + host webhooks for async confirmation.

Auth is via **[oidc.fikachu.com](https://oidc.fikachu.com)** — reuse the same access token if your app already uses that IdP. List businesses with `GET /shop/api/admin/partners/` to obtain `X-Partner-Id` (`code` or `id`).

| Path | What |
|------|------|
| [SKILL.md](SKILL.md) | Cursor agent skill — use `@fikashop-payments-skills` |
| [contracts/REFERENCE.md](contracts/REFERENCE.md) | Full API contract (start here) |
| [packages/ts](packages/ts) | Client SDK |
| [packages/python](packages/python) | Webhook verify + handler |
| [contracts/fixtures](contracts/fixtures) | Example JSON payloads |

## Install as a Cursor skill

```bash
git clone https://github.com/<org>/fikashop-payments-skills.git
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

const { methods } = await getDepositPaymentMethods(client);
await walletDeposit(client, { total: '10000.00', variant: methods[0].code, currency: 'TZS' });
```

**Webhooks (Python)**

```bash
pip install -e packages/python[dev] && pytest tests/python
```

```python
from fikashop_gateway import process_payment_webhook, InMemoryWebhookHandler

result = process_payment_webhook(
    raw_body=request.body,
    signature_header=request.headers.get("X-Fikachu-Signature", ""),
    secret=os.environ["BILLING_WEBHOOK_SECRET"],
    handler=InMemoryWebhookHandler(),
)
```

Examples: [docs/examples](docs/examples/)

## Local dev

- fikashop-api: `http://127.0.0.1:8076`
- Host profile: `X-Partner-Id` + `billing_partner_base_url`
- Webhooks: expose host via ngrok for async tests

MIT — [LICENSE](LICENSE)
