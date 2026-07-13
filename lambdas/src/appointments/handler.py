from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext
from pydantic import ValidationError

from appointments.models import ConfirmAppointmentRequest, PaymentIntentRequest
from appointments.service import confirm_appointment, create_payment_intent_hold
from common.errors import NotFoundError
from common.honeypot import is_bot
from common.http import method, parse_json_body, path, path_parameter, validation_errors
from common.ids import new_id
from common.logger import logger, safe_extra
from common.response import bad_request, conflict, created, internal_error, not_found, ok, options


def _client_ip(event: dict) -> str | None:
    ctx = event.get("requestContext", {})
    forwarded = event.get("headers", {}).get("x-forwarded-for", "").split(",")[0].strip()
    return ctx.get("http", {}).get("sourceIp") or forwarded or None


def _user_agent(event: dict) -> str | None:
    return event.get("headers", {}).get("user-agent") or None


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()

    request_method = method(event)
    request_path = path(event)

    # POST /appointments/payment-intent  — Step 1: create hold + Stripe PaymentIntent
    if request_method == "POST" and request_path == "/appointments/payment-intent":
        return handle_payment_intent(event)

    # POST /appointments/{id}/confirm  — Step 2: frontend confirms after Stripe payment
    appointment_id = path_parameter(event, "appointmentId")
    if request_method == "POST" and appointment_id and request_path.endswith("/confirm"):
        return handle_confirm(event, appointment_id)

    return not_found("Appointment route not found.")


def handle_payment_intent(event: dict) -> dict:
    try:
        body = parse_json_body(event)
    except ValueError as exc:
        return bad_request(str(exc))

    if is_bot(body):
        logger.info("Appointment honeypot triggered", extra=safe_extra({"path": event.get("rawPath")}))
        return created(
            {
                "appointmentId": new_id(),
                "clientSecret": "pi_fake_secret",
            }
        )

    try:
        request = PaymentIntentRequest.model_validate(body)
    except ValidationError as exc:
        return bad_request(validation_errors(exc))

    try:
        result = create_payment_intent_hold(
            request,
            client_ip=_client_ip(event),
            user_agent=_user_agent(event),
        )
        return created(result)
    except ValueError as exc:
        return conflict(str(exc))
    except Exception:
        logger.exception("Unexpected error creating payment intent")
        return internal_error()


def handle_confirm(event: dict, appointment_id: str) -> dict:
    try:
        body = parse_json_body(event)
        req = ConfirmAppointmentRequest.model_validate(body)
    except (ValueError, ValidationError) as exc:
        return bad_request(str(exc) if isinstance(exc, ValueError) else validation_errors(exc))

    try:
        result = confirm_appointment(appointment_id, req)
        return ok(result)
    except NotFoundError as exc:
        return not_found(str(exc))
    except ValueError as exc:
        return bad_request(str(exc))
    except Exception as exc:
        import stripe as _stripe

        if isinstance(exc, _stripe.StripeError):
            logger.warning("Stripe API error during confirm", extra={"error": str(exc)})
            return bad_request(f"Payment verification failed: {exc.user_message or str(exc)}")
        logger.exception("Unexpected error confirming appointment")
        return internal_error()
