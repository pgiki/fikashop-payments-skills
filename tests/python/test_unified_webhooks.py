import json
import time
from pathlib import Path

import pytest

from fikashop_gateway import (
    InMemoryUnifiedWebhookHandler,
    create_webhook_router,
    extract_invoice_reference,
    parse_unified_webhook,
    process_unified_webhook,
)
from fikashop_gateway.webhooks import compute_unified_fikashop_signature

FIXTURES = Path(__file__).resolve().parents[2] / "contracts" / "fixtures"


def test_parse_unified_webhook_fixture():
    payload = json.loads((FIXTURES / "webhook-event-envelope.json").read_text())
    body = json.dumps(payload, separators=(",", ":")).encode()
    event = parse_unified_webhook(payload, body)
    assert event.event_type == "payment.succeeded"
    assert event.event_id.startswith("evt_")
    assert extract_invoice_reference(event) == "ext-inv-rider-8842"


def test_create_webhook_router_dispatches_subscription_event():
    payload = json.loads((FIXTURES / "webhook-subscription-updated.json").read_text())
    body = json.dumps(payload, separators=(",", ":")).encode()
    event = parse_unified_webhook(payload, body)
    seen: list[str] = []

    def on_updated(obj, ev):
        seen.append(str(obj.get("subscription_id")))

    route = create_webhook_router({"subscription.updated": on_updated})
    assert route(event, payload) is True
    assert seen == ["c3d4e5f6-a7b8-9012-cdef-123456789012"]


def test_process_unified_webhook_verifies_signature():
    payload = json.loads((FIXTURES / "webhook-event-envelope.json").read_text())
    body = json.dumps(payload, separators=(",", ":")).encode()
    ts = int(time.time())
    sig = compute_unified_fikashop_signature("test-secret", ts, body)
    header = f"t={ts},v1={sig}"
    handler = InMemoryUnifiedWebhookHandler()
    result = process_unified_webhook(
        raw_body=body,
        fikashop_signature=header,
        legacy_signature="",
        secret="test-secret",
        handler=handler,
    )
    assert result.status_code == 200
    assert handler.events[0][0] == "payment.succeeded"
