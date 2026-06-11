# Django reference (fikachu-api)

Production webhook: `fikachu-api/billing/views.py` → `FikashopWebhookView`  
URL: `POST /billing/v1/webhooks/fikashop`  
Tests: `fikachu-api/tests/test_billing_webhook.py`

This repo's `packages/python/fikashop_gateway` extracts signature verification and status normalization for use outside Django. Implement `apply_payment_status` for your own models — see [contracts/REFERENCE.md](../../contracts/REFERENCE.md#5-webhooks-host-server).
