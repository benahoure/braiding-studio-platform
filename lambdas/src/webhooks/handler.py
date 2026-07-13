from __future__ import annotations

import stripe
from aws_lambda_powertools.utilities.typing import LambdaContext

from appointments.service import confirm_appointment_from_webhook
from common.config import get_config
from common.dynamo import get_item, update_item
from common.errors import NotFoundError
from common.ids import new_id, ttl_days, utc_now
from common.logger import logger
from common.response import bad_request, internal_error, ok, options
from common.stripe_client import construct_webhook_event


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return options()

    sig_header = event.get("headers", {}).get("stripe-signature") or event.get("headers", {}).get("Stripe-Signature")
    if not sig_header:
        return bad_request("Missing Stripe-Signature header.")

    raw_body = event.get("body", "")
    if event.get("isBase64Encoded"):
        import base64

        payload = base64.b64decode(raw_body)
    else:
        payload = raw_body.encode("utf-8") if isinstance(raw_body, str) else raw_body

    try:
        stripe_event = construct_webhook_event(payload, sig_header)
    except stripe.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        return bad_request("Invalid webhook signature.")

    event_type = stripe_event["type"]
    logger.info("Stripe webhook received", extra={"event_type": event_type, "event_id": stripe_event["id"]})

    try:
        if event_type == "payment_intent.succeeded":
            _handle_payment_intent_succeeded(stripe_event["data"]["object"])
        elif event_type in {"refund.updated", "refund.created"}:
            _handle_refund_event(stripe_event["data"]["object"])
        elif event_type == "refund.failed":
            _handle_refund_failed(stripe_event["data"]["object"])
        elif event_type == "charge.refunded":
            _handle_charge_refunded(stripe_event["data"]["object"])
        else:
            logger.info("Unhandled Stripe event type", extra={"event_type": event_type})
    except Exception:
        logger.exception("Error processing Stripe webhook", extra={"event_type": event_type})
        return internal_error()

    return ok({"received": True})


def _handle_payment_intent_succeeded(intent: dict) -> None:
    metadata = getattr(intent, "metadata", None)
    appointment_id = getattr(metadata, "appointmentId", None)
    if not appointment_id:
        logger.warning("payment_intent.succeeded: no appointmentId in metadata")
        return

    intent_id = getattr(intent, "id", "")
    latest_charge = getattr(intent, "latest_charge", None)
    charge_id = latest_charge if isinstance(latest_charge, str) else getattr(latest_charge, "id", None)

    confirm_appointment_from_webhook(appointment_id, charge_id, intent_id)


def _handle_refund_event(refund: dict) -> None:
    """
    Handle refund.created and refund.updated.

    Stripe fires a dedicated refund.failed event for failures, but also emits
    refund.updated(status=failed) at the same time. We handle both so that
    whichever arrives first (or if refund.failed is missed) the DB is still updated.
    """
    status = getattr(refund, "status", None)

    if status == "succeeded":
        metadata = getattr(refund, "metadata", None)
        appointment_id = getattr(metadata, "appointmentId", None)
        charge = getattr(refund, "charge", None)
        charge_id = charge if isinstance(charge, str) else None
        if appointment_id:
            _finalize_refund(appointment_id)
        elif charge_id:
            _finalize_refund_by_charge(charge_id)

    elif status == "failed":
        # Safety net: refund.updated(status=failed) and refund.failed both fire on failure.
        # _handle_refund_failed is idempotent so handling it twice is safe.
        _handle_refund_failed(refund)


