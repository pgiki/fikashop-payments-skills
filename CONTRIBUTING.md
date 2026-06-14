# Contributing

## TypeScript client (`packages/ts`)

1. Edit files under `packages/ts/src/`
2. Run `npm run build` in `packages/ts/` to regenerate `dist/`
3. Run `npm test` — CI fails if `dist/` does not match `src/`
4. Keep status sets in sync with [contracts/status-map.json](contracts/status-map.json)

## Python webhook handler (`packages/python`)

1. Edit files under `packages/python/fikashop_gateway/`
2. Keep `FIKASHOP_STATUS_MAP` in sync with [contracts/status-map.json](contracts/status-map.json)
3. Run `pytest tests/python`

## Contracts and docs

- Update [contracts/REFERENCE.md](contracts/REFERENCE.md) when API behavior changes
- Update [contracts/SUBSCRIPTIONS.md](contracts/SUBSCRIPTIONS.md) when subscription endpoints, recovery, or idempotency change
- Update [fikashop-api/docs/README-subscriptions-api-integration.md](../../fikashop-api/docs/README-subscriptions-api-integration.md) and [fikashop-api/docs/README-webhooks.md](../../fikashop-api/docs/README-webhooks.md) in the same PR when webhook or subscription contracts change
- Add or update fixtures in [contracts/fixtures/](contracts/fixtures/) — keep fixture tests green
- Regenerate [fikashop-api/openapi.yaml](../../fikashop-api/openapi.yaml) when DRF schema changes
- Update [SKILL.md](SKILL.md) for agent-facing quick reference

## Cursor skill sync

After changing `SKILL.md` or contracts, ensure symlinks point at this repo (not a stale clone):

```bash
ln -sf "$(pwd)" ~/.cursor/skills/fikashop-payments-skills
# Monorepo: from fikashop root
ln -sf "$(pwd)/fikashop-payments-skills" .cursor/skills/fikashop-payments-skills
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs TS build + dist check, TS tests, and Python tests on push/PR to `main`.
