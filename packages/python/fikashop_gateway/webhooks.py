"""Fikashop unified webhook verification and parsing."""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import time
from typing import Any

UNIFIED_SIGNATURE_HEADER = "Fikashop-Signature"


def compute_unified_fikashop_signature(secret: str, timestamp: int, raw_body: bytes) -> str:
    signed = f"{timestamp}.".encode("utf-8") + raw_body
    return hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()


def verify_unified_fikashop_signature(
    secret: str,
    raw_body: bytes,
    header_value: str,
    *,
    tolerance_seconds: int = 300,
) -> bool:
    if not secret:
        return True
    if not header_value:
        return False
    match = re.match(r"^t=(\d+),v1=([a-f0-9]{64})$", header_value.strip())
    if not match:
        return False
    timestamp = int(match.group(1))
    provided = match.group(2)
    if abs(int(time.time()) - timestamp) > tolerance_seconds:
        return False
    expected = compute_unified_fikashop_signature(secret, timestamp, raw_body)
    return hmac.compare_digest(provided, expected)


def derive_event_id(payload: dict[str, Any], raw_body: bytes) -> str:
    if payload.get("id") and payload.get("type"):
        return str(payload["id"]).strip()
    for key in ("event_id", "webhook_id", "delivery_id"):
        raw = payload.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    event = payload.get("event")
    if isinstance(event, dict) and event.get("id"):
        return str(event["id"]).strip()
    digest = hashlib.sha256(raw_body).hexdigest()
    return f"sha256:{digest}"


def parse_json_body(raw_body: bytes) -> dict[str, Any]:
    data = json.loads(raw_body.decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Webhook body must be a JSON object")
    return data
