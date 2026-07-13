from __future__ import annotations

import datetime as dt

from boto3.dynamodb.conditions import Attr

from appointments.models import (
    DEFAULT_DURATION_MINUTES,
    DEPOSIT_AMOUNT_CENTS,
    POLICY_VERSION,
    ConfirmAppointmentRequest,
    PaymentIntentRequest,
)
from common.config import get_config
from common.dynamo import get_item, put_item, scan_items, update_item_with_removes
from common.email_layout import admin_details_table as _admin_details_table
from common.email_layout import admin_email_layout as _admin_email_layout
from common.email_layout import details_table as _details_table
from common.email_layout import email_layout as _email_layout
from common.errors import NotFoundError
from common.ids import new_appointment_token, new_id, ttl_days, ttl_minutes, utc_now, utc_now_epoch
from common.logger import logger
from common.security import decrypt_pii, encrypt_pii
from common.ses_client import best_effort_send_email, notify_admin
from common.stripe_client import create_payment_intent, retrieve_payment_intent


def _format_date(value: dt.date | str) -> str:
    if isinstance(value, str):
        value = dt.date.fromisoformat(value)
    return value.strftime("%A, %B %-d, %Y")


def _format_time(value: str) -> str:
    hour, minute = (int(p) for p in value.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute:02d} {suffix}"


def _remaining_balance_cents(service_price_cents: int) -> int:
    return max(0, service_price_cents - DEPOSIT_AMOUNT_CENTS)


def _slot_is_available(
    preferred_date: str,
    preferred_time: str,
    duration_minutes: int = DEFAULT_DURATION_MINUTES,
    exclude_id: str | None = None,
) -> bool:
    """
    Returns True when the requested date+time window has no conflict with any active booking.

    A conflict exists when the new appointment's time window [start, start+duration) overlaps
    with an existing active appointment's window [ex_start, ex_start+ex_duration).
    Overlap condition: new_start < ex_end AND ex_start < new_end.

    Active = pending_payment (not expired), pending, or confirmed.
    Cancelled / completed / no_show are ignored.
    """
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


def _confirmation_email_html(
    name: str, service_name: str, date: str, time: str, token: str, service_price_cents: int
) -> str:
    config = get_config()
    portal_url = f"{config.allowed_origin}/appointment/{token}"
    remaining = _remaining_balance_cents(service_price_cents)
    rows: list[tuple[str, str | None]] = [
        ("Service", service_name),
        ("Date", _format_date(date)),
        ("Time", _format_time(time)),
        ("Deposit paid", "$20.00"),
    ]
    if remaining > 0:
        rows.append(("Balance due at appointment", f"${remaining / 100:.2f}"))
    content = _details_table(rows)
    return _email_layout(
        preheader=f"Your {service_name} appointment is confirmed. See you soon!",
        title="Appointment Confirmed",
        intro=(
            f"Hi {name}, your appointment is confirmed and your $20 deposit has been received. "
            "Your deposit will be applied toward your final service balance."
        ),
        content=content,
        cta_label="View My Appointment",
        cta_url=portal_url,
        show_check=True,
    )


def _confirmation_email_text(
    name: str, service_name: str, date: str, time: str, token: str, service_price_cents: int
) -> str:
    config = get_config()
    portal_url = f"{config.allowed_origin}/appointment/{token}"
    remaining = _remaining_balance_cents(service_price_cents)
    balance_line = f"Balance due at appointment: ${remaining / 100:.2f}\n" if remaining > 0 else ""
    return (
        f"Hi {name},\n\n"
        "Your appointment is confirmed and your $20 deposit has been received.\n\n"
        f"Service: {service_name}\n"
        f"Date: {_format_date(date)}\n"
        f"Time: {_format_time(time)}\n"
        "Deposit paid: $20.00\n"
        f"{balance_line}\n"
        f"View or manage your appointment:\n{portal_url}\n\n"
        "Braids by Deb"
    )


def _note_rows(notes: str) -> list[tuple[str, str | None]]:
    """Split the composed notes ("Color: 99J | Requests: …") into email rows."""
    rows: list[tuple[str, str | None]] = []
    for segment in (s.strip() for s in notes.split("|")):
        if not segment:
            continue
        label, _, value = segment.partition(":")
        if value.strip():
            rows.append((label.strip(), value.strip()))
        else:
            rows.append(("Note", segment))
    return rows


def _admin_new_booking_html(
    name: str,
    email: str,
    phone: str,
    service_name: str,
    date: str,
    time: str,
    notes: str = "",
    referral: str = "",
) -> str:
    config = get_config()
    content = _admin_details_table(
        [
            ("Client", name),
            ("Service", service_name),
            ("Date", _format_date(date)),
            ("Time", _format_time(time)),
            ("Email", email),
            ("Phone", phone),
            ("Deposit", "$20 paid via Stripe"),
            ("Heard about us via", referral or None),
            *_note_rows(notes),
        ]
    )
    return _admin_email_layout(
        preheader=f"New booking: {service_name} on {_format_date(date)}.",
        title="New Booking, Deposit Paid",
        intro="A new client has booked and paid their $20 deposit. Review and confirm the appointment.",
        content=content,
        cta_label="Open Admin Dashboard",
        cta_url=f"{config.allowed_origin}/admin/appointments",
    )


