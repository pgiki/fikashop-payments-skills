"""Fikashop payment webhook verification and parsing."""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any

from fikashop_gateway.status import normalize_payment_status

SIGNATURE_HEADER = "X-Fikachu-Signature"


def compute_fikashop_signature(secret: str, raw_body: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()


def verify_fikashop_signature(secret: str, raw_body: bytes, provided_sig: str) -> bool:
    if not secret:
        return True
    if not provided_sig:
        return False
    expected = compute_fikashop_signature(secret, raw_body)
    return hmac.compare_digest(provided_sig, expected)


def derive_event_id(payload: dict[str, Any], raw_body: bytes) -> str:
    for key in ("event_id", "webhook_id", "delivery_id"):
        raw = payload.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    event = payload.get("event")
    if isinstance(event, dict) and event.get("id"):
        return str(event["id"]).strip()
    invoice_id = str(payload.get("invoice_id") or payload.get("id") or "").strip()
    raw_status = str(payload.get("status") or "").strip().lower()
    digest = hashlib.sha256(raw_body).hexdigest()
    return f"invoice:{invoice_id}:status:{raw_status}:sha256:{digest}"


@dataclass(frozen=True)
class PaymentWebhookEvent:
    event_id: str
    invoice_id: str
    raw_status: str
    normalized_status: str | None


def parse_payment_webhook(payload: dict[str, Any], raw_body: bytes) -> PaymentWebhookEvent:
    invoice_raw = payload.get("invoice_id") or payload.get("id")
    invoice_id = str(invoice_raw or "").strip()
    raw_status = str(payload.get("status") or "").strip()
    return PaymentWebhookEvent(
        event_id=derive_event_id(payload, raw_body),
        invoice_id=invoice_id,
        raw_status=raw_status,
        normalized_status=normalize_payment_status(raw_status),
    )


def parse_json_body(raw_body: bytes) -> dict[str, Any]:
    data = json.loads(raw_body.decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Webhook body must be a JSON object")
    return data
