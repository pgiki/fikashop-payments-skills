# Admin subscription catalog API

Server-only REST for managing **subscription plans**, **plan costs**, and **plan features** under `/shop/api/admin/`. This is **catalog** administration — not customer subscription (UserSubscription) management.

**User-facing catalog:** customers use `GET /subscriptions/api/subscriptions/plans/` and subscribe with `costs[].slug`. Admin defines what appears there.

---

## Auth

| Token | Where | Use |
|-------|-------|-----|
| `FIKASHOP_ADMIN_ACCESS_TOKEN` | Server env only (dashboard **Settings → API keys**) | All admin catalog routes |
| Staff user | Same token; must be `is_staff` with Django model permissions | Enforced by `APIAdminPermission` |

Send **`Authorization: Bearer …`** and **`X-Partner-Id`** (partner `code` or numeric id) for partner-scoped catalog rows.

Never ship the admin token in React Native, Expo, or browser bundles. See [PRODUCTION.md](PRODUCTION.md).

Example client setup: [docs/examples/admin-subscription-catalog.ts](../docs/examples/admin-subscription-catalog.ts).

---

## Partner scoping

`SubscriptionPlan.partner` is optional:

| `partner` | Visibility |
|-----------|------------|
| `null` | **Platform template** — shown to all partners on `GET …/plans/` |
| `{partner_id}` | **Partner catalog** — only when `X-Partner-Id` matches |

- Admin **list/create** with `X-Partner-Id` scopes to that partner's plans (not platform templates unless you omit the header for platform-only admin).
- Admin **POST** sets `partner` from `X-Partner-Id` by default. Pass `"partner": null` in the body to create a platform-wide plan (staff only).
- Public **`GET …/plans/`** with `X-Partner-Id` returns **partner plans + platform templates**.
- **Subscribe / change-plan** resolve `plan_cost_slug` with partner scope (partner-specific cost wins when applicable).

Each plan includes optional read-only `partner_id` / `partner_code` on catalog and admin responses. Optional GeoJSON `service_area` (`MultiPolygon`, nullable) geofences the public catalog when clients pass `?point=lng,lat`.

---

## Data model

```
SubscriptionPlan (slug unique per partner)
  ├── service_area?  ← MultiPolygon GeoJSON (null = no public geo match when ?point= set)
  ├── PlanCost[]     ← customers subscribe via plan_cost_slug = cost.slug
  ├── PlanFeature[]  ← feature quotas, tiers, overage, optional meta JSON
  └── PlanTag[]      ← tags for ?tags= filter on public catalog
```

| Concept | Subscribe slug | Admin identifier |
|---------|----------------|------------------|
| Plan | — | plan `slug`, UUID `id` |
| Billing option | `plan_cost_slug` (= `PlanCost.slug`) | cost `id` or nested `costs[].slug` |
| Feature | `features[].feature_code` on catalog | `PlanFeature` id or nested `features[].code` |

---

## Endpoints

