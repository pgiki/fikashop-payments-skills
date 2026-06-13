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
- Add or update fixtures in [contracts/fixtures/](contracts/fixtures/)
- Update [SKILL.md](SKILL.md) for agent-facing quick reference

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs TS build + dist check, TS tests, and Python tests on push/PR to `main`.
