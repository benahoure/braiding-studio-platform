import json
import logging
import os
import re
import uuid
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key


LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

TIMEZONE = ZoneInfo(os.getenv("BUSINESS_TIMEZONE", "America/Chicago"))
DEPOSIT_AMOUNT = Decimal("50")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SERVICES = {
    "bb-small": {"name": "Small Box Braids", "category": "Box Braids", "price": 220, "duration": 360},
    "bb-medium": {"name": "Medium Box Braids", "category": "Box Braids", "price": 180, "duration": 300},
    "bb-large": {"name": "Large Box Braids", "category": "Box Braids", "price": 140, "duration": 180},
    "kl-small": {"name": "Small Knotless Braids", "category": "Knotless Braids", "price": 260, "duration": 420},
    "kl-medium": {"name": "Medium Knotless Braids", "category": "Knotless Braids", "price": 210, "duration": 360},
    "kl-large": {"name": "Large Knotless Braids", "category": "Knotless Braids", "price": 170, "duration": 240},
    "cr-straight": {"name": "Straight Back Cornrows", "category": "Cornrows", "price": 80, "duration": 120},
    "cr-goddess": {"name": "Goddess Cornrows", "category": "Cornrows", "price": 150, "duration": 240},
    "boho-small": {"name": "Small Boho Braids", "category": "Boho Braids", "price": 230, "duration": 360},
    "boho-medium": {"name": "Medium Boho Braids", "category": "Boho Braids", "price": 195, "duration": 300},
    "boho-twist": {"name": "Medium Twist Boho Braids", "category": "Boho Braids", "price": 215, "duration": 330},
    "fulani-classic": {"name": "Fulani Braids", "category": "Fulani Braids", "price": 130, "duration": 150},
    "fulani-style": {"name": "Fulani Hairstyle", "category": "Fulani Braids", "price": 150, "duration": 180},
    "kids-cornrows": {"name": "Kids Cornrows", "category": "Kids Braids", "price": 60, "duration": 90},
    "kids-box": {"name": "Kids Box Braids", "category": "Kids Braids", "price": 100, "duration": 150},
    "kids-ponytails": {"name": "Kids Braided Ponytails", "category": "Kids Braids", "price": 50, "duration": 60},
    "other-passion": {"name": "Passion Twists", "category": "Other", "price": 175, "duration": 270},
}

PAYMENT_METHODS = {"card", "zelle", "cashapp"}

dynamodb = boto3.resource("dynamodb")
ses = boto3.client("ses")
pinpoint = boto3.client("pinpoint")


def table(name_env):
    return dynamodb.Table(os.environ[name_env])


APPOINTMENTS_TABLE = table("APPOINTMENTS_TABLE_NAME")
CLIENTS_TABLE = table("CLIENTS_TABLE_NAME")
CONTACT_MESSAGES_TABLE = table("CONTACT_MESSAGES_TABLE_NAME")
REVIEWS_TABLE = table("REVIEWS_TABLE_NAME")
PAYMENTS_TABLE = table("PAYMENTS_TABLE_NAME")


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(body, default=serialize),
    }


