import json
import logging
import os
import re
import uuid
from datetime import datetime
from decimal import Decimal
from html import escape
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key


LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

TIMEZONE = ZoneInfo(os.getenv("BUSINESS_TIMEZONE", "America/Chicago"))
DEPOSIT_AMOUNT = Decimal("50")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SERVICES = {
    "bb-small": {
        "name": "Small Box Braids",
        "category": "Box Braids",
        "duration": 360,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 200},
            "waist-length": {"label": "Waist Length", "price": 300},
            "butt-length": {"label": "Butt Length", "price": 340},
        },
    },
    "bb-medium": {
        "name": "Medium Box Braids",
        "category": "Box Braids",
        "duration": 300,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 180},
            "waist-length": {"label": "Waist Length", "price": 240},
            "butt-length": {"label": "Butt Length", "price": 280},
        },
    },
    "bb-large": {
        "name": "Large Box Braids",
        "category": "Box Braids",
        "duration": 180,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 160},
            "waist-length": {"label": "Waist Length", "price": 200},
            "butt-length": {"label": "Butt Length", "price": 240},
        },
    },
    "kl-small": {
        "name": "Small Knotless Braids",
        "category": "Knotless Braids",
        "duration": 420,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 200},
            "waist-length": {"label": "Waist Length", "price": 300},
            "butt-length": {"label": "Butt Length", "price": 340},
        },
    },
    "kl-medium": {
        "name": "Medium Knotless Braids",
        "category": "Knotless Braids",
        "duration": 360,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 180},
            "waist-length": {"label": "Waist Length", "price": 240},
            "butt-length": {"label": "Butt Length", "price": 280},
        },
    },
    "kl-large": {
        "name": "Large Knotless Braids",
        "category": "Knotless Braids",
        "duration": 240,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 160},
            "waist-length": {"label": "Waist Length", "price": 200},
            "butt-length": {"label": "Butt Length", "price": 240},
        },
    },
    "boho-small": {
        "name": "Small Boho Braids",
        "category": "Boho Braids",
        "duration": 360,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 280},
            "waist-length": {"label": "Waist Length", "price": 320},
            "butt-length": {"label": "Butt Length", "price": 360},
        },
    },
    "boho-medium": {
        "name": "Medium Boho Braids",
        "category": "Boho Braids",
        "duration": 300,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 240},
            "waist-length": {"label": "Waist Length", "price": 280},
            "butt-length": {"label": "Butt Length", "price": 320},
        },
    },
    "boho-large": {
        "name": "Large Boho Braids",
        "category": "Boho Braids",
        "duration": 240,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 200},
            "waist-length": {"label": "Waist Length", "price": 240},
            "butt-length": {"label": "Butt Length", "price": 280},
        },
    },
    "twist-small": {
        "name": "Small Twist Braids",
        "category": "Twist Braids",
        "duration": 330,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 260},
            "waist-length": {"label": "Waist Length", "price": 300},
            "butt-length": {"label": "Butt Length", "price": 340},
        },
    },
    "twist-medium": {
        "name": "Medium Twist Braids",
        "category": "Twist Braids",
        "duration": 270,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 220},
            "waist-length": {"label": "Waist Length", "price": 240},
            "butt-length": {"label": "Butt Length", "price": 280},
        },
    },
    "twist-large": {
        "name": "Large Twist Braids",
        "category": "Twist Braids",
        "duration": 210,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 200},
            "waist-length": {"label": "Waist Length", "price": 220},
            "butt-length": {"label": "Butt Length", "price": 260},
        },
    },
    "cornrows": {
        "name": "Cornrows",
        "category": "Cornrows",
        "duration": 180,
        "price": 180,
        "isStartingPrice": True,
    },
    "fulani-small": {
        "name": "Small Fulani Braids",
        "category": "Fulani Braids",
        "duration": 180,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 200},
            "waist-length": {"label": "Waist Length", "price": 300},
            "butt-length": {"label": "Butt Length", "price": 340},
        },
    },
    "fulani-medium": {
        "name": "Medium Fulani Braids",
        "category": "Fulani Braids",
        "duration": 150,
        "lengthOptions": {
            "mid-back": {"label": "Mid Back", "price": 180},
            "waist-length": {"label": "Waist Length", "price": 240},
            "butt-length": {"label": "Butt Length", "price": 280},
        },
    },
    "fulani-hairstyle": {
        "name": "Fulani Hairstyle",
        "category": "Fulani Braids",
        "duration": 180,
        "price": 150,
    },
    "kids-cornrows": {
        "name": "Kids Cornrows",
        "category": "Kids Braids",
        "duration": 90,
        "lengthOptions": {
            "mid": {"label": "Mid", "price": 120},
        },
    },
    "kids-box": {
        "name": "Kids Box Braids",
        "category": "Kids Braids",
        "duration": 150,
        "lengthOptions": {
            "mid": {"label": "Mid", "price": 160},
        },
    },
    "kids-knotless": {
        "name": "Kids Knotless",
        "category": "Kids Braids",
        "duration": 150,
        "lengthOptions": {
            "mid": {"label": "Mid", "price": 160},
        },
    },
    "kids-other": {
        "name": "Kids Other Styles",
        "category": "Kids Braids",
        "duration": 120,
        "lengthOptions": {
            "mid": {"label": "Mid", "price": 120},
        },
        "isStartingPrice": True,
    },
}

