from __future__ import annotations

import datetime as dt

from boto3.dynamodb.conditions import Attr

from appointments.models import (
    DEFAULT_DURATION_MINUTES,
    DEPOSIT_AMOUNT_CENTS,
    RescheduleRequest,
    is_within_24hrs,
)
from common.config import get_config
from common.dynamo import put_item, query_index, scan_items, update_item
from common.email_layout import ACCENT_CANCELLED, ACCENT_RESCHEDULED
from common.email_layout import admin_details_table as _admin_details_table
from common.email_layout import admin_email_layout as _admin_email_layout
from common.email_layout import details_table as _details_table
from common.email_layout import email_layout as _email_layout
from common.errors import NotFoundError
from common.ids import new_id, ttl_days, utc_now, utc_now_epoch
from common.logger import logger
from common.security import decrypt_pii
from common.ses_client import best_effort_send_email, notify_admin
from common.stripe_client import create_refund

WITHIN_24H_MESSAGE = (
    "Online cancellation and rescheduling are not available within 24 hours of your appointment. "
    "Please contact the salon directly for emergency situations. "
    "Deposits may be forfeited according to our cancellation policy."
)


def _format_date(value: str) -> str:
    d = dt.date.fromisoformat(value)
    return d.strftime("%A, %B %-d, %Y")


def _format_time(value: str) -> str:
    hour, minute = (int(p) for p in value.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute:02d} {suffix}"


def _slot_is_available_for_reschedule(
    preferred_date: str,
    preferred_time: str,
    duration_minutes: int = DEFAULT_DURATION_MINUTES,
    exclude_id: str | None = None,
) -> bool:
    """Overlap-aware slot check for reschedules. Excludes the appointment being moved."""
    now_epoch = utc_now_epoch()
    config = get_config()

    parts = preferred_time.split(":")
    new_start = int(parts[0]) * 60 + (int(parts[1]) if len(parts) > 1 else 0)
    new_end = new_start + duration_minutes

    items, _ = scan_items(
        config.table_appointments,
        filter_expression=Attr("preferredDate").eq(preferred_date),
        limit=50,
    )
    for item in items:
        if exclude_id and item.get("appointmentId") == exclude_id:
            continue

        status = item.get("status", "")
        active = False
        if status == "pending_payment":
            expires_at = item.get("expiresAt")
            if expires_at is not None and int(expires_at) > now_epoch:
                active = True
        elif status in {"pending", "confirmed"}:
            active = True

        if not active:
            continue

        existing_time = item.get("preferredTime", "")
        if not existing_time:
            continue
        ex_parts = existing_time.split(":")
        ex_start = int(ex_parts[0]) * 60 + (int(ex_parts[1]) if len(ex_parts) > 1 else 0)
        ex_dur = int(item.get("serviceDurationMinutes", DEFAULT_DURATION_MINUTES))
        ex_end = ex_start + ex_dur

        if new_start < ex_end and ex_start < new_end:
            return False

    return True


def _get_by_token(token: str) -> dict | None:
    items, _ = query_index(
        get_config().table_appointments,
        index_name="token-index",
        pk_name="appointmentToken",
        pk_value=token,
        limit=1,
    )
    return items[0] if items else None


def _safe_appointment(appt: dict) -> dict:
    """Return a portal-safe view of the appointment (decrypted PII, no internal fields)."""
    service_price = int(appt.get("servicePrice", 0))
    deposit = int(appt.get("depositAmount", DEPOSIT_AMOUNT_CENTS))
    remaining = max(0, service_price - deposit)

    return {
        "appointmentId": appt["appointmentId"],
        "status": appt.get("status"),
        "depositStatus": appt.get("depositStatus"),
        "depositAmount": deposit,
        "remainingBalance": remaining,
        "serviceId": appt.get("serviceId"),
        "serviceName": appt.get("serviceName"),
        "lengthLabel": appt.get("lengthLabel"),
        "servicePrice": service_price,
        "preferredDate": appt.get("preferredDate"),
        "preferredTime": appt.get("preferredTime"),
        "clientName": appt.get("clientName"),
        "clientEmail": decrypt_pii(appt.get("clientEmail", "")),
        "clientPhone": decrypt_pii(appt.get("clientPhone", "")),
        "notes": appt.get("notes"),
        "adminNote": appt.get("adminNote"),
        "createdAt": appt.get("createdAt"),
        "rescheduledAt": appt.get("rescheduledAt"),
    }


def get_portal_appointment(token: str) -> dict:
    appt = _get_by_token(token)
    if not appt:
        raise NotFoundError("Appointment not found.")
    if appt.get("status") == "pending_payment":
        raise NotFoundError("Appointment not found.")
    return _safe_appointment(appt)