def create_payment_intent_hold(
    request: PaymentIntentRequest,
    client_ip: str | None,
    user_agent: str | None,
) -> dict:
    """
    Step 1: validate slot, create PENDING_PAYMENT hold, create Stripe PaymentIntent.
    Returns {appointmentId, clientSecret}.
    """
    config = get_config()

    service = get_item(config.table_services, {"serviceId": request.serviceId})
    if not service or service.get("active") in {False, "false"}:
        raise ValueError("Selected service was not found.")

    service_duration_minutes = int(service.get("durationMinutes", DEFAULT_DURATION_MINUTES))
    date_str = request.preferredDate.isoformat()
    if not _slot_is_available(date_str, request.preferredTime, duration_minutes=service_duration_minutes):
        raise ValueError("That time slot is no longer available. Please choose a different date or time.")

    now = utc_now()
    appointment_id = new_id()
    token = new_appointment_token()
    service_price_cents = int(service.get("startingPrice", 0))

    intent = create_payment_intent(
        DEPOSIT_AMOUNT_CENTS,
        metadata={
            "appointmentId": appointment_id,
            "environment": config.environment,
        },
    )

    item: dict = {
        "appointmentId": appointment_id,
        "appointmentToken": token,
        "serviceId": request.serviceId,
        "serviceName": service["name"],
        "servicePrice": service_price_cents,
        "serviceDurationMinutes": service_duration_minutes,
        "clientName": request.clientName,
        "clientEmail": encrypt_pii(str(request.clientEmail)),
        "clientPhone": encrypt_pii(request.clientPhone),
        "preferredDate": date_str,
        "preferredTime": request.preferredTime,
        "notes": request.notes,
        "status": "pending_payment",
        "statusKey": "pending_payment",
        "depositAmount": DEPOSIT_AMOUNT_CENTS,
        "depositStatus": None,
        "stripePaymentIntentId": intent.id,
        "stripeChargeId": None,
        "refundStatus": "none",
        "policyAccepted": True,
        "policyAcceptedAt": now,
        "policyVersion": POLICY_VERSION,
        "policyClientIp": client_ip,
        "policyUserAgent": user_agent,
        "referralSource": request.referralSource,
        "adminNote": None,
        "adminNotes": None,
        "createdAt": now,
        "updatedAt": now,
        "expiresAt": ttl_minutes(15),
    }
    if request.portfolioStyleId:
        item["portfolioStyleId"] = request.portfolioStyleId

    put_item(config.table_appointments, item)

    put_item(
        config.table_audit_log,
        {
            "logId": new_id(),
            "adminId": "system",
            "action": "appointment.payment_intent_created",
            "resourceType": "appointment",
            "resourceId": appointment_id,
            "detail": {"serviceId": request.serviceId, "stripePaymentIntentId": intent.id},
            "createdAt": now,
            "expiresAt": ttl_days(365),
        },
    )

    return {
        "appointmentId": appointment_id,
        "clientSecret": intent.client_secret,
    }


