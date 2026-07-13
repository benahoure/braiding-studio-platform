from __future__ import annotations

import datetime as dt
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, EmailStr, Field, field_validator

from common.validators import HtmlStrippingModelMixin, normalize_us_phone

SALON_TZ = ZoneInfo("America/Chicago")
DEPOSIT_AMOUNT_CENTS = 2000
POLICY_VERSION = "2026-05-31"
DEFAULT_DURATION_MINUTES = 180  # fallback for services without an explicit duration

DepositStatus = Literal["paid", "refund_pending", "refunded", "forfeited", "transferred", "applied_to_balance"]
AppointmentStatus = Literal["pending_payment", "pending", "confirmed", "cancelled", "completed", "no_show"]


def _salon_today() -> dt.date:
    return dt.datetime.now(SALON_TZ).date()


def appointment_datetime_chicago(preferred_date: str, preferred_time: str) -> dt.datetime:
    """Combine stored date + time strings into a timezone-aware datetime in Chicago time."""
    d = dt.date.fromisoformat(preferred_date)
    hour, minute = (int(p) for p in preferred_time.split(":"))
    return dt.datetime(d.year, d.month, d.day, hour, minute, tzinfo=SALON_TZ)


def is_within_24hrs(preferred_date: str, preferred_time: str) -> bool:
    """Backend enforcement: true when appointment starts within 24 hours from now (Chicago TZ)."""
    appt_dt = appointment_datetime_chicago(preferred_date, preferred_time)
    now_chicago = dt.datetime.now(SALON_TZ)
    return (appt_dt - now_chicago).total_seconds() < 86_400


class PaymentIntentRequest(HtmlStrippingModelMixin, BaseModel):
    """Step 1 of booking: creates a PENDING_PAYMENT hold and returns a Stripe clientSecret."""

    serviceId: str = Field(min_length=1, max_length=80)
    portfolioStyleId: str | None = Field(default=None, max_length=120)
    clientName: str = Field(min_length=2, max_length=100)
    clientEmail: EmailStr
    clientPhone: str = Field(min_length=7, max_length=20)
    preferredDate: dt.date
    preferredTime: str = Field(pattern=r"^\d{2}:\d{2}$")
    notes: str = Field(default="", max_length=500)
    referralSource: Literal["instagram", "tiktok", "google", "yelp", "friend", "other", ""] = ""
    policyAccepted: bool
    honeypot: str = Field(default="", exclude=True)

    @field_validator("clientPhone", mode="before")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_us_phone(value)

    @field_validator("preferredDate", mode="after")
    @classmethod
    def validate_future_date(cls, value: dt.date | None) -> dt.date | None:
        if value is None:
            return value
        today = _salon_today()
        if value <= today:
            raise ValueError("Date must be at least 1 day in the future.")
        if value > today + dt.timedelta(days=90):
            raise ValueError("Date must be within the next 90 days.")
        return value

    @field_validator("preferredTime", mode="after")
    @classmethod
    def validate_business_hours(cls, value: str) -> str:
        hour = int(value.split(":")[0])
        if not 8 <= hour <= 20:
            raise ValueError("Preferred time must be between 8:00 AM and 8:00 PM.")
        return value

    @field_validator("policyAccepted", mode="after")
    @classmethod
    def must_accept_policy(cls, value: bool) -> bool:
        if not value:
            raise ValueError("You must accept the booking policy to continue.")
        return value


class ConfirmAppointmentRequest(BaseModel):
    """Step 2 of booking: called by frontend after Stripe payment succeeds."""

    stripePaymentIntentId: str = Field(min_length=1, max_length=200)


class RescheduleRequest(BaseModel):
    preferredDate: dt.date
    preferredTime: str = Field(pattern=r"^\d{2}:\d{2}$")

    @field_validator("preferredDate", mode="after")
    @classmethod
    def validate_future_date(cls, value: dt.date) -> dt.date:
        today = dt.datetime.now(SALON_TZ).date()
        if value <= today:
            raise ValueError("Date must be at least 1 day in the future.")
        if value > today + dt.timedelta(days=90):
            raise ValueError("Date must be within the next 90 days.")
        return value

    @field_validator("preferredTime", mode="after")
    @classmethod
    def validate_business_hours(cls, value: str) -> str:
        hour = int(value.split(":")[0])
        if not 8 <= hour <= 20:
            raise ValueError("Preferred time must be between 8:00 AM and 8:00 PM.")
        return value


# Keep the old name as an alias so any existing callers don't break during transition
AppointmentRequest = PaymentIntentRequest
