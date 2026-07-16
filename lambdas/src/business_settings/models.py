from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

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


class BlockedSlot(BaseModel):
    """A partial-day time block — the admin is unavailable date start–end."""

    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    start: str = Field(pattern=r"^\d{2}:\d{2}$")
    end: str = Field(pattern=r"^\d{2}:\d{2}$")

    @model_validator(mode="after")
    def validate_range(self) -> BlockedSlot:
        if self.end <= self.start:
            raise ValueError("end must be after start")
        return self


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
    storyImageUrl: str | None = None  # About page "Her Story" photo
    blockedDates: list[str] | None = Field(
        default=None, description="ISO dates (YYYY-MM-DD) the salon is closed for one-off reasons"
    )
    blockedSlots: list[BlockedSlot] | None = Field(
        default=None,
        max_length=200,
        description="Partial-day time blocks (date + start–end) when the salon is unavailable",
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return normalize_us_phone(value) if value else value

    @field_validator("googleMapsUrl", "googleReviewUrl", "founderImageUrl", "contactImageUrl", "storyImageUrl")
    @classmethod
    def validate_urls(cls, value: str | None) -> str | None:
        return https_url(value) if value else value