def confirm_appointment(appointment_id: str, req: ConfirmAppointmentRequest) -> dict:
    """
    Step 2: called by frontend after Stripe payment succeeds.
    Verifies the PaymentIntent with Stripe directly, then confirms the appointment.
    """
    config = get_config()

    existing = get_item(config.table_appointments, {"appointmentId": appointment_id})
    if not existing:
        raise NotFoundError("Appointment not found.")

    current_status = existing.get("status")
    if current_status in {"confirmed", "pending"}:  # "pending" covers deposits set before this fix
        return {"status": "already_confirmed"}
    if current_status != "pending_payment":
        raise ValueError(f"Appointment cannot be confirmed (status: {current_status}).")

    intent = retrieve_payment_intent(req.stripePaymentIntentId)
    if getattr(intent.metadata, "appointmentId", None) != appointment_id:
        raise ValueError("Payment intent does not match this appointment.")
    if intent.status != "succeeded":
        raise ValueError(f"Payment not yet complete (status: {intent.status}).")
    if intent.amount != DEPOSIT_AMOUNT_CENTS:
        raise ValueError(
            f"Payment amount mismatch: expected {DEPOSIT_AMOUNT_CENTS} cents, received {intent.amount} cents."
        )
    if intent.currency.lower() != "usd":
        raise ValueError(f"Payment currency mismatch: expected usd, received {intent.currency}.")

    charge_id = intent.latest_charge if isinstance(intent.latest_charge, str) else None
    if hasattr(intent, "latest_charge") and intent.latest_charge:
        if hasattr(intent.latest_charge, "id"):
            charge_id = intent.latest_charge.id

    now = utc_now()
    date_str = existing["preferredDate"]
    time_str = existing["preferredTime"]
    duration = int(existing.get("serviceDurationMinutes", DEFAULT_DURATION_MINUTES))

    if not _slot_is_available(date_str, time_str, duration_minutes=duration, exclude_id=appointment_id):
        raise ValueError(
            "This time slot was taken while payment was processing. "
            "Please contact us to reschedule. Your deposit will be refunded."
        )

    updates: dict = {
        "status": "confirmed",
        "statusKey": "confirmed",
        "depositStatus": "paid",
        "updatedAt": now,
    }
    if charge_id:
        updates["stripeChargeId"] = charge_id

    updated = update_item_with_removes(
        config.table_appointments,
        {"appointmentId": appointment_id},
        updates,
        remove_fields=["expiresAt"],
    )

    put_item(
        config.table_audit_log,
        {
            "logId": new_id(),
            "adminId": "system",
            "action": "appointment.payment_confirmed",
            "resourceType": "appointment",
            "resourceId": appointment_id,
            "detail": {"stripePaymentIntentId": req.stripePaymentIntentId, "chargeId": charge_id},
            "createdAt": now,
            "expiresAt": ttl_days(365),
        },
    )

    client_email = decrypt_pii(existing.get("clientEmail", "")) or ""
    client_phone = decrypt_pii(existing.get("clientPhone", "")) or ""
    token = existing.get("appointmentToken", "")
    name = existing["clientName"]
    service_name = existing["serviceName"]
    svc_price = int(existing.get("servicePrice", 0))

    best_effort_send_email(
        to_address=client_email,
        subject="Braids by Deb: Your Appointment is Confirmed",
        text_body=_confirmation_email_text(name, service_name, date_str, time_str, token, svc_price),
        html_body=_confirmation_email_html(name, service_name, date_str, time_str, token, svc_price),
    )
    booking_notes = existing.get("notes") or ""
    referral = existing.get("referralSource") or ""
    notify_admin(
        f"New booking: {service_name} on {_format_date(date_str)}",
        f"Client: {name} | {client_email} | {client_phone}"
        + (f"\nReferral: {referral}" if referral else "")
        + (f"\nNotes: {booking_notes}" if booking_notes else ""),
        html_body=_admin_new_booking_html(
            name, client_email, client_phone, service_name, date_str, time_str, booking_notes, referral
        ),
    )

    updated["clientEmail"] = client_email
    updated["clientPhone"] = client_phone
    return {
        "appointmentId": appointment_id,
        "status": "confirmed",
        "message": "Your deposit has been paid. Check your email for appointment details.",
        "portalUrl": f"{get_config().allowed_origin}/appointment/{token}",
    }


def confirm_appointment_from_webhook(appointment_id: str, charge_id: str | None, intent_id: str) -> None:
    """
    Webhook backup: confirms a PENDING_PAYMENT appointment when Stripe fires
    payment_intent.succeeded. Skips if already confirmed by the frontend path.
    """
    config = get_config()
    existing = get_item(config.table_appointments, {"appointmentId": appointment_id})
    if not existing:
        logger.warning("Webhook: appointment not found", extra={"appointmentId": appointment_id})
        return

    if existing.get("status") != "pending_payment":
        logger.info(
            "Webhook: appointment already past pending_payment, skipping",
            extra={"appointmentId": appointment_id, "status": existing.get("status")},
        )
        return

    date_str = existing["preferredDate"]
    time_str = existing["preferredTime"]
    duration = int(existing.get("serviceDurationMinutes", DEFAULT_DURATION_MINUTES))
    if not _slot_is_available(date_str, time_str, duration_minutes=duration, exclude_id=appointment_id):
        logger.warning(
            "Webhook: slot conflict detected during confirmation",
            extra={"appointmentId": appointment_id},
        )
        return

    now = utc_now()
    updates: dict = {
        "status": "confirmed",
        "statusKey": "confirmed",
        "depositStatus": "paid",
        "stripePaymentIntentId": intent_id,
        "updatedAt": now,
    }
    if charge_id:
        updates["stripeChargeId"] = charge_id

    try:
        update_item_with_removes(
            config.table_appointments,
            {"appointmentId": appointment_id},
            updates,
            remove_fields=["expiresAt"],
        )
    except NotFoundError:
        logger.warning("Webhook: appointment disappeared during confirm", extra={"appointmentId": appointment_id})
        return

    token = existing.get("appointmentToken", "")
    name = existing["clientName"]
    service_name = existing["serviceName"]
    date_str = existing["preferredDate"]
    time_str = existing["preferredTime"]
    client_email = decrypt_pii(existing.get("clientEmail", "")) or ""
    client_phone = decrypt_pii(existing.get("clientPhone", "")) or ""
    svc_price = int(existing.get("servicePrice", 0))

    best_effort_send_email(
        to_address=client_email,
        subject="Braids by Deb: Your Appointment is Confirmed",
        text_body=_confirmation_email_text(name, service_name, date_str, time_str, token, svc_price),
        html_body=_confirmation_email_html(name, service_name, date_str, time_str, token, svc_price),
    )
    notify_admin(
        f"New booking (webhook): {service_name} on {_format_date(date_str)}",
        f"Client: {name} | {client_email} | {client_phone}",
        html_body=_admin_new_booking_html(name, client_email, client_phone, service_name, date_str, time_str),
    )
