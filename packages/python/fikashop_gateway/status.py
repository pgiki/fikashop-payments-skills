"""Payment status normalization for fikashop webhook payloads."""

from __future__ import annotations

# Keep in sync with contracts/status-map.json (validated in tests/python/test_status_map.py).
FIKASHOP_STATUS_MAP: dict[str, str] = {
    "open": "pending",
    "pending": "pending",
    "processing": "pending",
    "unpaid": "pending",
    "preauth": "pending",
    "paid": "paid",
    "settled": "paid",
    "succeeded": "paid",
    "success": "paid",
    "completed": "paid",
    "confirmed": "paid",
    "failed": "failed",
    "failure": "failed",
    "error": "failed",
    "declined": "failed",
    "canceled": "failed",
    "cancelled": "failed",
    "void": "failed",
    "voided": "failed",
}


def normalize_payment_status(raw_status: str | None) -> str | None:
    key = str(raw_status or "").strip().lower()
    return FIKASHOP_STATUS_MAP.get(key)
