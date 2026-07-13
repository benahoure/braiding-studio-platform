from __future__ import annotations

import datetime as dt

import pytest


def test_appointment_validation_normalizes_phone() -> None:
    from appointments.models import AppointmentRequest

    request = AppointmentRequest.model_validate(
        {
            "serviceId": "svc-knotless-braids",
            "portfolioStyleId": "style-boho-waist-length",
            "clientName": "Amara Test",
            "clientEmail": "amara@example.com",
            "clientPhone": "(317) 555-0123",
            "preferredDate": (dt.date.today() + dt.timedelta(days=2)).isoformat(),
            "preferredTime": "10:00",
            "policyAccepted": True,
            "honeypot": "",
        }
    )

    assert request.clientPhone == "+13175550123"
    assert request.portfolioStyleId == "style-boho-waist-length"


def test_appointment_validation_rejects_past_date() -> None:
    from appointments.models import AppointmentRequest

    with pytest.raises(ValueError, match="Date must be"):
        AppointmentRequest.model_validate(
            {
                "serviceId": "svc-knotless-braids",
                "clientName": "Amara Test",
                "clientEmail": "amara@example.com",
                "clientPhone": "3175550123",
                "preferredDate": (dt.date.today() - dt.timedelta(days=1)).isoformat(),
                "preferredTime": "10:00",
            }
        )


def test_appointment_validation_uses_salon_timezone_today(monkeypatch) -> None:
    from appointments import models
    from appointments.models import AppointmentRequest

    monkeypatch.setattr(models, "_salon_today", lambda: dt.date(2026, 5, 27))

    request = AppointmentRequest.model_validate(
        {
            "serviceId": "svc-knotless-braids",
            "clientName": "Amara Test",
            "clientEmail": "amara@example.com",
            "clientPhone": "3175550123",
            "preferredDate": "2026-05-28",
            "preferredTime": "10:00",
            "policyAccepted": True,
            "honeypot": "",
        }
    )

    assert request.preferredDate == dt.date(2026, 5, 28)


def test_contact_validation_accepts_optional_email_required_phone_and_photo_name() -> None:
    from contact.models import ContactRequest

    request = ContactRequest.model_validate(
        {
            "name": "Amara Test",
            "phone": "(317) 555-0123",
            "message": "I would like help choosing a protective style.",
            "services": ["Knotless Braids"],
            "inspirationPhotoName": "inspiration-look.webp",
            "honeypot": "",
        }
    )

    assert request.email is None
    assert request.phone == "+13175550123"
    assert request.inspirationPhotoName == "inspiration-look.webp"


def test_contact_validation_rejects_missing_phone() -> None:
    from contact.models import ContactRequest

    with pytest.raises(ValueError, match="phone"):
        ContactRequest.model_validate(
            {
                "name": "Amara Test",
                "email": "amara@example.com",
                "message": "I would like help choosing a protective style.",
                "services": ["Knotless Braids"],
                "honeypot": "",
            }
        )


def test_contact_validation_rejects_unsafe_photo_name() -> None:
    from contact.models import ContactRequest

    with pytest.raises(ValueError, match="Invalid inspiration photo name"):
        ContactRequest.model_validate(
            {
                "name": "Amara Test",
                "phone": "3175550123",
                "message": "I would like help choosing a protective style.",
                "services": ["Knotless Braids"],
                "inspirationPhotoName": "../private.png",
                "honeypot": "",
            }
        )