PAYMENT_METHODS = {"card", "zelle", "cashapp"}
PAYMENT_METHOD_DETAILS = {
    "card": {
        "label": "Bank Card",
        "instruction": "We will send you a secure payment link by text message after booking.",
    },
    "zelle": {
        "label": "Zelle",
        "instruction": 'Send the $50 deposit to (214) 555-0192 and use "Deposit" as the memo.',
    },
    "cashapp": {
        "label": "CashApp",
        "instruction": 'Send the $50 deposit to $BraidsByDeb and use "Deposit" as the memo.',
    },
}

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


def get_service_length_option(service, length_id=None):
    length_options = service.get("lengthOptions") or {}
    if not length_options:
        return None
    if length_id and length_id in length_options:
        option = length_options[length_id]
        return {"id": length_id, **option}
    if len(length_options) == 1:
        length_key, option = next(iter(length_options.items()))
        return {"id": length_key, **option}
    return None


def get_service_price(service, length_id=None):
    option = get_service_length_option(service, length_id)
    if option:
        return option["price"]
    return service.get("price")


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


def send_email(subject, text_body, recipient, reply_to=None, html_body=None):
    sender = os.environ["NOTIFICATION_EMAIL_FROM"]
    if not recipient:
        return
    try:
        body = {"Text": {"Data": text_body, "Charset": "UTF-8"}}
        if html_body:
            body["Html"] = {"Data": html_body, "Charset": "UTF-8"}
        kwargs = {
            "Source": sender,
            "Destination": {"ToAddresses": [recipient]},
            "Message": {
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": body,
            },
        }
        if reply_to:
            kwargs["ReplyToAddresses"] = [reply_to]
        ses.send_email(**kwargs)
    except Exception as exc:  # pragma: no cover - runtime safety
        LOGGER.exception("Failed to send SES email to %s with subject %s: %s", recipient, subject, exc)


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


def list_appointments(email=None, status=None, date_value=None):
    if email:
        items = APPOINTMENTS_TABLE.query(
            IndexName="byClientEmail",
            KeyConditionExpression=Key("clientEmail").eq(email.lower()),
            ScanIndexForward=False,
        ).get("Items", [])
    elif date_value:
        items = APPOINTMENTS_TABLE.query(
            IndexName="byAppointmentDate",
            KeyConditionExpression=Key("appointmentDate").eq(date_value),
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
        f"Length: {item.get('serviceLength') or 'N/A'}\n"
        f"When: {item.get('appointmentDate')} at {item.get('appointmentTime')}\n"
        f"Status: {item.get('status')}\n"
        f"Payment method: {item.get('paymentMethod')}\n"
        f"Notes: {item.get('notes') or 'None'}"
    )


def format_appointment_datetime(date_value, time_value):
    try:
        dt = appointment_datetime(date_value, time_value)
        return dt.strftime("%A, %B %d, %Y at %I:%M %p")
    except Exception:  # pragma: no cover - display fallback
        return f"{date_value} at {time_value}"


def payment_method_details(payment_method):
    return PAYMENT_METHOD_DETAILS.get(payment_method, {"label": payment_method or "Payment", "instruction": ""})


