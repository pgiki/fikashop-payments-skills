# Django webhook receiver example

A minimal Django view that receives fikashop unified webhook events, verifies the
signature, deduplicates by event ID, and routes to your business logic.

## View

```python
# views.py
import json
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from fikashop_gateway import (
    InMemoryUnifiedWebhookHandler,
    create_webhook_router,
    process_unified_webhook,
)

SECRET = os.environ.get("FIKASHOP_WEBHOOK_SECRET", "")
handler = InMemoryUnifiedWebhookHandler()

router = create_webhook_router(
    {
        "subscription.updated": lambda obj, _event: print("subscription active?", obj.get("active")),
        "subscription.past_due": lambda obj, _event: print("past due", obj.get("unpaid_invoices")),
        "wallet.deposit_succeeded": lambda obj, _event: print("wallet credited", obj.get("balance_after")),
        "invoice.payment_succeeded": lambda obj, _event: print("invoice paid", obj.get("invoice_uuid")),
        "payment.refunded": lambda obj, _event: print("refund", obj.get("refund_id")),
        "payment.failed": lambda obj, _event: print("payment failed", obj.get("failure_message")),
    }
)


@csrf_exempt
@require_POST
def fikashop_webhook(request):
    raw_body = request.body
    fikashop_signature = request.headers.get("Fikashop-Signature", "")

    result = process_unified_webhook(
        raw_body=raw_body,
        fikashop_signature=fikashop_signature,
        secret=SECRET or None,
        handler=handler,
        router=router,
    )

    return JsonResponse(result.body, status=result.status_code)
```

## URL conf

```python
# urls.py
from django.urls import path
from .views import fikashop_webhook

urlpatterns = [
    path("webhooks/fikashop/", fikashop_webhook),
]
```

## Key points

- **CSRF exempt** — webhook calls come from fikashop servers, not browsers.
- **Raw body** — pass `request.body` (bytes) to `process_unified_webhook`. Do not re-serialize JSON before HMAC verification.
- **Signature** — header `Fikashop-Signature: t={unix},v1={hex}` is verified against `{unix}.{raw_body}` using your webhook secret.
- **Deduplication** — `InMemoryUnifiedWebhookHandler` tracks seen event IDs in memory. For production, use a database or cache (e.g. Redis) with a TTL.
- **Response** — always return `200` for valid events. The handler returns the correct body and status code.

See [fastapi_webhook.py](fastapi_webhook.py) for an equivalent FastAPI example.
