from __future__ import annotations

import re
from typing import Any

from aws_lambda_powertools import Logger

PII_FIELD_NAMES = {
    "clientEmail",
    "clientPhone",
    "email",
    "phone",
    "client_email",
    "client_phone",
    "to",
    "toAddress",
}

EMAIL_RE = re.compile(r"(^.).*(@.*$)")
PHONE_RE = re.compile(r"\d(?=\d{2})")


def redact_value(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    if "@" in value:
        return EMAIL_RE.sub(r"\1***\2", value)
    if any(char.isdigit() for char in value):
        return PHONE_RE.sub("*", value)
    return value


def redact_pii(payload: Any) -> Any:
    if isinstance(payload, dict):
        return {key: "[REDACTED]" if key in PII_FIELD_NAMES else redact_pii(value) for key, value in payload.items()}
    if isinstance(payload, list):
        return [redact_pii(value) for value in payload]
    return redact_value(payload)


logger = Logger(service="braids-by-deb")


def safe_extra(extra: dict[str, Any] | None) -> dict[str, Any] | None:
    return redact_pii(extra) if extra else extra
