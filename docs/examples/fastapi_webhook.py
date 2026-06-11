"""FastAPI example: fikashop payment webhook receiver."""

from __future__ import annotations

import os

import json

from fastapi import FastAPI, Header, Request, Response

from fikashop_gateway.handler import InMemoryWebhookHandler, process_payment_webhook

app = FastAPI()
handler = InMemoryWebhookHandler()
SECRET = os.environ.get("BILLING_WEBHOOK_SECRET", "")


@app.post("/billing/v1/webhooks/fikashop")
async def fikashop_webhook(
    request: Request,
    x_fikachu_signature: str | None = Header(default=None, alias="X-Fikachu-Signature"),
):
    raw_body = await request.body()
    result = process_payment_webhook(
        raw_body=raw_body,
        signature_header=x_fikachu_signature or "",
        secret=SECRET or None,
        handler=handler,
    )
    return Response(
        content=json.dumps(result.body),
        status_code=result.status_code,
        media_type="application/json",
    )
