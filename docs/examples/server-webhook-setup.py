#!/usr/bin/env python3
"""
Register a webhook endpoint to receive fikashop payment and subscription events.

Requires the server admin token (FIKASHOP_ADMIN_ACCESS_TOKEN) — never run
this from client bundles (React Native, Expo, browser).

After registration, fikashop delivers Stripe-style event envelopes to your URL.
See fastapi_webhook.py or django_reference.md for receiver examples.
"""

from __future__ import annotations

import os
import sys

import requests

BASE_URL = os.environ.get("FIKASHOP_API_URL", "https://api.fikashop.app").rstrip("/")
ADMIN_TOKEN = os.environ.get("FIKASHOP_ADMIN_ACCESS_TOKEN", "")
PARTNER_CODE = os.environ.get("FIKASHOP_PARTNER_CODE", "")
WEBHOOK_URL = os.environ.get("FIKASHOP_WEBHOOK_URL", "https://your-app.example/webhooks/fikashop")
WEBHOOK_SECRET = os.environ.get("FIKASHOP_WEBHOOK_SECRET", "whsec_change_me")

ENDPOINTS_URL = f"{BASE_URL}/shop/api/admin/webhooks/endpoints/"


def headers() -> dict[str, str]:
    if not ADMIN_TOKEN:
        raise SystemExit("Set FIKASHOP_ADMIN_ACCESS_TOKEN (dashboard Settings → API keys)")
    if not PARTNER_CODE:
        raise SystemExit("Set FIKASHOP_PARTNER_CODE")
    return {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "Content-Type": "application/json",
        "X-Partner-Id": PARTNER_CODE,
    }


def register_webhook_endpoint() -> dict:
    """Register a webhook endpoint. Returns the created endpoint (no secret in response)."""
    payload = {
        "url": WEBHOOK_URL,
        "secret": WEBHOOK_SECRET,
        "enabled": True,
        "is_default": True,
        "subscribed_events": [],  # empty = all event types
    }
    resp = requests.post(ENDPOINTS_URL, json=payload, headers=headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    endpoint = register_webhook_endpoint()
    print(f"Registered webhook endpoint {endpoint['uuid']}")
    print(f"  URL: {endpoint['url']}")
    print(f"  Enabled: {endpoint['enabled']}")
    print(f"  Subscribed events: {endpoint['subscribed_events'] or '(all)'}")


if __name__ == "__main__":
    try:
        main()
    except requests.HTTPError as exc:
        print(exc.response.text if exc.response is not None else exc, file=sys.stderr)
        raise
