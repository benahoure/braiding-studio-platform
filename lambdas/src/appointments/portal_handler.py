from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext
from pydantic import ValidationError

from appointments.models import RescheduleRequest
from appointments.portal_service import (
    WITHIN_24H_MESSAGE,
    get_portal_appointment,
    portal_cancel,
    portal_reschedule,
)
from common.errors import NotFoundError
from common.http import method, parse_json_body, path, validation_errors
from common.logger import logger
from common.response import bad_request, forbidden, internal_error, not_found, ok, options


def _extract_token(request_path: str) -> str | None:
    """Extract token from /appointments/portal/{token}[/action]."""
    parts = request_path.split("/")
    try:
        portal_idx = parts.index("portal")
        return parts[portal_idx + 1] if len(parts) > portal_idx + 1 else None
    except ValueError:
        return None


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()

    request_method = method(event)
    request_path = path(event)
    token = _extract_token(request_path)

    if not token:
        return not_found("Invalid portal link.")

    try:
        if request_method == "GET":
            result = get_portal_appointment(token)
            return ok(result)

        if request_method == "POST" and request_path.endswith("/reschedule"):
            try:
                body = parse_json_body(event)
                req = RescheduleRequest.model_validate(body)
            except (ValueError, ValidationError) as exc:
                msg = str(exc) if isinstance(exc, ValueError) else validation_errors(exc)
                return bad_request(msg)
            result = portal_reschedule(token, req)
            return ok(result)

        if request_method == "POST" and request_path.endswith("/cancel"):
            result = portal_cancel(token)
            return ok(result)

        return not_found("Portal route not found.")

    except NotFoundError as exc:
        return not_found(str(exc))
    except PermissionError:
        return forbidden(WITHIN_24H_MESSAGE)
    except ValueError as exc:
        return bad_request(str(exc))
    except Exception:
        logger.exception("Unexpected error in portal handler")
        return internal_error()
