from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext
from pydantic import ValidationError

from common.honeypot import is_bot
from common.http import method, parse_json_body, validation_errors
from common.ids import new_id
from common.logger import logger, safe_extra
from common.response import bad_request, created, internal_error, options
from contact.models import ContactRequest
from contact.service import create_contact_message


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()
    try:
        body = parse_json_body(event)
    except ValueError as exc:
        return bad_request(str(exc))

    if is_bot(body):
        logger.info("Contact honeypot triggered", extra=safe_extra({"path": event.get("rawPath")}))
        return created(
            {
                "messageId": new_id(),
                "message": "Thanks for reaching out! We'll respond within 1 business day.",
            }
        )

    try:
        request = ContactRequest.model_validate(body)
    except ValidationError as exc:
        return bad_request(validation_errors(exc))

    try:
        return created(create_contact_message(request))
    except Exception:
        logger.exception("Unexpected error in contact submission")
        return internal_error()
