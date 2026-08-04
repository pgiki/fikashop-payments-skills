"""Unified (Stripe-style) fikashop webhook processing."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from fikashop_gateway.handler import WebhookResult
from fikashop_gateway.webhooks import (
    derive_event_id,
    parse_json_body,
    verify_unified_fikashop_signature,
)


@dataclass(frozen=True)
class UnifiedWebhookEvent:
    event_id: str
    event_type: str
    data_object: dict[str, Any]


class UnifiedWebhookHandler(Protocol):
    def is_duplicate(self, event_id: str) -> bool: ...

    def mark_received(self, event: UnifiedWebhookEvent, payload: dict[str, Any]) -> None: ...

    def handle_event(self, event: UnifiedWebhookEvent, payload: dict[str, Any]) -> None: ...


def parse_unified_webhook(payload: dict[str, Any], raw_body: bytes) -> UnifiedWebhookEvent:
    event_type = str(payload.get("type") or "").strip()
    data = payload.get("data")
    obj: dict[str, Any] = {}
    if isinstance(data, dict) and isinstance(data.get("object"), dict):
        obj = data["object"]
    return UnifiedWebhookEvent(
        event_id=derive_event_id(payload, raw_body),
        event_type=event_type,
        data_object=obj,
    )


def extract_invoice_reference(event: UnifiedWebhookEvent) -> str:
    for key in ("external_invoice_reference", "invoice_uuid", "invoice_id", "id"):
        raw = event.data_object.get(key)
        if raw is not None and str(raw).strip():
            return str(raw).strip()
    return ""


def process_unified_webhook(
    *,
    raw_body: bytes,
    fikashop_signature: str,
    secret: str | None,
    handler: UnifiedWebhookHandler,
) -> WebhookResult:
    if secret:
        if not fikashop_signature:
            return WebhookResult(403, {"detail": "Missing webhook signature."})
        if not verify_unified_fikashop_signature(secret, raw_body, fikashop_signature):
            return WebhookResult(403, {"detail": "Invalid webhook signature."})

    payload = parse_json_body(raw_body)
    event = parse_unified_webhook(payload, raw_body)

    if not event.event_type:
        return WebhookResult(400, {"detail": "type required"})

    if handler.is_duplicate(event.event_id):
        return WebhookResult(200, {"received": True, "duplicate": True})

    handler.mark_received(event, payload)
    handler.handle_event(event, payload)
    return WebhookResult(200, {"received": True})


class InMemoryUnifiedWebhookHandler:
    """Reference handler for tests and examples."""

    def __init__(self) -> None:
        self.seen_event_ids: set[str] = set()
        self.events: list[tuple[str, dict[str, Any]]] = []

    def is_duplicate(self, event_id: str) -> bool:
        return event_id in self.seen_event_ids

    def mark_received(self, event: UnifiedWebhookEvent, payload: dict[str, Any]) -> None:
        self.seen_event_ids.add(event.event_id)

    def handle_event(self, event: UnifiedWebhookEvent, payload: dict[str, Any]) -> None:
        self.events.append((event.event_type, dict(event.data_object)))
