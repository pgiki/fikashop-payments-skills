import json
from pathlib import Path

import pytest

from fikashop_gateway.status import FIKASHOP_STATUS_MAP, normalize_payment_status

STATUS_MAP_PATH = Path(__file__).resolve().parents[2] / "contracts" / "status-map.json"


@pytest.fixture
def status_map() -> dict:
    return json.loads(STATUS_MAP_PATH.read_text())


def test_webhook_normalize_matches_contract(status_map):
    assert FIKASHOP_STATUS_MAP == status_map["webhook_normalize"]


def test_normalize_payment_status_new_entries():
    assert normalize_payment_status("confirmed") == "paid"
    assert normalize_payment_status("preauth") == "pending"
