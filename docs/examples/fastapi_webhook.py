"""FastAPI example: fikashop unified webhook receiver with typed routing."""

from __future__ import annotations

import json
import os

from fastapi import FastAPI, Header, Request, Response

from fikashop_gateway import (
    InMemoryUnifiedWebhookHandler,
    create_webhook_router,
    process_unified_webhook,
)

app = FastAPI()
handler = InMemoryUnifiedWebhookHandler()
SECRET = os.environ.get("FIKASHOP_WEBHOOK_SECRET") or os.environ.get("BILLING_WEBHOOK_SECRET", "")

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


def _dispatch(event, payload: dict) -> None:
    router(event, payload)
    handler.handle_event(event, payload)


class _RoutingHandler:
    def is_duplicate(self, event_id: str) -> bool:
        return handler.is_duplicate(event_id)

    def mark_received(self, event, payload: dict) -> None:
        handler.mark_received(event, payload)

    def handle_event(self, event, payload: dict) -> None:
        _dispatch(event, payload)


routing_handler = _RoutingHandler()


@app.post("/webhooks/fikashop")
async def fikashop_webhook(
    request: Request,
    fikashop_signature: str | None = Header(default=None, alias="Fikashop-Signature"),
    x_fikachu_signature: str | None = Header(default=None, alias="X-Fikachu-Signature"),
):
    raw_body = await request.body()
    result = process_unified_webhook(
        raw_body=raw_body,
        fikashop_signature=fikashop_signature or "",
        legacy_signature=x_fikachu_signature or "",
        secret=SECRET or None,
        handler=routing_handler,
    )
    return Response(
        content=json.dumps(result.body),
        status_code=result.status_code,
        media_type="application/json",
    )