def render_booking_email(subject, headline, intro, item, detail_rows, accent_label=None, accent_value=None):
    escaped_subject = escape(subject)
    escaped_headline = escape(headline)
    escaped_intro = escape(intro)

    details_html = "".join(
        f"""
        <tr>
          <td style="padding:0 0 10px 0; color:#6f6f73; font-size:13px; letter-spacing:0.04em; text-transform:uppercase;">{escape(label)}</td>
          <td style="padding:0 0 10px 24px; color:#111111; font-size:15px; font-weight:500; text-align:right;">{escape(value)}</td>
        </tr>
        """
        for label, value in detail_rows
        if value
    )

    accent_html = ""
    if accent_label and accent_value:
        accent_html = f"""
        <div style="margin-top:24px; padding:16px 18px; border-radius:18px; background:#f6f6f7;">
          <div style="font-size:12px; color:#6f6f73; letter-spacing:0.04em; text-transform:uppercase; margin-bottom:6px;">{escape(accent_label)}</div>
          <div style="font-size:14px; line-height:1.6; color:#111111;">{escape(accent_value)}</div>
        </div>
        """

    return f"""<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111111;">
    <div style="padding:32px 16px;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 18px 60px rgba(17,17,17,0.08);">
        <div style="padding:28px 32px; background:linear-gradient(180deg, #f9f7f4 0%, #ffffff 100%); border-bottom:1px solid #ece8e1;">
          <div style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#b48a2c; margin-bottom:14px;">Braids by Deb</div>
          <div style="font-size:31px; line-height:1.18; font-weight:500; color:#111111; margin:0 0 12px 0;">{escaped_headline}</div>
          <div style="font-size:15px; line-height:1.7; color:#4f4f52;">{escaped_intro}</div>
        </div>
        <div style="padding:28px 32px 32px;">
          <div style="padding:22px 24px; border:1px solid #ece8e1; border-radius:22px; background:#fcfbf9;">
            <div style="font-size:12px; color:#8d7a54; letter-spacing:0.14em; text-transform:uppercase; margin-bottom:16px;">Appointment details</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              {details_html}
            </table>
          </div>
          {accent_html}
          <div style="margin-top:28px; font-size:12px; line-height:1.7; color:#8a8a8f;">
            Booking reference: {escape(item.get('appointmentId', ''))}<br>
            This confirmation was sent to {escape(item.get('clientEmail', ''))}.
          </div>
        </div>
      </div>
    </div>
  </body>
</html>"""


def booking_client_email_content(item):
    when_label = format_appointment_datetime(item.get("appointmentDate"), item.get("appointmentTime"))
    payment = payment_method_details(item.get("paymentMethod"))

    detail_rows = [
        ("Service", item.get("serviceName", "")),
        ("Length", item.get("serviceLength") or "N/A"),
        ("When", when_label),
        ("Price", f"${item.get('servicePrice')}"),
        ("Deposit", f"${int(DEPOSIT_AMOUNT)}"),
        ("Payment method", payment["label"]),
        ("Client", item.get("clientName", "")),
    ]
    if item.get("notes"):
        detail_rows.append(("Notes", item["notes"]))

    text_body = (
        "Your appointment is confirmed.\n\n"
        f"{summarize_appointment(item)}\n\n"
        f"Deposit instruction: {payment['instruction']}"
    )
    html_body = render_booking_email(
        subject=f"Your appointment is confirmed - {item.get('serviceName', '')}",
        headline="Your appointment is confirmed.",
        intro="We have reserved your time and your booking details are below.",
        item=item,
        detail_rows=detail_rows,
        accent_label="Next step",
        accent_value=payment["instruction"],
    )
    return text_body, html_body


def booking_owner_email_content(item):
    when_label = format_appointment_datetime(item.get("appointmentDate"), item.get("appointmentTime"))
    payment = payment_method_details(item.get("paymentMethod"))

    detail_rows = [
        ("Client", item.get("clientName", "")),
        ("Email", item.get("clientEmail", "")),
        ("Phone", item.get("clientPhone", "")),
        ("Service", item.get("serviceName", "")),
        ("Length", item.get("serviceLength") or "N/A"),
        ("When", when_label),
        ("Price", f"${item.get('servicePrice')}"),
        ("Payment method", payment["label"]),
        ("Status", item.get("status", "")),
    ]
    if item.get("notes"):
        detail_rows.append(("Notes", item["notes"]))

    text_body = f"A new appointment was booked.\n\n{summarize_appointment(item)}"
    html_body = render_booking_email(
        subject=f"New booking - {item.get('serviceName', '')}",
        headline="A new appointment was booked.",
        intro="A client just completed a booking on the website. The details are below.",
        item=item,
        detail_rows=detail_rows,
        accent_label="Reply-to",
        accent_value=f"Reply to this email to respond to {item.get('clientName', '')}.",
    )
    return text_body, html_body
