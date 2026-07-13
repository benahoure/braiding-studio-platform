from __future__ import annotations

from collections.abc import Callable

from aws_lambda_powertools.utilities.typing import LambdaContext

from appointments.availability_handler import lambda_handler as availability_handler
from appointments.handler import lambda_handler as appointments_handler
from appointments.portal_handler import lambda_handler as portal_handler
from business_settings.handler import lambda_handler as business_settings_handler
from common.http import method, path
from common.response import not_found, options
from contact.handler import lambda_handler as contact_handler
from portfolio.handler import lambda_handler as portfolio_handler
from reviews.handler import lambda_handler as reviews_handler
from services.handler import lambda_handler as services_handler
from webhooks.handler import lambda_handler as webhooks_handler

Handler = Callable[[dict, LambdaContext], dict]


def _normalize_path(value: str) -> str:
    normalized = value.rstrip("/")
    return normalized or "/"


def _resolve_handler(request_method: str, request_path: str) -> Handler | None:
    if request_method == "GET" and (request_path == "/services" or request_path.startswith("/services/")):
        return services_handler
    if request_method == "GET" and request_path == "/portfolio":
        return portfolio_handler
    if request_method in {"GET", "POST"} and request_path == "/reviews":
        return reviews_handler
    if request_method == "GET" and request_path == "/business-settings":
        return business_settings_handler

    # Availability calendar
    if request_method == "GET" and request_path == "/availability":
        return availability_handler

    # Booking flow — Step 1: create payment-intent hold
    if request_method == "POST" and request_path == "/appointments/payment-intent":
        return appointments_handler
    # Booking flow — Step 2: confirm after Stripe payment succeeds
    if request_method == "POST" and request_path.startswith("/appointments/") and request_path.endswith("/confirm"):
        return appointments_handler

    # Client portal — view, reschedule, cancel
    if request_path.startswith("/appointments/portal/"):
        if request_method in {"GET", "POST"}:
            return portal_handler

    # Stripe webhook
    if request_method == "POST" and request_path == "/webhooks/stripe":
        return webhooks_handler

    if request_method == "POST" and request_path == "/contact":
        return contact_handler
    return None


def lambda_handler(event: dict, context: LambdaContext) -> dict:
    request_method = method(event)
    if request_method == "OPTIONS":
        return options()

    handler = _resolve_handler(request_method, _normalize_path(path(event)))
    if handler is None:
        return not_found("Public route not found.")
    return handler(event, context)
