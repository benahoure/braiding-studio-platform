from __future__ import annotations

from common.config import get_config
from common.dynamo import put_item
from common.email_layout import admin_details_table, admin_email_layout, details_table, email_layout
from common.ids import new_id, ttl_days, utc_now
from common.security import encrypt_pii
from common.ses_client import best_effort_send_email, notify_admin
from contact.models import ContactRequest


def _customer_contact_html(name: str, services_text: str) -> str:
    rows: list[tuple[str, str | None]] = [
        ("Interested in", services_text if services_text != "none selected" else None),
        ("Response time", "Within 1 business day"),
    ]
    content = details_table(rows)
    return email_layout(
        preheader="Braids by Deb received your message — we'll respond within 1 business day.",
        title="Message Received",
        intro=(
            f"Hi {name}, thank you for reaching out to Braids by Deb! "
            "Your message has been received. We'll review it and respond within 1 business day."
        ),
        content=content,
        cta_label="View Our Services",
        cta_url=f"{get_config().allowed_origin}/services",
    )


def _admin_contact_html(
    name: str,
    phone: str,
    email: str | None,
    message: str,
    services_text: str,
    inspiration: str | None,
) -> str:
    rows: list[tuple[str, str | None]] = [
        ("From", name),
        ("Phone", phone),
        ("Email", email),
        ("Interested in", services_text if services_text != "none selected" else None),
        ("Inspiration photo", inspiration),
        ("Message", message),
    ]
    content = admin_details_table(rows)
    return admin_email_layout(
        preheader=f"New contact message from {name}.",
        title="New Contact Message",
        intro="A new message was submitted through the Braids by Deb contact form.",
        content=content,
        cta_label="Open Admin Dashboard",
        cta_url=f"{get_config().allowed_origin}/admin/contacts",
    )


def _admin_contact_text(name: str, phone: str, email: str | None, message: str, services_text: str) -> str:
    lines = [
        f"New contact message from {name}.",
        "",
        f"Phone: {phone}",
    ]
    if email:
        lines.append(f"Email: {email}")
    lines += [
        f"Services of interest: {services_text}",
        "",
        f"Message: {message}",
    ]
    return "\n".join(lines)


def create_contact_message(request: ContactRequest) -> dict:
    config = get_config()
    now = utc_now()
    message_id = new_id()
    services_text = ", ".join(request.services) if request.services else "none selected"
    put_item(
        config.table_contact_messages,
        {
            "messageId": message_id,
            "name": request.name,
            "email": encrypt_pii(str(request.email)) if request.email else None,
            "phone": encrypt_pii(request.phone),
            "message": request.message,
            "services": request.services,
            "inspirationPhotoName": request.inspirationPhotoName,
            "read": False,
            "readKey": "false",
            "createdAt": now,
            "expiresAt": ttl_days(365),
        },
    )
    if request.email:
        best_effort_send_email(
            to_address=str(request.email),
            subject="Braids by Deb received your message",
            text_body=(
                f"Hi {request.name},\n\n"
                "Thank you for reaching out to Braids by Deb! "
                "Your message has been received and we'll respond within 1 business day.\n\n"
                "Braids by Deb"
            ),
            html_body=_customer_contact_html(request.name, services_text),
        )
    notify_admin(
        f"New contact message from {request.name}",
        _admin_contact_text(
            request.name,
            request.phone,
            str(request.email) if request.email else None,
            request.message,
            services_text,
        ),
        html_body=_admin_contact_html(
            request.name,
            request.phone,
            str(request.email) if request.email else None,
            request.message,
            services_text,
            request.inspirationPhotoName,
        ),
    )
    return {
        "messageId": message_id,
        "message": "Thanks for reaching out! We'll respond within 1 business day.",
    }
