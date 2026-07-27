# Publishing packages

Production dependency management for `@fikashop/payment-gateway-client` and `fikashop_gateway`.

## TypeScript (`@fikashop/payment-gateway-client`)

```bash
cd packages/ts
npm run build
npm test
npm publish --access public   # after npm login + org setup
```

Before publishing:

1. Bump version in `packages/ts/package.json` (semver)
2. Ensure `dist/` matches `src/` (`npm test` enforces this in CI)
3. Add CHANGELOG entry for the release

**Monorepo consumers** can continue using a path dependency or git submodule without npm publish.

## Python (`fikashop_gateway`)

```bash
cd packages/python
python -m build
twine upload dist/*
```

Requires PyPI credentials and version bump in `pyproject.toml`.

## Per-customer delegation (not shipped)

The dashboard admin token (`FIKASHOP_ADMIN_ACCESS_TOKEN`) identifies the **business admin**, not arbitrary end-customers. Acting on a customer wallet without their OIDC session requires either:

- Your backend holding/proxying the user's refresh token (host responsibility), or
- A future dedicated service-account / delegation API (P3 — see `contracts/PRODUCTION.md`)

Do not use the admin token in mobile or web client bundles.
