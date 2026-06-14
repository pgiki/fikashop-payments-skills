"""Route unified webhook envelopes to typed handlers."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fikashop_gateway.unified_handler import UnifiedWebhookEvent

WebhookHandler = Callable[[dict[str, Any], UnifiedWebhookEvent], None]

WEBHOOK_EVENT_TYPES = (
    "payment.created",
    "payment.processing",
    "payment.succeeded",
    "payment.failed",
    "payment.cancelled",
    "payment.refunded",
    "invoice.created",
    "invoice.updated",
    "invoice.cancelled",
    "invoice.payment_succeeded",
    "invoice.settlement_posted",
    "invoice.settlement_failed",
    "wallet.deposit_succeeded",
    "subscription.created",
    "subscription.updated",
    "subscription.cancelled",
    "subscription.past_due",
)


def create_webhook_router(
    handlers: dict[str, WebhookHandler],
) -> Callable[[UnifiedWebhookEvent, dict[str, Any]], bool]:
    """Return a callable that dispatches by ``event.event_type``."""

    def route(event: UnifiedWebhookEvent, payload: dict[str, Any]) -> bool:
        handler = handlers.get(event.event_type)
        if handler is None:
            return False
        handler(dict(event.data_object), event)
        return True

    return route
