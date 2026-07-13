from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from common.validators import HtmlStrippingModelMixin, https_url, normalize_us_phone

DayName = Literal["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]


class Address(HtmlStrippingModelMixin, BaseModel):
    street: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=80)
    state: str = Field(min_length=2, max_length=2)
    zip: str = Field(min_length=5, max_length=10)


class Hours(BaseModel):
    open: str = Field(pattern=r"^\d{2}:\d{2}$")
    close: str = Field(pattern=r"^\d{2}:\d{2}$")
    closed: bool = False


class SocialLinks(BaseModel):
    instagram: str | None = None
    facebook: str | None = None
    tiktok: str | None = None

    @field_validator("instagram", "facebook", "tiktok")
    @classmethod
    def validate_optional_social(cls, value: str | None) -> str | None:
        return https_url(value) if value else value


class BusinessSettingsPatch(HtmlStrippingModelMixin, BaseModel):
    businessName: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = None
    email: EmailStr | None = None
    address: Address | None = None
    hours: dict[DayName, Hours] | None = None
    socialLinks: SocialLinks | None = None
    googleMapsUrl: str | None = None
    googleReviewUrl: str | None = None
    announcementBanner: str | None = Field(default=None, max_length=200)
    bookingNotice: str | None = Field(default=None, max_length=300)
    founderImageUrl: str | None = None
    contactImageUrl: str | None = None
    blockedDates: list[str] | None = Field(
        default=None, description="ISO dates (YYYY-MM-DD) the salon is closed for one-off reasons"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return normalize_us_phone(value) if value else value

    @field_validator("googleMapsUrl", "googleReviewUrl", "founderImageUrl", "contactImageUrl")
    @classmethod
    def validate_urls(cls, value: str | None) -> str | None:
        return https_url(value) if value else value
