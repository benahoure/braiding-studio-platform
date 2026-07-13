from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse

from pydantic import field_validator


def strip_html(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value).strip()


def normalize_us_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    raise ValueError("Phone must be a valid US phone number.")


def public_display_name(value: str) -> str:
    clean = strip_html(value)
    parts = clean.split()
    if len(parts) >= 2:
        return f"{parts[0]} {parts[-1][0].upper()}."
    return clean


def https_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("URL must be an HTTPS URL.")
    return value


class HtmlStrippingModelMixin:
    @field_validator("*", mode="before")
    @classmethod
    def strip_strings(cls, value: Any) -> Any:
        if isinstance(value, str):
            return strip_html(value)
        return value