Base: `{API_URL}/shop/api/admin/`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/subscription-plans/` | List plans (partner-scoped via header) |
| POST | `/subscription-plans/` | Create plan; optional nested `costs[]`, `features[]` |
| GET | `/subscription-plans/{id}/` | Retrieve plan |
| PATCH | `/subscription-plans/{id}/` | Partial update; upsert nested arrays by slug/code |
| DELETE | `/subscription-plans/{id}/` | Delete plan (409 if any cost has subscribers) |
| GET | `/subscription-plans/{id}/costs/` | List costs on plan |
| POST | `/subscription-plans/{id}/costs/` | Add cost (409 if slug exists on plan) |
| GET | `/subscription-plans/{id}/features/` | List features on plan |
| POST | `/subscription-plans/{id}/features/` | Add/upsert feature on plan |
| PATCH | `/plan-costs/{id}/` | Update cost fields |
| DELETE | `/plan-costs/{id}/` | Delete cost (409 if referenced by UserSubscription) |
| PATCH | `/plan-features/{id}/` | Update feature link |
| DELETE | `/plan-features/{id}/` | Delete feature link (409 if FeatureUsage exists) |

---

## One-shot create (POST)

Fixture: [admin-plan-create-full-request.json](fixtures/admin-plan-create-full-request.json)  
Response: [admin-plan-create-full-response.json](fixtures/admin-plan-create-full-response.json)

Nested `costs[]` and `features[]` (including `pricing_tiers[]`) are created in a **single transaction**. Validation errors roll back the entire request.

Optional plan body field **`service_area`**: GeoJSON `MultiPolygon` (or `null` to clear on patch). Optional feature field **`meta`**: JSON object for integrator-defined metadata (returned on public catalog `features[]`).

Minimal create (tags only): [admin-plan-create-request.json](fixtures/admin-plan-create-request.json).

---

## Partial update (PATCH)

Fixture: [admin-plan-patch-request.json](fixtures/admin-plan-patch-request.json)

When `costs` or `features` arrays are present, rows are **upserted by slug/code** on the plan. Omitted top-level keys are unchanged. Omitting `costs`/`features` does **not** delete existing rows — use `DELETE …/plan-costs/{id}/` or `DELETE …/plan-features/{id}/`.

---

## Incremental cost / feature

| Fixture | Scenario |
|---------|----------|
| [admin-plan-cost-create-request.json](fixtures/admin-plan-cost-create-request.json) | POST `…/subscription-plans/{id}/costs/` |
| [admin-plan-feature-create-request.json](fixtures/admin-plan-feature-create-request.json) | POST `…/subscription-plans/{id}/features/` |

---

## Delete rules

| Action | Blocked when | Status |
|--------|--------------|--------|
| DELETE plan-cost | Any `UserSubscription` references the cost | **409** |
| DELETE plan-feature | `FeatureUsage` exists for that feature on the plan | **409** |
| DELETE plan | Any cost on the plan has subscribers | **409** |

Fixture: [admin-plan-delete-blocked-409.json](fixtures/admin-plan-delete-blocked-409.json)

---

## Validation errors

| Condition | Status |
|-----------|--------|
| Non-staff / missing model permission | **403** |
| Duplicate cost slug on another plan | **400** |
| Duplicate slug/code within same request | **400** |
| Platform plan slug collision (`partner=null`) | **400** |
| Plan belongs to another partner | **404** |

---

## SDK (TypeScript)

```ts
import {
  createFikashopClient,
  createAdminSubscriptionPlan,
  updateAdminSubscriptionPlan,
  deleteAdminPlanCost,
} from '@fikashop/payment-gateway-client';

const client = createFikashopClient({
  baseUrl: process.env.FIKASHOP_API_URL!,
  getAccessToken: async () => process.env.FIKASHOP_ADMIN_ACCESS_TOKEN!,
  partnerId: process.env.FIKASHOP_PARTNER_CODE,
});

await createAdminSubscriptionPlan(client, {
  slug: 'enterprise',
  plan_name: 'Enterprise',
  tags: ['enterprise'],
  costs: [{ slug: 'enterprise-monthly', recurrence_unit: 'month', cost: '50000.0000', currency: 'TZS' }],
  features: [{ code: 'sms_outbound', feature_type: 'quota', quota: 500 }],
});
```

Module: `packages/ts/src/admin-subscriptions.ts` — exported from package index.

---

## Relationship to user flows

1. **Admin** creates/updates catalog (this doc).
2. **Customers** call `GET …/plans/?tags=` and `POST …/subscriptions/` with `plan_cost_slug` from `costs[].slug`.
3. **Bootstrap subscribe** (unknown slug) still works for integrators but **does not update** existing plans — prefer admin API for edit/delete.

See [SUBSCRIPTIONS.md](SUBSCRIPTIONS.md) for subscribe, features, dunning, and change/cancel.

---

## Related

- Fixtures index: [fixtures/README.md](fixtures/README.md)
- Payments + webhooks: [REFERENCE.md](REFERENCE.md)
- Server OpenAPI companion: [fikashop-api/docs/README-subscriptions-api-integration.md](../../fikashop-api/docs/README-subscriptions-api-integration.md) (admin appendix)
