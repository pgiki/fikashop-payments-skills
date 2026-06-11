import hashlib
import hmac
import json

import pytest

from fikashop_gateway.handler import InMemoryWebhookHandler, process_payment_webhook
from fikashop_gateway.status import normalize_payment_status
from fikashop_gateway.webhooks import (
    compute_fikashop_signature,
    derive_event_id,
    parse_payment_webhook,
    verify_fikashop_signature,
)


def test_normalize_payment_status():
    assert normalize_payment_status("paid") == "paid"
    assert normalize_payment_status("SETTLED") == "paid"
    assert normalize_payment_status("processing") == "pending"
    assert normalize_payment_status("unknown_xyz") is None


def test_derive_event_id_uses_explicit_event_id():
    payload = {"event_id": "evt-1", "invoice_id": "inv-1", "status": "paid"}
    body = json.dumps(payload).encode()
    assert derive_event_id(payload, body) == "evt-1"


def test_compute_and_verify_signature():
    secret = "test-secret"
    body = b'{"invoice_id": "inv-1", "status": "paid"}'
    sig = compute_fikashop_signature(secret, body)
    assert verify_fikashop_signature(secret, body, sig)
    assert not verify_fikashop_signature(secret, body, "invalid")


def test_process_webhook_rejects_missing_signature_when_secret_set():
    handler = InMemoryWebhookHandler()
    body = json.dumps({"invoice_id": "inv-1", "status": "paid"}).encode()
    result = process_payment_webhook(
        raw_body=body,
        signature_header="",
        secret="test-secret",
        handler=handler,
    )
    assert result.status_code == 403


def test_process_webhook_rejects_invalid_signature():
    handler = InMemoryWebhookHandler()
    body = json.dumps({"invoice_id": "inv-1", "status": "paid"}).encode()
    result = process_payment_webhook(
        raw_body=body,
        signature_header="invalid",
        secret="test-secret",
        handler=handler,
    )
    assert result.status_code == 403


def test_process_webhook_accepts_valid_signature():
    handler = InMemoryWebhookHandler()
    payload = {"invoice_id": "inv-1", "status": "pending"}
    body = json.dumps(payload).encode()
    sig = hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    result = process_payment_webhook(
        raw_body=body,
        signature_header=sig,
        secret="test-secret",
        handler=handler,
    )
    assert result.status_code == 200
    assert result.body["received"] is True


def test_process_webhook_applies_paid_status():
    handler = InMemoryWebhookHandler()
    payload = {"invoice_id": "ext-inv-rider-1", "status": "paid"}
    body = json.dumps(payload).encode()
    result = process_payment_webhook(
        raw_body=body,
        signature_header="",
        secret=None,
        handler=handler,
    )
    assert result.status_code == 200
    assert handler.payments["ext-inv-rider-1"] == "paid"


def test_process_webhook_duplicate_is_safe():
    handler = InMemoryWebhookHandler()
    payload = {"event_id": "evt-dup", "invoice_id": "inv-2", "status": "paid"}
    body = json.dumps(payload).encode()
    first = process_payment_webhook(
        raw_body=body, signature_header="", secret=None, handler=handler
    )
    second = process_payment_webhook(
        raw_body=body, signature_header="", secret=None, handler=handler
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.body.get("duplicate") is True


def test_parse_payment_webhook():
    payload = {"invoice_id": "x", "status": "paid"}
    body = json.dumps(payload).encode()
    event = parse_payment_webhook(payload, body)
    assert event.invoice_id == "x"
    assert event.normalized_status == "paid"
