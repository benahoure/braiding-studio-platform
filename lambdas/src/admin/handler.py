from __future__ import annotations

import os
import re
from decimal import Decimal
from typing import Any, Literal

import boto3
from aws_lambda_powertools.utilities.typing import LambdaContext
from boto3.dynamodb.conditions import Attr
from pydantic import BaseModel, Field, ValidationError

from business_settings.handler import SETTINGS_KEY
from business_settings.models import BusinessSettingsPatch
from common.config import get_config
from common.dynamo import (
    append_list_item,
    bool_filter,
    delete_item,
    get_item,
    put_item,
    scan_items,
    update_item,
    update_item_with_removes,
)
from common.email_layout import ACCENT_CANCELLED, ACCENT_FORFEITED, ACCENT_NOSHOW, ACCENT_RESCHEDULED
from common.email_layout import admin_details_table as _admin_details_table
from common.email_layout import admin_email_layout as _admin_email_layout
from common.email_layout import details_table as _details_table
from common.email_layout import email_layout as _email_layout
from common.errors import ForbiddenError, NotFoundError
from common.http import method, parse_json_body, path, path_parameter, query_params, validation_errors
from common.ids import new_id, ttl_days, utc_now
from common.logger import logger, safe_extra
from common.response import bad_request, created, forbidden, internal_error, not_found, ok, options
from common.security import decrypt_pii, require_admin, validate_cdn_url, validate_cdn_url_any
from common.ses_client import best_effort_send_email, notify_admin
from common.stripe_client import create_refund
from portfolio.models import PortfolioPatch, PortfolioWrite
from reviews.models import ReviewPatch, ReviewWrite
from services.models import MAX_SERVICE_PHOTOS, ServicePatch, ServiceWrite

_cloudfront = boto3.client("cloudfront")


def _fmt_date(value: str) -> str:
    import datetime as dt

    return dt.date.fromisoformat(value).strftime("%A, %B %-d, %Y")