def serialize(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def parse_body(event):
    body = event.get("body")
    if not body:
        return {}
    if event.get("isBase64Encoded"):
        import base64

        body = base64.b64decode(body).decode("utf-8")
    if isinstance(body, dict):
        return body
    return json.loads(body)


def bad_request(message, details=None):
    payload = {"message": message}
    if details is not None:
        payload["details"] = details
    return response(400, payload)


def not_found(message):
    return response(404, {"message": message})


def method_not_allowed():
    return response(405, {"message": "Method not allowed"})


def now_utc():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def validate_email(email):
    return bool(email and EMAIL_PATTERN.match(email.strip()))


def clean_string(value):
    if value is None:
        return ""
    return str(value).strip()


def generate_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


def get_service(service_id):
    return SERVICES.get(service_id)


def appointment_response(item):
    if not item:
        return None
    result = dict(item)
    result["id"] = result.get("appointmentId", result.get("id"))
    result["date"] = result.get("appointmentDate", result.get("date"))
    result["time"] = result.get("appointmentTime", result.get("time"))
    return result


def review_response(item):
    if not item:
        return None
    result = dict(item)
    result["id"] = result.get("reviewId", result.get("id"))
    return result


def query_client_by_email(email):
    items = CLIENTS_TABLE.query(
        IndexName="byEmail",
        KeyConditionExpression=Key("email").eq(email.lower()),
        Limit=1,
    ).get("Items", [])
    return items[0] if items else None


def query_client_by_phone(phone):
    items = CLIENTS_TABLE.query(
        IndexName="byPhoneNumber",
        KeyConditionExpression=Key("phoneNumber").eq(phone),
        Limit=1,
    ).get("Items", [])
    return items[0] if items else None


def upsert_client(full_name, email, phone, latest_booking_id=None):
    normalized_email = clean_string(email).lower()
    normalized_phone = clean_string(phone)
    existing = None
    if normalized_email:
        existing = query_client_by_email(normalized_email)
    if not existing and normalized_phone:
        existing = query_client_by_phone(normalized_phone)

    client_id = existing["clientId"] if existing else generate_id("client")
    item = {
        "clientId": client_id,
        "fullName": clean_string(full_name),
        "email": normalized_email,
        "phoneNumber": normalized_phone,
        "updatedAt": now_utc(),
    }
    if latest_booking_id:
        item["latestBookingId"] = latest_booking_id
    if not existing:
        item["createdAt"] = item["updatedAt"]
    else:
        item["createdAt"] = existing.get("createdAt", item["updatedAt"])
        item["bookingCount"] = int(existing.get("bookingCount", 0))
    if latest_booking_id:
        item["bookingCount"] = int(existing.get("bookingCount", 0)) + 1 if existing else 1

    CLIENTS_TABLE.put_item(Item=item)
    return item


def send_email(subject, text_body, recipient, reply_to=None):
    sender = os.environ["NOTIFICATION_EMAIL_FROM"]
    if not recipient:
        return
    try:
        kwargs = {
            "Source": sender,
            "Destination": {"ToAddresses": [recipient]},
            "Message": {
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": text_body}},
            },
        }
        if reply_to:
            kwargs["ReplyToAddresses"] = [reply_to]
        ses.send_email(**kwargs)
    except Exception as exc:  # pragma: no cover - runtime safety
        LOGGER.exception("Failed to send SES email: %s", exc)


def send_sms(phone_number, message):
    if os.getenv("ENABLE_SMS_REMINDERS", "false").lower() != "true":
        return False

    application_id = os.getenv("SMS_APPLICATION_ID")
    if not application_id or not phone_number:
        LOGGER.info("SMS skipped: missing application id or phone number")
        return False

    try:
        pinpoint.send_messages(
            ApplicationId=application_id,
            MessageRequest={
                "Addresses": {phone_number: {"ChannelType": "SMS"}},
                "MessageConfiguration": {
                    "SMSMessage": {
                        "Body": message,
                        "MessageType": "TRANSACTIONAL",
                        "OriginationNumber": os.getenv("SMS_ORIGINATION_NUMBER"),
                    }
                },
            },
        )
        return True
    except Exception as exc:  # pragma: no cover - runtime safety
        LOGGER.exception("Failed to send SMS: %s", exc)
        return False


def is_slot_booked(date_value, time_value, exclude_appointment_id=None):
    items = APPOINTMENTS_TABLE.query(
        IndexName="byAppointmentDate",
        KeyConditionExpression=Key("appointmentDate").eq(date_value),
    ).get("Items", [])

    for item in items:
        if item.get("appointmentTime") != time_value:
            continue
        if item.get("status") == "cancelled":
            continue
        if exclude_appointment_id and item.get("appointmentId") == exclude_appointment_id:
            continue
        return True
    return False


def list_appointments(email=None, status=None):
    if email:
        items = APPOINTMENTS_TABLE.query(
            IndexName="byClientEmail",
            KeyConditionExpression=Key("clientEmail").eq(email.lower()),
            ScanIndexForward=False,
        ).get("Items", [])
    else:
        items = APPOINTMENTS_TABLE.scan().get("Items", [])

    if status:
        items = [item for item in items if item.get("status") == status]

    return sorted(items, key=lambda item: item.get("createdAt", ""), reverse=True)


def appointment_datetime(date_value, time_value):
    return datetime.strptime(f"{date_value} {time_value}", "%Y-%m-%d %I:%M %p").replace(tzinfo=TIMEZONE)


def update_appointment(appointment_id, updates):
    expression_names = {}
    expression_values = {}
    expressions = []

    for index, (key, value) in enumerate(updates.items(), start=1):
        name_key = f"#field{index}"
        value_key = f":value{index}"
        expression_names[name_key] = key
        expression_values[value_key] = value
        expressions.append(f"{name_key} = {value_key}")

    APPOINTMENTS_TABLE.update_item(
        Key={"appointmentId": appointment_id},
        UpdateExpression="SET " + ", ".join(expressions),
        ExpressionAttributeNames=expression_names,
        ExpressionAttributeValues=expression_values,
    )


def get_appointment(appointment_id):
    return APPOINTMENTS_TABLE.get_item(Key={"appointmentId": appointment_id}).get("Item")


def summarize_appointment(item):
    return (
        f"Booking {item.get('appointmentId')}\n"
        f"Client: {item.get('clientName')} ({item.get('clientEmail')})\n"
        f"Service: {item.get('serviceName')}\n"
        f"When: {item.get('appointmentDate')} at {item.get('appointmentTime')}\n"
        f"Status: {item.get('status')}\n"
        f"Payment method: {item.get('paymentMethod')}\n"
        f"Notes: {item.get('notes') or 'None'}"
    )
