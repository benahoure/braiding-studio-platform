import os
from datetime import datetime, timedelta

from shared.common import (
    APPOINTMENTS_TABLE,
    TIMEZONE,
    appointment_datetime,
    now_utc,
    response,
    send_email,
    send_sms,
)
from boto3.dynamodb.conditions import Key


def _query_for_date(date_value):
    return APPOINTMENTS_TABLE.query(
        IndexName="byAppointmentDate",
        KeyConditionExpression=Key("appointmentDate").eq(date_value),
    ).get("Items", [])


def handler(_event, _context):
    current = datetime.now(TIMEZONE)
    dates_to_check = {
        current.strftime("%Y-%m-%d"),
        (current + timedelta(days=1)).strftime("%Y-%m-%d"),
    }

    checked = 0
    reminded = 0
    sms_sent = 0
    owner_reminded = 0
    owner_email = os.environ.get("NOTIFICATION_EMAIL_TO")

    for date_value in dates_to_check:
        for item in _query_for_date(date_value):
            checked += 1
            if item.get("status") != "confirmed":
                continue
            if item.get("clientReminderSentAt"):
                continue

            appointment_at = appointment_datetime(item["appointmentDate"], item["appointmentTime"])
            hours_until = (appointment_at - current).total_seconds() / 3600
            if hours_until < 0 or hours_until > 24:
                continue

            subject = f"Reminder: {item['serviceName']} on {item['appointmentDate']}"
            body = (
                f"Hi {item['clientName']},\n\n"
                f"This is a reminder for your {item['serviceName']} appointment on "
                f"{item['appointmentDate']} at {item['appointmentTime']}.\n\n"
                "If you need to make changes, please contact the studio as soon as possible."
            )
            send_email(subject, body, item["clientEmail"])
            if owner_email and not item.get("ownerReminderSentAt"):
                send_email(
                    f"Studio reminder: {item['serviceName']} on {item['appointmentDate']}",
                    f"You have an upcoming appointment.\n\n{body}",
                    owner_email,
                )
                owner_reminded += 1
            if send_sms(
                item.get("clientPhone"),
                f"Reminder: {item['serviceName']} on {item['appointmentDate']} at {item['appointmentTime']}.",
            ):
                sms_sent += 1

            APPOINTMENTS_TABLE.update_item(
                Key={"appointmentId": item["appointmentId"]},
                UpdateExpression="SET clientReminderSentAt = :client_sent, ownerReminderSentAt = :owner_sent, updatedAt = :updated_at",
                ExpressionAttributeValues={
                    ":client_sent": now_utc(),
                    ":owner_sent": now_utc(),
                    ":updated_at": now_utc(),
                },
            )
            reminded += 1

    return response(
        200,
        {
            "message": "Reminder sweep completed",
            "appointmentsChecked": checked,
            "appointmentsReminded": reminded,
            "ownerRemindersSent": owner_reminded,
            "smsSent": sms_sent,
        },
    )
