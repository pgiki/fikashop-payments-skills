"""Framework-agnostic payment webhook processing."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from fikashop_gateway.webhooks import (
    PaymentWebhookEvent,
    parse_json_body,
    parse_payment_webhook,
    verify_fikashop_signature,
)


class PaymentWebhookHandler(Protocol):
    def is_duplicate(self, event_id: str) -> bool: ...

    def mark_received(self, event: PaymentWebhookEvent, payload: dict[str, Any]) -> None: ...

    def apply_payment_status(self, invoice_id: str, status: str, payload: dict[str, Any]) -> None: ...


@dataclass
class WebhookResult:
    status_code: int
    body: dict[str, Any]


def process_payment_webhook(
    *,
    raw_body: bytes,
    signature_header: str,
    secret: str | None,
    handler: PaymentWebhookHandler,
) -> WebhookResult:
    if secret and not verify_fikashop_signature(secret, raw_body, signature_header):
        if not signature_header:
            return WebhookResult(403, {"detail": "Missing webhook signature."})
        return WebhookResult(403, {"detail": "Invalid webhook signature."})

    payload = parse_json_body(raw_body)
    event = parse_payment_webhook(payload, raw_body)

    if not event.invoice_id:
        handler.mark_received(event, payload)
        return WebhookResult(400, {"detail": "invoice_id required"})

    if handler.is_duplicate(event.event_id):
        return WebhookResult(200, {"received": True, "duplicate": True})

    handler.mark_received(event, payload)

    if event.normalized_status is None:
        return WebhookResult(200, {"received": True})

    handler.apply_payment_status(event.invoice_id, event.normalized_status, payload)
    return WebhookResult(200, {"received": True})


class InMemoryWebhookHandler:
    """Reference handler for tests and examples."""

    def __init__(self) -> None:
        self.seen_event_ids: set[str] = set()
        self.payments: dict[str, str] = {}

    def is_duplicate(self, event_id: str) -> bool:
        return event_id in self.seen_event_ids

    def mark_received(self, event: PaymentWebhookEvent, payload: dict[str, Any]) -> None:
        self.seen_event_ids.add(event.event_id)

    def apply_payment_status(self, invoice_id: str, status: str, payload: dict[str, Any]) -> None:
        self.payments[invoice_id] = status
