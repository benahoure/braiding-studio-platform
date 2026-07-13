from __future__ import annotations

import boto3

from common.config import get_config
from common.logger import logger, safe_extra

_ses = boto3.client("ses")


def _sender() -> str:
    return f"Braids by Deb <{get_config().ses_sender_email}>"


def _admin_recipients() -> list[str]:
    raw = get_config().admin_alert_email
    return [addr.strip() for addr in raw.split(",") if addr.strip()]


def _ses_send(to_addresses: list[str], subject: str, text_body: str, html_body: str | None) -> None:
    body: dict = {"Text": {"Data": text_body, "Charset": "UTF-8"}}
    if html_body:
        body["Html"] = {"Data": html_body, "Charset": "UTF-8"}
    _ses.send_email(
        Source=_sender(),
        Destination={"ToAddresses": to_addresses},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": body,
        },
        ReplyToAddresses=[get_config().ses_sender_email],
    )


def send_email(*, to_address: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    try:
        _ses_send([to_address], subject, text_body, html_body)
    except Exception:
        logger.exception("SES send failed", extra=safe_extra({"email": to_address, "subject": subject}))
        raise


def best_effort_send_email(*, to_address: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    try:
        send_email(to_address=to_address, subject=subject, text_body=text_body, html_body=html_body)
        return True
    except Exception:
        return False


def notify_admin(subject: str, text_body: str, html_body: str | None = None) -> bool:
    try:
        recipients = _admin_recipients()
        if not recipients:
            logger.warning("notify_admin: no admin emails configured")
            return False
        _ses_send(recipients, subject, text_body, html_body)
        return True
    except Exception:
        logger.exception("SES notify_admin failed", extra=safe_extra({"subject": subject}))
        return False
