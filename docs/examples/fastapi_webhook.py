"""FastAPI example: fikashop unified webhook receiver (preferred)."""

from __future__ import annotations

import json
import os

from fastapi import FastAPI, Header, Request, Response

from fikashop_gateway import InMemoryUnifiedWebhookHandler, process_unified_webhook

app = FastAPI()
handler = InMemoryUnifiedWebhookHandler()
SECRET = os.environ.get("BILLING_WEBHOOK_SECRET", "")


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
        handler=handler,
    )
    return Response(
        content=json.dumps(result.body),
        status_code=result.status_code,
        media_type="application/json",
    )
