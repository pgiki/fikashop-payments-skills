"""Framework-agnostic webhook result type."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class WebhookResult:
    status_code: int
    body: dict[str, Any]
