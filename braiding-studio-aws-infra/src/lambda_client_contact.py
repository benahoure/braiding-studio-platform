import os

from common import (
    CONTACT_MESSAGES_TABLE,
    bad_request,
    clean_string,
    generate_id,
    method_not_allowed,
    now_utc,
    parse_body,
    response,
    send_email,
    upsert_client,
    validate_email,
)


def handler(event, _context):
    method = event.get("requestContext", {}).get("http", {}).get("method")
    if method != "POST":
        return method_not_allowed()

    payload = parse_body(event)
    errors = {}
    if not clean_string(payload.get("name")):
        errors["name"] = "name is required"
    if not validate_email(payload.get("email")):
        errors["email"] = "Valid email is required"
    if not clean_string(payload.get("message")):
        errors["message"] = "message is required"
    if errors:
        return bad_request("Invalid contact payload", errors)

    message_id = generate_id("msg")
    message = {
        "messageId": message_id,
        "name": clean_string(payload["name"]),
        "email": clean_string(payload["email"]).lower(),
        "phone": clean_string(payload.get("phone")),
        "message": clean_string(payload["message"]),
        "status": "new",
        "createdAt": now_utc(),
        "updatedAt": now_utc(),
    }
    CONTACT_MESSAGES_TABLE.put_item(Item=message)
    upsert_client(message["name"], message["email"], message["phone"])

    owner_email = os.environ.get("NOTIFICATION_EMAIL_TO")
    if owner_email:
        send_email(
            "New contact form submission",
            f"Name: {message['name']}\nEmail: {message['email']}\nPhone: {message['phone'] or 'N/A'}\n\n{message['message']}",
            owner_email,
            reply_to=message["email"],
        )
    send_email(
        "We received your message",
        "Thank you for contacting Braids by Deb. We received your message and will get back to you within 24 hours.",
        message["email"],
    )

    return response(201, {"message": "Contact message received", "contactMessageId": message_id})