def _fmt_time(value: str) -> str:
    hour, minute = (int(p) for p in value.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    return f"{hour % 12 or 12}:{minute:02d} {suffix}"


def _notify_admin_html(
    title: str,
    intro: str,
    rows: list[tuple[str, str | None]],
    accent_color: str | None = None,
) -> str:
    config = get_config()
    kwargs: dict = {}
    if accent_color:
        kwargs["accent_color"] = accent_color
    return _admin_email_layout(
        preheader=intro,
        title=title,
        intro=intro,
        content=_admin_details_table(rows),
        cta_label="Open Admin Dashboard",
        cta_url=f"{config.allowed_origin}/admin/appointments",
        **kwargs,
    )


def _send_admin_cancel_email(appt: dict) -> None:
    client_email = decrypt_pii(appt.get("clientEmail", "")) or ""
    if not client_email:
        return
    name = appt.get("clientName", "there")
    service_name = appt.get("serviceName", "")
    date = appt.get("preferredDate", "")
    time = appt.get("preferredTime", "")
    config = get_config()
    html_body = _email_layout(
        preheader="Your appointment has been cancelled by the salon. A refund has been initiated.",
        title="Appointment Cancelled",
        intro=(
            f"Hi {name}, your {service_name} appointment has been cancelled by the salon. "
            "A full refund of $20.00 has been initiated to your original payment method. "
            "Please allow 5–10 business days for the refund to appear."
        ),
        content=_details_table(
            [
                ("Service", service_name),
                ("Date", _fmt_date(date)),
                ("Time", _fmt_time(time)),
                ("Refund", "$20.00 to your original payment method"),
            ]
        ),
        cta_label="Book Again",
        cta_url=f"{config.allowed_origin}/book",
        accent_color=ACCENT_CANCELLED,
        cta_text_color="#FFFFFF",
    )
    best_effort_send_email(
        to_address=client_email,
        subject="Braids by Deb: Appointment Cancelled — Refund Initiated",
        text_body=(
            f"Hi {name},\n\nYour {service_name} appointment on {_fmt_date(date)} has been cancelled by the salon.\n\n"
            "A full refund of $20.00 has been initiated to your original payment method.\n"
            "Please allow 5–10 business days.\n\nBraids by Deb"
        ),
        html_body=html_body,
    )


def _send_admin_reschedule_email(appt: dict, new_date: str, new_time: str) -> None:
    client_email = decrypt_pii(appt.get("clientEmail", "")) or ""
    if not client_email:
        return
    name = appt.get("clientName", "there")
    service_name = appt.get("serviceName", "")
    old_date = appt.get("preferredDate", "")
    old_time = appt.get("preferredTime", "")
    token = appt.get("appointmentToken", "")
    config = get_config()
    portal_url = f"{config.allowed_origin}/appointment/{token}" if token else f"{config.allowed_origin}/book"
    html_body = _email_layout(
        preheader=f"Your appointment has been rescheduled to {_fmt_date(new_date)}.",
        title="Appointment Rescheduled",
        intro=(
            f"Hi {name}, the salon has rescheduled your {service_name} appointment. "
            "Your $20 deposit has been transferred to the new date — no additional deposit is required."
        ),
        content=_details_table(
            [
                ("Service", service_name),
                ("Previous date", _fmt_date(old_date)),
                ("Previous time", _fmt_time(old_time)),
                ("New date", _fmt_date(new_date)),
                ("New time", _fmt_time(new_time)),
                ("Deposit", "$20 transferred to your new date"),
            ]
        ),
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
        subject=f"Braids by Deb: Appointment Rescheduled to {_fmt_date(new_date)}",
        text_body=(
            f"Hi {name},\n\nYour {service_name} appointment has been rescheduled by the salon.\n\n"
            f"New date: {_fmt_date(new_date)}\nNew time: {_fmt_time(new_time)}\n"
            "Your $20 deposit transfers to the new date.\n\n"
            f"View your appointment: {portal_url}\n\nBraids by Deb"
        ),
        html_body=html_body,
    )


def _send_admin_forfeit_email(appt: dict, action: str) -> None:
    client_email = decrypt_pii(appt.get("clientEmail", "")) or ""
    if not client_email:
        return
    name = appt.get("clientName", "there")
    service_name = appt.get("serviceName", "")
    date = appt.get("preferredDate", "")
    time = appt.get("preferredTime", "")
    config = get_config()
    if action == "late_cancel":
        title = "Appointment Cancelled — Deposit Forfeited"
        intro = (
            f"Hi {name}, your {service_name} appointment has been cancelled. "
            "As the cancellation was made within 24 hours of your appointment, "
            "the $20 deposit has been forfeited per our cancellation policy."
        )
        preheader = "Your appointment was cancelled — deposit forfeited per late cancellation policy."
        forfeit_accent = ACCENT_FORFEITED
    else:
        title = "Missed Appointment — Deposit Forfeited"
        intro = (
            f"Hi {name}, you missed your {service_name} appointment on {_fmt_date(date)}. "
            "The $20 deposit has been forfeited per our no-show policy. "
            "We'd love to see you — please book again when you're ready."
        )
        preheader = "Your appointment was marked as no-show — deposit forfeited."
        forfeit_accent = ACCENT_NOSHOW
    html_body = _email_layout(
        preheader=preheader,
        title=title,
        intro=intro,
        content=_details_table(
            [
                ("Service", service_name),
                ("Date", _fmt_date(date)),
                ("Time", _fmt_time(time)),
                ("Deposit", "Forfeited per cancellation policy"),
            ]
        ),
        cta_label="Book Again",
        cta_url=f"{config.allowed_origin}/book",
        accent_color=forfeit_accent,
        cta_text_color="#FFFFFF",
    )
    best_effort_send_email(
        to_address=client_email,
        subject=f"Braids by Deb: {title}",
        text_body=(
            f"Hi {name},\n\n{intro}\n\n"
            f"Service: {service_name}\nDate: {_fmt_date(date)}\nTime: {_fmt_time(time)}\n\n"
            f"Book again: {config.allowed_origin}/book\n\nBraids by Deb"
        ),
        html_body=html_body,
    )


class AppointmentPatch(BaseModel):
    status: Literal["confirmed", "cancelled", "completed"]
    adminNote: str | None = Field(default=None, max_length=500)


class AdminOverrideBody(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class AdminForfeitBody(BaseModel):
    action: Literal["late_cancel", "no_show"]
    reason: str | None = Field(default=None, max_length=500)


class AdminRescheduleBody(BaseModel):
    preferredDate: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    preferredTime: str = Field(pattern=r"^\d{2}:\d{2}$")
    reason: str | None = Field(default=None, max_length=500)


class AdminNotesBody(BaseModel):
    adminNotes: str = Field(max_length=1000)


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()
    try:
        admin_user_id = require_admin(event)
    except ForbiddenError as exc:
        return forbidden(str(exc))

    try:
        request_path = path(event)
        request_method = method(event)
        if request_path == "/admin/upload-url" and request_method == "POST":
            return generate_upload_url(event, admin_user_id)
        if request_path == "/admin/appointments" and request_method == "GET":
            return get_appointments(event)
        if path_parameter(event, "appointmentId") and request_method == "PATCH":
            return update_appointment(event, admin_user_id)
        if (
            path_parameter(event, "appointmentId")
            and request_method == "POST"
            and request_path.endswith("/cancel-refund")
        ):
            return admin_cancel_refund(event, admin_user_id)
        if path_parameter(event, "appointmentId") and request_method == "POST" and request_path.endswith("/reschedule"):
            return admin_reschedule(event, admin_user_id)
        if path_parameter(event, "appointmentId") and request_method == "POST" and request_path.endswith("/refund"):
            return admin_refund(event, admin_user_id)
        if path_parameter(event, "appointmentId") and request_method == "POST" and request_path.endswith("/forfeit"):
            return admin_forfeit(event, admin_user_id)
        if path_parameter(event, "appointmentId") and request_method == "POST" and request_path.endswith("/override"):
            return admin_override(event, admin_user_id)
        if request_path == "/admin/services" and request_method == "GET":
            return get_services(event)
        if request_path == "/admin/services" and request_method == "POST":
            return create_service(event, admin_user_id)
        if path_parameter(event, "serviceId") and request_method == "PATCH":
            return patch_service(event, admin_user_id)
        if path_parameter(event, "serviceId") and request_method == "DELETE":
            return delete_service(event, admin_user_id)
        if request_path == "/admin/portfolio" and request_method == "GET":
            return get_portfolio(event)
        if request_path == "/admin/portfolio" and request_method == "POST":
            return create_portfolio(event, admin_user_id)
        if path_parameter(event, "styleId") and request_method == "PATCH":
            return patch_portfolio(event, admin_user_id)
        if path_parameter(event, "styleId") and request_method == "DELETE":
            return delete_portfolio(event, admin_user_id)
        if request_path == "/admin/reviews" and request_method == "GET":
            return get_reviews_admin(event)
        if request_path == "/admin/reviews" and request_method == "POST":
            return create_review(event, admin_user_id)
        if path_parameter(event, "reviewId") and request_method == "PATCH":
            return patch_review(event, admin_user_id)
        if path_parameter(event, "reviewId") and request_method == "DELETE":
            return delete_review(event, admin_user_id)
        if request_path == "/admin/contact-messages" and request_method == "GET":
            return get_contact_messages(event)
        if path_parameter(event, "messageId") and request_method == "PATCH":
            return patch_contact_message(event, admin_user_id)
        if path_parameter(event, "messageId") and request_method == "POST" and request_path.endswith("/reply"):
            return reply_to_contact_message(event, admin_user_id)
        if request_path == "/admin/business-settings" and request_method == "GET":
            return get_business_settings_admin(event)
        if request_path == "/admin/business-settings" and request_method == "PATCH":
            return patch_business_settings(event, admin_user_id)
        if request_path == "/admin/audit-log" and request_method == "GET":
            return get_audit_log(event)
        return not_found("Admin route not found.")
    except ValueError as exc:
        return bad_request(str(exc))
    except ValidationError as exc:
        return bad_request(validation_errors(exc))
    except Exception:
        logger.exception("Unexpected admin handler error")
        return internal_error()


def resource_id(event: dict, name: str) -> str:
    value = path_parameter(event, name)
    if value:
        return value
    return path(event).rstrip("/").split("/")[-1]


def audit(
    admin_user_id: str,
    action: str,
    resource_type: str,
    resource_id_value: str,
    detail: dict[str, Any] | None = None,
) -> None:
    put_item(
        get_config().table_audit_log,
        {
            "logId": new_id(),
            "adminId": admin_user_id,
            "action": action,
            "resourceType": resource_type,
            "resourceId": resource_id_value,
            "detail": detail or {},
            "createdAt": utc_now(),
            "expiresAt": ttl_days(365),
        },
    )


def get_appointments(event: dict) -> dict:
    config = get_config()
    params = query_params(event)
    status = params.get("status")
    filter_expression: Any = Attr("appointmentId").exists()
    if status:
        filter_expression = filter_expression & Attr("status").eq(status)
    if params.get("date"):
        filter_expression = filter_expression & Attr("preferredDate").eq(params["date"])

    items, next_cursor = scan_items(
        config.table_appointments,
        filter_expression=filter_expression,
        limit=min(int(params.get("limit", "25")), 50),
        cursor=params.get("cursor"),
    )
    appointments = []
    for item in sorted(items, key=lambda value: value.get("createdAt", ""), reverse=True):
        item["clientEmail"] = decrypt_pii(item.get("clientEmail"))
        item["clientPhone"] = decrypt_pii(item.get("clientPhone"))
        appointments.append(item)
    return ok({"appointments": appointments, "nextCursor": next_cursor})


def get_services(event: dict) -> dict:
    params = query_params(event)
    items, next_cursor = scan_items(
        get_config().table_services,
        filter_expression=Attr("serviceId").exists(),
        limit=min(int(params.get("limit", "50")), 100),
        cursor=params.get("cursor"),
    )

    def _sort_key(value: dict) -> tuple:
        order = value.get("displayOrder")
        return (order is None, int(order) if order is not None else 0, value.get("name", ""))

    services = sorted(items, key=_sort_key)
    return ok({"services": services, "nextCursor": next_cursor})


def get_portfolio(event: dict) -> dict:
    params = query_params(event)
    items, next_cursor = scan_items(
        get_config().table_portfolio,
        filter_expression=Attr("styleId").exists(),
        limit=min(int(params.get("limit", "50")), 100),
        cursor=params.get("cursor"),
    )
    portfolio = sorted(items, key=lambda value: value.get("createdAt", ""), reverse=True)
    return ok({"portfolio": portfolio, "nextCursor": next_cursor})


def get_reviews_admin(event: dict) -> dict:
    params = query_params(event)
    # Exclude aggregate/stats rows that share the table (e.g. reviewId = 'AGGREGATE#...')
    items, next_cursor = scan_items(
        get_config().table_reviews,
        filter_expression=Attr("reviewId").exists() & Attr("clientName").exists(),
        limit=min(int(params.get("limit", "50")), 100),
        cursor=params.get("cursor"),
    )
    reviews = sorted(items, key=lambda value: value.get("createdAt", ""), reverse=True)
    return ok({"reviews": reviews, "nextCursor": next_cursor})


def get_business_settings_admin(event: dict) -> dict:
    settings = get_item(get_config().table_business_settings, SETTINGS_KEY)
    if not settings:
        return not_found("Business settings have not been configured.")
    return ok(settings)


def get_audit_log(event: dict) -> dict:
    params = query_params(event)
    items, next_cursor = scan_items(
        get_config().table_audit_log,
        filter_expression=Attr("logId").exists(),
        limit=min(int(params.get("limit", "25")), 100),
        cursor=params.get("cursor"),
    )
    entries = sorted(items, key=lambda value: value.get("createdAt", ""), reverse=True)
    return ok({"entries": entries, "nextCursor": next_cursor})


def update_appointment(event: dict, admin_user_id: str) -> dict:
    body = AppointmentPatch.model_validate(parse_json_body(event))
    appointment_id = resource_id(event, "appointmentId")
    now = utc_now()
    existing = get_item(get_config().table_appointments, {"appointmentId": appointment_id})
    if not existing:
        return not_found("Appointment not found.")
    try:
        updated = update_item(
            get_config().table_appointments,
            {"appointmentId": appointment_id},
            {"status": body.status, "statusKey": body.status, "adminNote": body.adminNote, "updatedAt": now},
        )
    except NotFoundError:
        return not_found("Appointment not found.")
    audit(admin_user_id, f"appointment.{body.status}", "appointment", appointment_id)
    updated["clientEmail"] = decrypt_pii(updated.get("clientEmail"))
    updated["clientPhone"] = decrypt_pii(updated.get("clientPhone"))
    return ok(updated)


def _get_appointment_or_404(appointment_id: str) -> dict | None:
    return get_item(get_config().table_appointments, {"appointmentId": appointment_id})


def _decrypt_appointment(appt: dict) -> dict:
    appt["clientEmail"] = decrypt_pii(appt.get("clientEmail"))
    appt["clientPhone"] = decrypt_pii(appt.get("clientPhone"))
    return appt


def _trigger_stripe_refund(appointment_id: str, charge_id: str, idempotency_suffix: str) -> None:
    """Move deposit to refund_pending, call Stripe, handle rollback on failure."""
    config = get_config()
    now = utc_now()
    update_item(
        config.table_appointments,
        {"appointmentId": appointment_id},
        {"depositStatus": "refund_pending", "refundStatus": "pending", "updatedAt": now},
    )
    try:
        create_refund(charge_id, idempotency_key=f"{appointment_id}-{idempotency_suffix}")
    except Exception:
        update_item(
            config.table_appointments,
            {"appointmentId": appointment_id},
            {"depositStatus": "paid", "refundStatus": "none", "updatedAt": utc_now()},
        )
        raise


def admin_cancel_refund(event: dict, admin_user_id: str) -> dict:
    """Cancel by Salon + Refund Deposit. Always results in a full refund."""
    appointment_id = resource_id(event, "appointmentId")
    existing = _get_appointment_or_404(appointment_id)
    if not existing:
        return not_found("Appointment not found.")

    deposit_status = existing.get("depositStatus")
    if deposit_status == "refunded":
        return bad_request("Deposit has already been refunded.")
    if deposit_status == "refund_pending":
        return bad_request("A refund is already being processed.")

    charge_id = existing.get("stripeChargeId")
    now = utc_now()

    if deposit_status == "paid" and charge_id:
        try:
            _trigger_stripe_refund(appointment_id, charge_id, "admin-cancel")
        except Exception:
            logger.exception("Stripe refund failed in admin_cancel_refund", extra={"appointmentId": appointment_id})
            return bad_request("Refund processing failed. Please try again or contact Stripe support.")
        final_deposit_status = "refund_pending"
    else:
        # No charge on record — cancel without refund
        final_deposit_status = deposit_status or ""

    updated = update_item(
        get_config().table_appointments,
        {"appointmentId": appointment_id},
        {"status": "cancelled", "statusKey": "cancelled", "updatedAt": now},
    )
    audit(
        admin_user_id,
        "appointment.admin_cancel_refund",
        "appointment",
        appointment_id,
        {"depositStatus": final_deposit_status},
    )
    _send_admin_cancel_email(existing)
    notify_admin(
        f"Appointment cancelled by admin: {existing.get('serviceName', '')}",
        f"Client: {existing.get('clientName', '')} | {_fmt_date(existing.get('preferredDate', ''))}",
        html_body=_notify_admin_html(
            "Appointment Cancelled by Admin",
            f"Admin cancelled {existing.get('clientName', '')}'s "
            f"{existing.get('serviceName', '')} on {_fmt_date(existing.get('preferredDate', ''))}.",
            [
                ("Client", existing.get("clientName", "")),
                ("Service", existing.get("serviceName", "")),
                ("Date", _fmt_date(existing.get("preferredDate", ""))),
                ("Time", _fmt_time(existing.get("preferredTime", ""))),
                ("Refund", "Initiated" if final_deposit_status == "refund_pending" else "N/A"),
            ],
            accent_color=ACCENT_CANCELLED,
        ),
    )
    return ok(_decrypt_appointment(updated))


def admin_reschedule(event: dict, admin_user_id: str) -> dict:
    """Admin reschedules appointment. Deposit stays paid (transfers in place)."""
    appointment_id = resource_id(event, "appointmentId")
    try:
        body = AdminRescheduleBody.model_validate(parse_json_body(event))
    except ValidationError as exc:
        return bad_request(validation_errors(exc))

    existing = _get_appointment_or_404(appointment_id)
    if not existing:
        return not_found("Appointment not found.")

    old_date = existing["preferredDate"]
    old_time = existing["preferredTime"]
    now = utc_now()

    updates: dict = {
        "preferredDate": body.preferredDate,
        "preferredTime": body.preferredTime,
        "rescheduledAt": now,
        "rescheduledFrom": f"{old_date}T{old_time}",
        "rescheduledBy": "admin",
        "updatedAt": now,
    }
    if body.reason:
        updates["adminNotes"] = body.reason

    try:
        updated = update_item(get_config().table_appointments, {"appointmentId": appointment_id}, updates)
    except NotFoundError:
        return not_found("Appointment not found.")

    audit(
        admin_user_id,
        "appointment.admin_rescheduled",
        "appointment",
        appointment_id,
        {"from": f"{old_date}T{old_time}", "to": f"{body.preferredDate}T{body.preferredTime}", "reason": body.reason},
    )
    _send_admin_reschedule_email(existing, body.preferredDate, body.preferredTime)
    notify_admin(
        f"Appointment rescheduled by admin: {existing.get('serviceName', '')}",
        f"Client: {existing.get('clientName', '')} | {_fmt_date(old_date)} → {_fmt_date(body.preferredDate)}",
        html_body=_notify_admin_html(
            "Appointment Rescheduled by Admin",
            f"Admin rescheduled {existing.get('clientName', '')}'s {existing.get('serviceName', '')}.",
            [
                ("Client", existing.get("clientName", "")),
                ("Service", existing.get("serviceName", "")),
                ("Previous date", _fmt_date(old_date)),
                ("Previous time", _fmt_time(old_time)),
                ("New date", _fmt_date(body.preferredDate)),
                ("New time", _fmt_time(body.preferredTime)),
            ],
            accent_color=ACCENT_RESCHEDULED,
        ),
    )
    return ok(_decrypt_appointment(updated))


def admin_refund(event: dict, admin_user_id: str) -> dict:
    """Manually refund the deposit without cancelling the appointment (edge case)."""
    appointment_id = resource_id(event, "appointmentId")
    existing = _get_appointment_or_404(appointment_id)
    if not existing:
        return not_found("Appointment not found.")

    deposit_status = existing.get("depositStatus")
    if deposit_status == "refunded":
        return ok({"message": "Deposit has already been refunded.", "depositStatus": "refunded"})
    if deposit_status == "refund_pending":
        return bad_request("A refund is already being processed.")
    if deposit_status != "paid":
        return bad_request(f"Cannot refund: deposit status is '{deposit_status}'.")

    charge_id = existing.get("stripeChargeId")
    if not charge_id:
        return bad_request("No Stripe charge on record. Refund must be processed manually in Stripe dashboard.")

    try:
        _trigger_stripe_refund(appointment_id, charge_id, "admin-manual-refund")
    except Exception:
        logger.exception("Stripe refund failed in admin_refund", extra={"appointmentId": appointment_id})
        return bad_request("Refund processing failed. Please try again.")

    audit(admin_user_id, "appointment.admin_manual_refund", "appointment", appointment_id)
    updated = _get_appointment_or_404(appointment_id) or existing
    return ok(_decrypt_appointment(dict(updated)))


def admin_forfeit(event: dict, admin_user_id: str) -> dict:
    """Mark deposit as forfeited. Used for late cancel or no-show."""
    appointment_id = resource_id(event, "appointmentId")
    try:
        body = AdminForfeitBody.model_validate(parse_json_body(event))
    except ValidationError as exc:
        return bad_request(validation_errors(exc))

    existing = _get_appointment_or_404(appointment_id)
    if not existing:
        return not_found("Appointment not found.")

    now = utc_now()
    new_status = "cancelled" if body.action == "late_cancel" else "no_show"
    updates: dict = {
        "status": new_status,
        "statusKey": new_status,
        "depositStatus": "forfeited",
        "updatedAt": now,
    }
    if body.reason:
        updates["adminNotes"] = body.reason

    try:
        updated = update_item(get_config().table_appointments, {"appointmentId": appointment_id}, updates)
    except NotFoundError:
        return not_found("Appointment not found.")

    audit(
        admin_user_id,
        f"appointment.{body.action}_deposit_forfeited",
        "appointment",
        appointment_id,
        {"reason": body.reason},
    )
    _send_admin_forfeit_email(existing, body.action)
    notify_admin(
        f"{'Late cancel' if body.action == 'late_cancel' else 'No-show'}: {existing.get('serviceName', '')}",
        f"Client: {existing.get('clientName', '')} | "
        f"{_fmt_date(existing.get('preferredDate', ''))} — deposit forfeited.",
        html_body=_notify_admin_html(
            "Late Cancel — Deposit Forfeited" if body.action == "late_cancel" else "No-Show — Deposit Forfeited",
            f"{existing.get('clientName', '')}'s deposit was forfeited ({body.action.replace('_', ' ')}).",
            [
                ("Client", existing.get("clientName", "")),
                ("Service", existing.get("serviceName", "")),
                ("Date", _fmt_date(existing.get("preferredDate", ""))),
                ("Time", _fmt_time(existing.get("preferredTime", ""))),
                ("Reason", body.reason or "—"),
            ],
            accent_color=ACCENT_FORFEITED if body.action == "late_cancel" else ACCENT_NOSHOW,
        ),
    )
    return ok(_decrypt_appointment(updated))


def admin_override(event: dict, admin_user_id: str) -> dict:
    """Record an override reason for <24hr exceptions. Does not change status or deposit."""
    appointment_id = resource_id(event, "appointmentId")
    try:
        body = AdminOverrideBody.model_validate(parse_json_body(event))
    except ValidationError as exc:
        return bad_request(validation_errors(exc))

    existing = _get_appointment_or_404(appointment_id)
    if not existing:
        return not_found("Appointment not found.")

    now = utc_now()
    try:
        updated = update_item(
            get_config().table_appointments,
            {"appointmentId": appointment_id},
            {
                "adminOverrideReason": body.reason,
                "adminOverrideAt": now,
                "adminOverrideBy": admin_user_id,
                "updatedAt": now,
            },
        )
    except NotFoundError:
        return not_found("Appointment not found.")

    audit(admin_user_id, "appointment.admin_override", "appointment", appointment_id, {"reason": body.reason})
    return ok(_decrypt_appointment(updated))


def _normalized_gallery(cover: str, images: list[str] | None) -> list[str] | None:
    """Cover-first, deduped photo list — or None when over the cap."""
    gallery = [cover]
    for url in images or []:
        if url not in gallery:
            gallery.append(url)
    return gallery if len(gallery) <= MAX_SERVICE_PHOTOS else None


def create_service(event: dict, admin_user_id: str) -> dict:
    body = ServiceWrite.model_validate(parse_json_body(event))
    validate_cdn_url(body.imageUrl, "services")
    gallery = _normalized_gallery(body.imageUrl, body.images)
    if gallery is None:
        return bad_request(f"A service can have at most {MAX_SERVICE_PHOTOS} photos.")
    for url in gallery[1:]:
        validate_cdn_url(url, "services")
    now = utc_now()
    service_id = new_id()
    item = body.model_dump(exclude={"images"})
    # "From $X" is always the cheapest length when length pricing is set.
    if body.lengths:
        item["startingPrice"] = min(length.price for length in body.lengths)
    item.update(
        {
            "serviceId": service_id,
            "priceUnit": "cents",
            "activeKey": str(body.active).lower(),
            "images": gallery,
            "displayOrder": 999,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    put_item(get_config().table_services, item)
    audit(admin_user_id, "service.created", "service", service_id, {"name": body.name})
    return created(item)


def patch_service(event: dict, admin_user_id: str) -> dict:
    body = ServicePatch.model_validate(parse_json_body(event))
    add_image = body.addImage
    remove_image = body.removeImage
    all_fields = body.model_dump(exclude_unset=True, exclude={"addImage", "removeImage"})
    set_fields = {k: v for k, v in all_fields.items() if v is not None}
    remove_fields = [k for k, v in all_fields.items() if v is None]
    if not set_fields and not remove_fields and not add_image and not remove_image:
        return bad_request("No service fields provided.")
    service_id = resource_id(event, "serviceId")
    if set_fields.get("imageUrl"):
        validate_cdn_url(set_fields["imageUrl"], "services")
    if add_image:
        validate_cdn_url(add_image, "services")
    if "active" in set_fields:
        set_fields["activeKey"] = str(set_fields["active"]).lower()
    if set_fields.get("lengths"):
        # Keep the "From $X" price honest: always the cheapest length.
        set_fields["startingPrice"] = min(length["price"] for length in set_fields["lengths"])
    try:
        if set_fields or remove_fields:
            set_fields["updatedAt"] = utc_now()
            updated = update_item_with_removes(
                get_config().table_services, {"serviceId": service_id}, set_fields, remove_fields
            )
        else:
            existing = get_item(get_config().table_services, {"serviceId": service_id})
            if not existing:
                return not_found("Service not found.")
            updated = existing
        if add_image:
            gallery = updated.get("images") or []
            if len(gallery) >= MAX_SERVICE_PHOTOS:
                return bad_request(
                    f"This service already has {MAX_SERVICE_PHOTOS} photos — remove one before adding another."
                )
            if add_image in gallery:
                return bad_request("That photo is already in this service's gallery.")
            updated = append_list_item(get_config().table_services, {"serviceId": service_id}, "images", add_image)
        if remove_image:
            # The cover must stay a member of the gallery: make another photo
            # the cover first, then remove this one.
            if remove_image == updated.get("imageUrl"):
                return bad_request("That photo is the cover — choose another cover photo first.")
            gallery = [url for url in (updated.get("images") or []) if url != remove_image]
            updated = update_item(
                get_config().table_services,
                {"serviceId": service_id},
                {"images": gallery, "updatedAt": utc_now()},
            )
    except NotFoundError:
        return not_found("Service not found.")
    changed_fields = sorted(
        list(all_fields.keys())
        + (["addImage"] if add_image else [])
        + (["removeImage"] if remove_image else [])
    )
    audit(admin_user_id, "service.updated", "service", service_id, {"fields": changed_fields})
    return ok(updated)


def delete_service(event: dict, admin_user_id: str) -> dict:
    service_id = resource_id(event, "serviceId")
    existing = get_item(get_config().table_services, {"serviceId": service_id})
    if not existing:
        return not_found("Service not found.")
    if not existing.get("active", True):
        # already inactive — permanently remove
        delete_item(get_config().table_services, {"serviceId": service_id})
        audit(admin_user_id, "service.deleted_permanently", "service", service_id)
        return ok({"message": "Service permanently deleted."})
    # active — soft-delete (deactivate and remove from homepage)
    try:
        update_item(
            get_config().table_services,
            {"serviceId": service_id},
            {"active": False, "activeKey": "false", "featured": False, "updatedAt": utc_now()},
        )
    except NotFoundError:
        return not_found("Service not found.")
    audit(admin_user_id, "service.deactivated", "service", service_id)
    return ok({"message": "Service deactivated."})


def create_portfolio(event: dict, admin_user_id: str) -> dict:
    body = PortfolioWrite.model_validate(parse_json_body(event))
    validate_cdn_url_any(body.imageUrl)
    validate_cdn_url_any(body.thumbnailUrl)
    gallery = _normalized_gallery(body.imageUrl, body.images)
    if gallery is None:
        return bad_request(f"A gallery photo can have at most {MAX_SERVICE_PHOTOS} pictures.")
    for url in gallery[1:]:
        validate_cdn_url_any(url)
    now = utc_now()
    style_id = new_id()
    item = body.model_dump(exclude={"images"})
    item.update(
        {
            "styleId": style_id,
            "activeKey": str(body.active).lower(),
            "images": gallery,
            "createdAt": now,
            "updatedAt": now,
        }
    )
    put_item(get_config().table_portfolio, item)
    audit(admin_user_id, "portfolio.created", "portfolio", style_id, {"title": body.title})
    return created(item)


def patch_portfolio(event: dict, admin_user_id: str) -> dict:
    body = PortfolioPatch.model_validate(parse_json_body(event))
    add_image = body.addImage
    remove_image = body.removeImage
    updates = body.model_dump(exclude_none=True, exclude={"addImage", "removeImage"})
    if not updates and not add_image and not remove_image:
        return bad_request("No portfolio fields provided.")
    if updates.get("imageUrl"):
        validate_cdn_url_any(updates["imageUrl"])
    if updates.get("thumbnailUrl"):
        validate_cdn_url_any(updates["thumbnailUrl"])
    if add_image:
        validate_cdn_url_any(add_image)
    if "active" in updates:
        updates["activeKey"] = str(updates["active"]).lower()
    style_id = resource_id(event, "styleId")
    try:
        if updates:
            updates["updatedAt"] = utc_now()
            updated = update_item(get_config().table_portfolio, {"styleId": style_id}, updates)
        else:
            existing = get_item(get_config().table_portfolio, {"styleId": style_id})
            if not existing:
                return not_found("Portfolio item not found.")
            updated = existing
        # Same gallery rules as services: capped, deduped, cover always kept.
        if add_image:
            gallery = updated.get("images") or []
            if len(gallery) >= MAX_SERVICE_PHOTOS:
                return bad_request(
                    f"This photo already has {MAX_SERVICE_PHOTOS} pictures — remove one before adding another."
                )
            if add_image in gallery:
                return bad_request("That picture is already in this photo's gallery.")
            updated = append_list_item(get_config().table_portfolio, {"styleId": style_id}, "images", add_image)
        if remove_image:
            if remove_image == updated.get("imageUrl"):
                return bad_request("That picture is the cover — choose another cover first.")
            gallery = [url for url in (updated.get("images") or []) if url != remove_image]
            updated = update_item(
                get_config().table_portfolio,
                {"styleId": style_id},
                {"images": gallery, "updatedAt": utc_now()},
            )
    except NotFoundError:
        return not_found("Portfolio item not found.")
    changed = sorted(
        list(updates) + (["addImage"] if add_image else []) + (["removeImage"] if remove_image else [])
    )
    audit(admin_user_id, "portfolio.updated", "portfolio", style_id, {"fields": changed})
    return ok(updated)


def delete_portfolio(event: dict, admin_user_id: str) -> dict:
    style_id = resource_id(event, "styleId")
    delete_item(get_config().table_portfolio, {"styleId": style_id})
    audit(admin_user_id, "portfolio.deleted", "portfolio", style_id)
    return ok({"message": "Portfolio item deleted."})


def create_review(event: dict, admin_user_id: str) -> dict:
    body = ReviewWrite.model_validate(parse_json_body(event))
    now = utc_now()
    review_id = new_id()
    item = body.model_dump()
    item.update(
        {
            "reviewId": review_id,
            "approvedKey": str(body.approved).lower(),
            "createdAt": now,
            "updatedAt": now,
        }
    )
    put_item(get_config().table_reviews, item)
    recalculate_review_aggregate()
    audit(admin_user_id, "review.created", "review", review_id)
    return created(item)


def patch_review(event: dict, admin_user_id: str) -> dict:
    body = ReviewPatch.model_validate(parse_json_body(event))
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return bad_request("No review fields provided.")
    if "approved" in updates:
        updates["approvedKey"] = str(updates["approved"]).lower()
    review_id = resource_id(event, "reviewId")
    updates["updatedAt"] = utc_now()
    try:
        updated = update_item(get_config().table_reviews, {"reviewId": review_id}, updates)
    except NotFoundError:
        return not_found("Review not found.")
    recalculate_review_aggregate()
    audit(admin_user_id, "review.updated", "review", review_id, {"fields": sorted(updates)})
    return ok(updated)


def delete_review(event: dict, admin_user_id: str) -> dict:
    review_id = resource_id(event, "reviewId")
    delete_item(get_config().table_reviews, {"reviewId": review_id})
    recalculate_review_aggregate()
    audit(admin_user_id, "review.deleted", "review", review_id)
    return ok({"message": "Review deleted."})


def recalculate_review_aggregate() -> None:
    review_items: list[dict[str, Any]] = []
    cursor = None
    while True:
        reviews, cursor = scan_items(
            get_config().table_reviews,
            filter_expression=bool_filter("approved", True),
            limit=100,
            cursor=cursor,
        )
        review_items.extend(item for item in reviews if not str(item.get("reviewId", "")).startswith("AGGREGATE#"))
        if not cursor:
            break
    total = len(review_items)
    rating_sum = sum(int(item.get("rating", 0)) for item in review_items)
    # DynamoDB rejects Python floats — the average must be a Decimal.
    average = Decimal(str(round(rating_sum / total, 2))) if total else Decimal("0")
    put_item(
        get_config().table_reviews,
        {
            "reviewId": "AGGREGATE#RATINGS",
            "totalCount": total,
            "sumRatings": rating_sum,
            "averageRating": average,
            "updatedAt": utc_now(),
        },
    )


def get_contact_messages(event: dict) -> dict:
    params = query_params(event)
    filter_expression = Attr("messageId").exists()
    if params.get("read") in {"true", "false"}:
        filter_expression = filter_expression & bool_filter("read", params["read"] == "true")
    items, next_cursor = scan_items(
        get_config().table_contact_messages,
        filter_expression=filter_expression,
        limit=min(int(params.get("limit", "25")), 50),
        cursor=params.get("cursor"),
    )
    messages = []
    for item in sorted(items, key=lambda value: value.get("createdAt", ""), reverse=True):
        item["email"] = decrypt_pii(item.get("email"))
        item["phone"] = decrypt_pii(item.get("phone"))
        messages.append(item)
    return ok({"messages": messages, "nextCursor": next_cursor})


def patch_contact_message(event: dict, admin_user_id: str) -> dict:
    message_id = resource_id(event, "messageId")
    body = parse_json_body(event)
    updates: dict[str, Any] = {}
    if "read" in body:
        if not isinstance(body["read"], bool):
            return bad_request("Field 'read' must be a boolean.")
        updates["read"] = body["read"]
    if not updates:
        return bad_request("No updatable fields provided.")
    updates["updatedAt"] = utc_now()
    try:
        updated = update_item(get_config().table_contact_messages, {"messageId": message_id}, updates)
    except NotFoundError:
        return not_found("Contact message not found.")
    audit(admin_user_id, "contact_message.updated", "contact_message", message_id, {"fields": sorted(updates)})
    return ok(updated)


def reply_to_contact_message(event: dict, admin_user_id: str) -> dict:
    from html import escape

    from common.email_layout import email_layout
    from common.ses_client import send_email

    message_id = resource_id(event, "messageId")
    body = parse_json_body(event)
    reply_text = body.get("reply", "").strip()
    if not reply_text:
        return bad_request("Reply text is required.")

    try:
        item = get_item(get_config().table_contact_messages, {"messageId": message_id})
    except NotFoundError:
        return not_found("Contact message not found.")

    assert item is not None
    client_email = decrypt_pii(item.get("email"))
    if not client_email:
        return bad_request("This message has no email address to reply to.")

    client_name = item.get("name", "there")
    original_message = item.get("message", "")

    subject = "Re: Your inquiry to Braids by Deb"
    text_body = (
        f'Hi {client_name},\n\n{reply_text}\n\nBraids by Deb\n\n---\nYour original message:\n"{original_message}"'
    )
    reply_block = f"""
      <tr>
        <td style="padding: 14px 32px 30px 32px;">
          <p style="margin: 0 0 18px 0; color: #2C1810; font: 400 15px/1.7 Arial, sans-serif;
            white-space: pre-wrap;">{escape(reply_text)}</p>
          <hr style="border: none; border-top: 1px solid #E4D9CE; margin: 20px 0;" />
          <p style="margin: 0; color: #A07850; font: 400 13px/1.6 Arial, sans-serif;">
            Your original message:<br/>
            <em style="color: #6B4226;">&ldquo;{escape(original_message)}&rdquo;</em>
          </p>
        </td>
      </tr>
    """
    html_body = email_layout(
        preheader="Braids by Deb replied to your inquiry.",
        title="Reply from Braids by Deb",
        intro=f"Hi {client_name}, here is our reply to your recent inquiry.",
        content=reply_block,
        cta_label="Book an Appointment",
        cta_url=f"{get_config().allowed_origin}/book",
    )

    try:
        send_email(to_address=client_email, subject=subject, text_body=text_body, html_body=html_body)
    except Exception:
        return ok({"sent": False, "error": "Email delivery failed. Please try again."})

    updates = {
        "read": True,
        "replied": True,
        "replyText": reply_text,
        "repliedAt": utc_now(),
        "repliedBy": admin_user_id,
        "updatedAt": utc_now(),
    }
    updated = update_item(get_config().table_contact_messages, {"messageId": message_id}, updates)
    updated["email"] = decrypt_pii(updated.get("email"))
    updated["phone"] = decrypt_pii(updated.get("phone"))
    audit(admin_user_id, "contact_message.replied", "contact_message", message_id, {})
    return ok({**updated, "sent": True})


def patch_business_settings(event: dict, admin_user_id: str) -> dict:
    body = BusinessSettingsPatch.model_validate(parse_json_body(event))
    all_fields = body.model_dump(exclude_unset=True)
    if not all_fields:
        return bad_request("No business settings fields provided.")
    set_fields = {k: v for k, v in all_fields.items() if v is not None}
    remove_fields = [k for k, v in all_fields.items() if v is None]
    set_fields["updatedAt"] = utc_now()
    set_fields["updatedBy"] = admin_user_id
    try:
        updated = update_item_with_removes(
            get_config().table_business_settings, SETTINGS_KEY, set_fields, remove_fields
        )
    except NotFoundError:
        return not_found("Business settings have not been configured.")
    changed_fields = sorted(list(set_fields.keys()) + remove_fields)
    audit(admin_user_id, "settings.updated", "settings", "BUSINESS#SETTINGS", {"fields": changed_fields})
    invalidate_business_settings_cache()
    logger.info("Business settings updated", extra=safe_extra({"adminId": admin_user_id}))
    return ok(updated)


def invalidate_business_settings_cache() -> None:
    distribution_id = get_config().business_settings_distribution_id
    if not distribution_id:
        return
    try:
        _cloudfront.create_invalidation(
            DistributionId=distribution_id,
            InvalidationBatch={
                "CallerReference": new_id(),
                "Paths": {"Quantity": 1, "Items": ["/business-settings"]},
            },
        )
    except Exception:
        logger.exception("CloudFront invalidation failed")


_ALLOWED_FOLDERS = {"services", "portfolio"}
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def generate_upload_url(event: dict, admin_user_id: str) -> dict:
    body = parse_json_body(event)
    folder = body.get("folder", "").strip().strip("/")
    if folder not in _ALLOWED_FOLDERS:
        return bad_request("folder must be 'services' or 'portfolio'")
    filename = body.get("filename", "").strip()
    if not filename:
        return bad_request("filename is required")
    content_type = body.get("contentType", "image/jpeg").strip()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        return bad_request("contentType must be a supported image type (jpeg, png, webp, gif)")
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)[:100]
    key = f"uploads/{folder}/{new_id()}/{safe_name}"
    config = get_config()
    s3_client = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    upload_url = s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": config.assets_bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=300,
    )
    public_url = f"{config.cdn_base_url}/{key}"
    audit(admin_user_id, "asset.upload_url_generated", "asset", key, {"folder": folder})
    return ok({"uploadUrl": upload_url, "key": key, "publicUrl": public_url})