def portal_reschedule(token: str, req: RescheduleRequest) -> dict:
    appt = _get_by_token(token)
    if not appt:
        raise NotFoundError("Appointment not found.")

    status = appt.get("status")
    if status not in {"pending", "confirmed"}:
        raise ValueError(f"Appointment cannot be rescheduled (status: {status}).")

    old_date = appt["preferredDate"]
    old_time = appt["preferredTime"]

    # Backend 24-hour enforcement using America/Chicago
    if is_within_24hrs(old_date, old_time):
        raise PermissionError(WITHIN_24H_MESSAGE)

    new_date = req.preferredDate.isoformat()
    new_time = req.preferredTime

    if new_date == old_date and new_time == old_time:
        raise ValueError("The new date and time must be different from the current appointment.")

    duration = int(appt.get("serviceDurationMinutes", DEFAULT_DURATION_MINUTES))
    if not _slot_is_available_for_reschedule(
        new_date, new_time, duration_minutes=duration, exclude_id=appt["appointmentId"]
    ):
        raise ValueError("That time slot is not available. Please choose a different date or time.")

    now = utc_now()
    updated = update_item(
        get_config().table_appointments,
        {"appointmentId": appt["appointmentId"]},
        {
            "preferredDate": new_date,
            "preferredTime": new_time,
            "status": status,
            "statusKey": status,
            "rescheduledAt": now,
            "rescheduledFrom": f"{old_date}T{old_time}",
            "rescheduledBy": "client",
            "updatedAt": now,
        },
    )

    put_item(
        get_config().table_audit_log,
        {
            "logId": new_id(),
            "adminId": "client",
            "action": "appointment.rescheduled",
            "resourceType": "appointment",
            "resourceId": appt["appointmentId"],
            "detail": {
                "from": f"{old_date}T{old_time}",
                "to": f"{new_date}T{new_time}",
                "by": "client",
            },
            "createdAt": now,
            "expiresAt": ttl_days(365),
        },
    )

    name = appt["clientName"]
    service_name = appt["serviceName"]
    client_email = decrypt_pii(appt.get("clientEmail", "")) or ""

    _send_reschedule_confirmation(
        client_email=client_email,
        name=name,
        service_name=service_name,
        old_date=old_date,
        old_time=old_time,
        new_date=new_date,
        new_time=new_time,
        token=token,
    )
    notify_admin(
        f"Client rescheduled: {service_name}",
        f"{name} rescheduled from {_format_date(old_date)} {_format_time(old_time)}"
        f" to {_format_date(new_date)} {_format_time(new_time)}.",
        html_body=_admin_email_layout(
            preheader=f"{name} rescheduled their {service_name} appointment.",
            title="Client Rescheduled Appointment",
            intro=f"{name} has rescheduled their {service_name} appointment.",
            content=_admin_details_table(
                [
                    ("Client", name),
                    ("Service", service_name),
                    ("Previous date", _format_date(old_date)),
                    ("Previous time", _format_time(old_time)),
                    ("New date", _format_date(new_date)),
                    ("New time", _format_time(new_time)),
                ]
            ),
            cta_label="Open Admin Dashboard",
            cta_url=f"{get_config().allowed_origin}/admin/appointments",
            accent_color=ACCENT_RESCHEDULED,
        ),
    )

    return _safe_appointment({**appt, **updated})


def portal_cancel(token: str) -> dict:
    appt = _get_by_token(token)
    if not appt:
        raise NotFoundError("Appointment not found.")

    status = appt.get("status")
    if status not in {"pending", "confirmed"}:
        raise ValueError(f"Appointment cannot be cancelled (status: {status}).")

    # Backend 24-hour enforcement using America/Chicago
    if is_within_24hrs(appt["preferredDate"], appt["preferredTime"]):
        raise PermissionError(WITHIN_24H_MESSAGE)

    deposit_status = appt.get("depositStatus")
    if deposit_status == "refunded":
        raise ValueError("The deposit for this appointment has already been refunded.")
    if deposit_status == "refund_pending":
        raise ValueError(
            "A refund is already being processed for this appointment. "
            "Please allow 5–10 business days for it to appear on your statement."
        )
    if deposit_status != "paid":
        raise ValueError("No deposit is on record for this appointment.")

    charge_id = appt.get("stripeChargeId")
    if not charge_id:
        raise ValueError(
            "Unable to process refund automatically — no charge on record. Please contact the salon directly."
        )

    appointment_id = appt["appointmentId"]
    now = utc_now()

    # Atomically move to refund_pending before calling Stripe
    try:
        update_item(
            get_config().table_appointments,
            {"appointmentId": appointment_id},
            {
                "status": "cancelled",
                "statusKey": "cancelled",
                "depositStatus": "refund_pending",
                "refundStatus": "pending",
                "updatedAt": now,
            },
        )
    except NotFoundError:
        raise NotFoundError("Appointment not found.") from None

    try:
        create_refund(charge_id, idempotency_key=f"{appointment_id}-client-cancel")
    except Exception as exc:
        logger.exception("Stripe refund failed during client cancel", extra={"appointmentId": appointment_id})
        # Rollback to paid so admin can retry
        try:
            update_item(
                get_config().table_appointments,
                {"appointmentId": appointment_id},
                {"status": "cancelled", "depositStatus": "paid", "refundStatus": "none", "updatedAt": utc_now()},
            )
        except Exception:  # noqa: S110
            logger.warning("Rollback update failed after Stripe refund error", extra={"appointmentId": appointment_id})
        raise ValueError("Refund processing failed. Please contact the salon directly.") from exc

    put_item(
        get_config().table_audit_log,
        {
            "logId": new_id(),
            "adminId": "client",
            "action": "appointment.cancelled_refund_initiated",
            "resourceType": "appointment",
            "resourceId": appointment_id,
            "detail": {"chargeId": charge_id, "by": "client"},
            "createdAt": now,
            "expiresAt": ttl_days(365),
        },
    )

    name = appt["clientName"]
    service_name = appt["serviceName"]
    client_email = decrypt_pii(appt.get("clientEmail", "")) or ""

    _send_cancel_confirmation(client_email, name, service_name, appt["preferredDate"], appt["preferredTime"])
    notify_admin(
        f"Client cancelled: {service_name}",
        f"{name} cancelled their {_format_date(appt['preferredDate'])} appointment. Stripe refund initiated.",
        html_body=_admin_email_layout(
            preheader=f"{name} cancelled their {service_name} appointment.",
            title="Client Cancelled Appointment",
            intro=f"{name} has cancelled their {service_name} appointment. A $20 Stripe refund has been initiated.",
            content=_admin_details_table(
                [
                    ("Client", name),
                    ("Service", service_name),
                    ("Date", _format_date(appt["preferredDate"])),
                    ("Time", _format_time(appt["preferredTime"])),
                    ("Refund", "$20 Stripe refund initiated"),
                ]
            ),
            cta_label="Open Admin Dashboard",
            cta_url=f"{get_config().allowed_origin}/admin/appointments",
            accent_color=ACCENT_CANCELLED,
        ),
    )

    return {
        "status": "cancelled",
        "depositStatus": "refund_pending",
        "message": (
            "Your appointment has been cancelled and a refund of $20.00 has been initiated. "
            "Please allow 5–10 business days for it to appear on your original payment method. "
            "If you would prefer to transfer your deposit to a future appointment instead, "
            "please contact the salon directly."
        ),
    }