def _handle_refund_failed(refund: dict) -> None:
    metadata = getattr(refund, "metadata", None)
    appointment_id = getattr(metadata, "appointmentId", None)
    charge = getattr(refund, "charge", None)
    charge_id = charge if isinstance(charge, str) else None
    failure_reason = getattr(refund, "failure_reason", None) or "unknown"
    logger.error(
        "Stripe refund failed",
        extra={
            "refundId": getattr(refund, "id", None),
            "appointmentId": appointment_id,
            "chargeId": charge_id,
            "failureReason": failure_reason,
        },
    )
    # Restore depositStatus to paid so admin can see and retry. Mark refundStatus failed.
    if appointment_id:
        _mark_refund_failed(appointment_id, failure_reason)
    elif charge_id:
        _mark_refund_failed_by_charge(charge_id, failure_reason)


def _mark_refund_failed(appointment_id: str, failure_reason: str) -> None:
    config = get_config()
    try:
        update_item(
            config.table_appointments,
            {"appointmentId": appointment_id},
            {
                "depositStatus": "paid",
                "refundStatus": "failed",
                "refundFailureReason": failure_reason,
                "updatedAt": utc_now(),
            },
        )
    except NotFoundError:
        logger.warning("Refund failed webhook: appointment not found", extra={"appointmentId": appointment_id})
    except Exception:
        logger.exception("Failed to mark refund as failed in DB", extra={"appointmentId": appointment_id})


def _mark_refund_failed_by_charge(charge_id: str, failure_reason: str) -> None:
    from boto3.dynamodb.conditions import Attr

    from common.dynamo import scan_items

    config = get_config()
    items, _ = scan_items(
        config.table_appointments,
        filter_expression=Attr("stripeChargeId").eq(charge_id),
        limit=5,
    )
    for item in items:
        _mark_refund_failed(item["appointmentId"], failure_reason)


def _handle_charge_refunded(charge: dict) -> None:
    """Compatibility handler for charge.refunded."""
    metadata = getattr(charge, "metadata", None)
    appointment_id = getattr(metadata, "appointmentId", None)
    charge_id = getattr(charge, "id", None)
    if appointment_id:
        _finalize_refund(appointment_id)
    elif charge_id:
        _finalize_refund_by_charge(charge_id)


def _finalize_refund(appointment_id: str) -> None:
    config = get_config()
    existing = get_item(config.table_appointments, {"appointmentId": appointment_id})
    if not existing:
        logger.warning("Refund webhook: appointment not found", extra={"appointmentId": appointment_id})
        return

    deposit_status = existing.get("depositStatus")
    if deposit_status == "refunded":
        logger.info("Refund webhook: already refunded, skipping", extra={"appointmentId": appointment_id})
        return

    if deposit_status != "refund_pending":
        logger.warning(
            "Refund webhook: unexpected depositStatus",
            extra={"appointmentId": appointment_id, "depositStatus": deposit_status},
        )

    try:
        update_item(
            config.table_appointments,
            {"appointmentId": appointment_id},
            {"depositStatus": "refunded", "refundStatus": "completed", "updatedAt": utc_now()},
        )
    except NotFoundError:
        pass

    _write_refund_audit(appointment_id)


def _finalize_refund_by_charge(charge_id: str) -> None:
    """Fallback: look up appointment by stripeChargeId when appointmentId is not in refund metadata."""
    from boto3.dynamodb.conditions import Attr

    from common.dynamo import scan_items

    config = get_config()
    items, _ = scan_items(
        config.table_appointments,
        filter_expression=Attr("stripeChargeId").eq(charge_id),
        limit=5,
    )
    for item in items:
        _finalize_refund(item["appointmentId"])


def _write_refund_audit(appointment_id: str) -> None:
    config = get_config()
    now = utc_now()
    try:
        from common.dynamo import put_item

        put_item(
            config.table_audit_log,
            {
                "logId": new_id(),
                "adminId": "stripe_webhook",
                "action": "appointment.refund_completed",
                "resourceType": "appointment",
                "resourceId": appointment_id,
                "detail": {"source": "stripe_webhook"},
                "createdAt": now,
                "expiresAt": ttl_days(365),
            },
        )
    except Exception:
        logger.warning("Failed to write refund audit log", extra={"appointmentId": appointment_id})
