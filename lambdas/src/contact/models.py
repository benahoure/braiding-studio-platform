from __future__ import annotations

import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from common.validators import HtmlStrippingModelMixin, normalize_us_phone

_MAX_SERVICE_ITEMS = 20
_MAX_SERVICE_LEN = 60
_SAFE_INSPIRATION_PHOTO_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._ -]{0,119}$")
_ALLOWED_INSPIRATION_PHOTO_EXTENSIONS = {".heic", ".heif", ".jpeg", ".jpg", ".png", ".webp"}


class ContactRequest(HtmlStrippingModelMixin, BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr | None = None
    phone: str = Field(min_length=7, max_length=20)
    message: str = Field(min_length=10, max_length=1000)
    services: list[str] = Field(default_factory=list)
    inspirationPhotoName: str | None = Field(default=None, max_length=120)
    honeypot: str = Field(default="", exclude=True)

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_us_phone(value)

    @field_validator("services", mode="before")
    @classmethod
    def validate_services(cls, value: list) -> list[str]:
        if not isinstance(value, list):
            raise ValueError("services must be a list")
        if len(value) > _MAX_SERVICE_ITEMS:
            raise ValueError(f"Too many services selected (max {_MAX_SERVICE_ITEMS}).")
        return [str(s)[:_MAX_SERVICE_LEN] for s in value]

    @field_validator("inspirationPhotoName", mode="after")
    @classmethod
    def validate_inspiration_photo_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            return None
        if "/" in trimmed or "\\" in trimmed or ".." in trimmed:
            raise ValueError("Invalid inspiration photo name.")
        if not _SAFE_INSPIRATION_PHOTO_RE.fullmatch(trimmed):
            raise ValueError("Invalid inspiration photo name.")
        extension = f".{trimmed.rsplit('.', 1)[1].lower()}" if "." in trimmed else ""
        if extension not in _ALLOWED_INSPIRATION_PHOTO_EXTENSIONS:
            raise ValueError("Unsupported inspiration photo type.")
        return trimmed