def _send_reschedule_confirmation(
    client_email: str,
    name: str,
    service_name: str,
    old_date: str,
    old_time: str,
    new_date: str,
    new_time: str,
    token: str,
) -> None:
    config = get_config()
    portal_url = f"{config.allowed_origin}/appointment/{token}"
    content = _details_table(
        [
            ("Service", service_name),
            ("Previous date", _format_date(old_date)),
            ("Previous time", _format_time(old_time)),
            ("New date", _format_date(new_date)),
            ("New time", _format_time(new_time)),
            ("Deposit", "$20 transferred to your new date"),
        ]
    )
    html_body = _email_layout(
        preheader=f"Your appointment has been rescheduled to {_format_date(new_date)}.",
        title="Appointment Rescheduled",
        intro=(
            f"Hi {name}, your appointment has been rescheduled. "
            "Your $20 deposit has been transferred to the new date. No additional deposit is required."
        ),
        content=content,
        cta_label="View My Appointment",
        cta_url=portal_url,
        cta_helper=(
            "Use this link to view, reschedule, or cancel your appointment "
            "(available more than 24 hours before your appointment)."
        ),
        accent_color=ACCENT_RESCHEDULED,
        cta_text_color="#FFFFFF",
    )
    best_effort_send_email(
        to_address=client_email,
        subject=f"Braids by Deb: Appointment Rescheduled to {_format_date(new_date)}",
        text_body=(
            f"Hi {name},\n\nYour appointment has been rescheduled.\n\n"
            f"New date: {_format_date(new_date)}\nNew time: {_format_time(new_time)}\n"
            "Your $20 deposit transfers to the new date.\n\n"
            f"View your appointment: {portal_url}\n\nBraids by Deb"
        ),
        html_body=html_body,
    )


def _send_cancel_confirmation(
    client_email: str,
    name: str,
    service_name: str,
    date: str,
    time: str,
) -> None:
    config = get_config()
    html_body = _email_layout(
        preheader="Your appointment has been cancelled and a refund has been initiated.",
        title="Appointment Cancelled",
        intro=(
            f"Hi {name}, your {service_name} appointment on {_format_date(date)} has been cancelled. "
            "A refund of $20.00 has been initiated to your original payment method. "
            "Please allow 5–10 business days for the refund to appear."
        ),
        content=_details_table(
            [
                ("Service", service_name),
                ("Date", _format_date(date)),
                ("Time", _format_time(time)),
                ("Refund", "$20.00 to your original payment method"),
            ]
        ),
        cta_label="Book Again",
        cta_url=config.allowed_origin + "/book",
        accent_color=ACCENT_CANCELLED,
        cta_text_color="#FFFFFF",
    )
    best_effort_send_email(
        to_address=client_email,
        subject="Braids by Deb: Appointment Cancelled — Refund Initiated",
        text_body=(
            f"Hi {name},\n\nYour {service_name} appointment on {_format_date(date)} has been cancelled.\n\n"
            "A $20.00 refund has been initiated to your original payment method.\n"
            "Please allow 5–10 business days.\n\n"
            "If you prefer to transfer the deposit to a future appointment, contact us directly.\n\n"
            "Braids by Deb"
        ),
        html_body=html_body,
    )
