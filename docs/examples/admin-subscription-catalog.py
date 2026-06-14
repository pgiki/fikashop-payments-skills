#!/usr/bin/env python3
"""Admin subscription catalog example — server-only (admin token + X-Partner-Id)."""

from __future__ import annotations

import os
import sys

import requests

BASE_URL = os.environ.get("FIKASHOP_API_URL", "https://api.fikashop.app").rstrip("/")
ADMIN_TOKEN = os.environ.get("FIKASHOP_ADMIN_ACCESS_TOKEN", "")
PARTNER_CODE = os.environ.get("FIKASHOP_PARTNER_CODE", "")

PLANS_URL = f"{BASE_URL}/shop/api/admin/subscription-plans/"


def headers() -> dict[str, str]:
    if not ADMIN_TOKEN:
        raise SystemExit("Set FIKASHOP_ADMIN_ACCESS_TOKEN")
    if not PARTNER_CODE:
        raise SystemExit("Set FIKASHOP_PARTNER_CODE")
    return {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "Content-Type": "application/json",
        "X-Partner-Id": PARTNER_CODE,
    }


def main() -> None:
    payload = {
        "slug": "enterprise",
        "plan_name": "Enterprise",
        "tags": ["enterprise"],
        "costs": [
            {
                "slug": "enterprise-monthly",
                "recurrence_unit": "month",
                "cost": "50000.0000",
                "currency": "TZS",
            }
        ],
        "features": [
            {"code": "sms_outbound", "feature_type": "quota", "quota": 500},
        ],
    }
    resp = requests.post(PLANS_URL, json=payload, headers=headers(), timeout=30)
    resp.raise_for_status()
    plan = resp.json()
    plan_id = plan["id"]
    print(f"Created plan {plan_id}")

    patch = {
        "costs": [{"slug": "enterprise-monthly", "cost": "55000.0000"}],
        "features": [{"code": "sms_outbound", "quota": 1000}],
    }
    patch_resp = requests.patch(
        f"{PLANS_URL}{plan_id}/",
        json=patch,
        headers=headers(),
        timeout=30,
    )
    patch_resp.raise_for_status()
    print("Patched plan costs and features")


if __name__ == "__main__":
    try:
        main()
    except requests.HTTPError as exc:
        print(exc.response.text if exc.response is not None else exc, file=sys.stderr)
        raise
