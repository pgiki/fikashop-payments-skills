import json
import time
from pathlib import Path

from fikashop_gateway.webhooks import (
    compute_unified_fikashop_signature,
    verify_unified_fikashop_signature,
)

FIXTURES = Path(__file__).resolve().parents[2] / "contracts" / "fixtures"


def test_unified_signature_roundtrip():
    body = b'{"id":"evt_1","type":"payment.succeeded"}'
    secret = "test-secret"
    ts = int(time.time())
    digest = compute_unified_fikashop_signature(secret, ts, body)
    header = f"t={ts},v1={digest}"
    assert verify_unified_fikashop_signature(secret, body, header)
    assert not verify_unified_fikashop_signature(secret, body, "t=1,v1=" + ("0" * 64))


def test_unified_signature_fixture_body():
    payload = json.loads((FIXTURES / "webhook-event-envelope.json").read_text())
    body = json.dumps(payload, separators=(",", ":")).encode()
    secret = "test-secret"
    ts = int(time.time())
    digest = compute_unified_fikashop_signature(secret, ts, body)
    assert verify_unified_fikashop_signature(secret, body, f"t={ts},v1={digest}")
