import os

from shared.common import (
    APPOINTMENTS_TABLE,
    DEPOSIT_AMOUNT,
    PAYMENT_METHODS,
    appointment_response,
    bad_request,
    booking_client_email_content,
    booking_owner_email_content,
    clean_string,
    generate_id,
    get_appointment,
    get_service,
    get_service_length_option,
    get_service_price,
    is_slot_booked,
    list_appointments,
    method_not_allowed,
    not_found,
    now_utc,
    parse_body,
    response,
    send_email,
    update_appointment,
    upsert_client,
    validate_email,
)


ALLOWED_STATUSES = {"confirmed", "cancelled", "completed"}


def _create_appointment(payload):
    required_errors = {}
    if not payload.get("serviceId"):
        required_errors["serviceId"] = "serviceId is required"
    if not clean_string(payload.get("clientName")):
        required_errors["clientName"] = "clientName is required"
    if not validate_email(payload.get("clientEmail")):
        required_errors["clientEmail"] = "Valid clientEmail is required"
    if not clean_string(payload.get("clientPhone")):
        required_errors["clientPhone"] = "clientPhone is required"
    if not clean_string(payload.get("date")):
        required_errors["date"] = "date is required"
    if not clean_string(payload.get("time")):
        required_errors["time"] = "time is required"
    if required_errors:
        return bad_request("Invalid booking payload", required_errors)

    service = get_service(payload["serviceId"])
    if not service:
        return bad_request("Unknown serviceId")

    service_length_id = clean_string(payload.get("serviceLengthId"))
    service_length_option = get_service_length_option(service, service_length_id)
    if service.get("lengthOptions") and not service_length_option:
        return bad_request("A valid serviceLengthId is required for this service")

    payment_method = clean_string(payload.get("paymentMethod"))
    if payment_method not in PAYMENT_METHODS:
        return bad_request("Unsupported paymentMethod")

    if is_slot_booked(payload["date"], payload["time"]):
        return response(409, {"message": "Selected appointment slot is already booked"})

    appointment_id = generate_id("apt")
    client = upsert_client(
        full_name=payload["clientName"],
        email=payload["clientEmail"],
        phone=payload["clientPhone"],
        latest_booking_id=appointment_id,
    )

    item = {
        "appointmentId": appointment_id,
        "id": appointment_id,
        "clientId": client["clientId"],
        "clientName": clean_string(payload["clientName"]),
        "clientEmail": clean_string(payload["clientEmail"]).lower(),
        "clientPhone": clean_string(payload["clientPhone"]),
        "serviceId": payload["serviceId"],
        "serviceName": service["name"],
        "serviceCategory": service["category"],
        "serviceLengthId": service_length_option["id"] if service_length_option else "",
        "serviceLength": service_length_option["label"] if service_length_option else "",
        "servicePrice": get_service_price(service, service_length_id),
        "serviceDuration": service["duration"],
        "appointmentDate": payload["date"],
        "appointmentTime": payload["time"],
        "date": payload["date"],
        "time": payload["time"],
        "notes": clean_string(payload.get("notes")),
        "status": "confirmed",
        "paymentMethod": payment_method,
        "depositAmount": DEPOSIT_AMOUNT,
        "paymentStatus": "pending",
        "createdAt": now_utc(),
        "updatedAt": now_utc(),
    }
    APPOINTMENTS_TABLE.put_item(Item=item)

    subject = f"Booking confirmed: {item['serviceName']} on {item['appointmentDate']}"
    client_text_body, client_html_body = booking_client_email_content(item)
    send_email(subject, client_text_body, item["clientEmail"], html_body=client_html_body)
    owner_email = os.environ.get("NOTIFICATION_EMAIL_TO")
    if owner_email:
        owner_text_body, owner_html_body = booking_owner_email_content(item)
        send_email(
            subject,
            owner_text_body,
            owner_email,
            reply_to=item["clientEmail"],
            html_body=owner_html_body,
        )

    return response(201, {"appointment": appointment_response(item)})


def _list_appointments(event):
    query_params = event.get("queryStringParameters") or {}
    email = clean_string(query_params.get("email")).lower() or None
    date_value = clean_string(query_params.get("date")) or None
    status = clean_string(query_params.get("status")) or None
    items = [appointment_response(item) for item in list_appointments(email=email, status=status, date_value=date_value)]
    return response(200, {"appointments": items})


def _get_appointment(appointment_id):
    item = get_appointment(appointment_id)
    if not item:
        return not_found("Appointment not found")
    return response(200, {"appointment": appointment_response(item)})


def _patch_appointment(appointment_id, payload):
    item = get_appointment(appointment_id)
    if not item:
        return not_found("Appointment not found")

    updates = {"updatedAt": now_utc()}
    if "status" in payload:
        status = clean_string(payload["status"])
        if status not in ALLOWED_STATUSES:
            return bad_request("Unsupported status")
        updates["status"] = status
    if "notes" in payload:
        updates["notes"] = clean_string(payload["notes"])
    if "paymentMethod" in payload:
        payment_method = clean_string(payload["paymentMethod"])
        if payment_method not in PAYMENT_METHODS:
            return bad_request("Unsupported paymentMethod")
        updates["paymentMethod"] = payment_method
    if "paymentStatus" in payload:
        updates["paymentStatus"] = clean_string(payload["paymentStatus"])
    if "date" in payload or "appointmentDate" in payload:
        updates["appointmentDate"] = clean_string(payload.get("date") or payload.get("appointmentDate"))
        updates["date"] = updates["appointmentDate"]
    if "time" in payload or "appointmentTime" in payload:
        updates["appointmentTime"] = clean_string(payload.get("time") or payload.get("appointmentTime"))
        updates["time"] = updates["appointmentTime"]

    if len(updates) == 1:
        return bad_request("No supported fields to update")

    update_appointment(appointment_id, updates)
    updated = get_appointment(appointment_id)
    return response(200, {"appointment": appointment_response(updated)})


def _delete_appointment(appointment_id):
    item = get_appointment(appointment_id)
    if not item:
        return not_found("Appointment not found")
    APPOINTMENTS_TABLE.delete_item(Key={"appointmentId": appointment_id})
    return response(200, {"message": "Appointment deleted", "appointmentId": appointment_id})


def handler(event, _context):
    method = event.get("requestContext", {}).get("http", {}).get("method")
    appointment_id = (event.get("pathParameters") or {}).get("appointmentId")

    if method == "GET" and appointment_id:
        return _get_appointment(appointment_id)
    if method == "GET":
        return _list_appointments(event)
    if method == "POST":
        return _create_appointment(parse_body(event))
    if method == "PATCH" and appointment_id:
        return _patch_appointment(appointment_id, parse_body(event))
    if method == "DELETE" and appointment_id:
        return _delete_appointment(appointment_id)
    return method_not_allowed()
