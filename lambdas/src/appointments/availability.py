from __future__ import annotations

import datetime as dt
from zoneinfo import ZoneInfo

from boto3.dynamodb.conditions import Attr, ConditionBase

from appointments.models import DEFAULT_DURATION_MINUTES
from common.config import get_config
from common.dynamo import get_item, scan_items
from common.ids import utc_now_epoch

SALON_TZ = ZoneInfo("America/Chicago")
DAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
SETTINGS_KEY = {"settingId": "BUSINESS#SETTINGS", "version": "v1"}
DEFAULT_HOURS = {day: {"open": "09:00", "close": "21:00", "closed": False} for day in DAY_NAMES}


def _get_settings() -> tuple[dict, set[str], dict[str, list[tuple[int, int]]]]:
    """Return (hours_by_day, blocked_dates_set, blocked_windows_by_date).

    blocked_windows_by_date maps YYYY-MM-DD → [(start_min, end_min), …] from the
    admin's partial-day time blocks (settings.blockedSlots). They participate in
    conflict checks exactly like existing appointments, so a long service can't
    start before a block and run into it.
    """
    config = get_config()
    settings = get_item(config.table_business_settings, SETTINGS_KEY)
    if not settings:
        return DEFAULT_HOURS, set(), {}
    hours = settings.get("hours", DEFAULT_HOURS)
    blocked_raw = settings.get("blockedDates") or []
    windows: dict[str, list[tuple[int, int]]] = {}
    for slot in settings.get("blockedSlots") or []:
        date = slot.get("date")
        start = slot.get("start")
        end = slot.get("end")
        if not (date and start and end):
            continue
        start_min = _time_str_to_minutes(str(start))
        end_min = _time_str_to_minutes(str(end))
        if end_min > start_min:
            windows.setdefault(str(date), []).append((start_min, end_min))
    return hours, set(blocked_raw), windows


def _get_service_duration(service_id: str) -> int:
    """Return service durationMinutes from DynamoDB, falling back to DEFAULT_DURATION_MINUTES."""
    config = get_config()
    service = get_item(config.table_services, {"serviceId": service_id})
    if service:
        return int(service.get("durationMinutes", DEFAULT_DURATION_MINUTES))
    return DEFAULT_DURATION_MINUTES


def _time_str_to_minutes(time_str: str) -> int:
    """Convert 'HH:MM' to total minutes since midnight."""
    parts = time_str.split(":")
    return int(parts[0]) * 60 + (int(parts[1]) if len(parts) > 1 else 0)


def _generate_slots(day_hours: dict, duration_minutes: int) -> list[str]:
    """
    Return HH:MM slot strings where the service can start and finish within business hours.
    Last valid start = close_time - duration_minutes.
    """
    if day_hours.get("closed", True):
        return []
    try:
        open_hour = int(str(day_hours.get("open", "09:00")).split(":")[0])
        close_hour = int(str(day_hours.get("close", "21:00")).split(":")[0])
    except (ValueError, AttributeError):
        return []
    max_start_minutes = close_hour * 60 - duration_minutes
    return [f"{h:02d}:00" for h in range(open_hour, close_hour) if h * 60 <= max_start_minutes]


def _overlaps(slot_start_min: int, slot_duration_min: int, windows: list[tuple[int, int]]) -> bool:
    """
    Returns True if [slot_start, slot_start + slot_duration) overlaps with any window in the list.
    Each window is (existing_start_min, existing_end_min).
    Overlap condition: slot_start < existing_end AND existing_start < slot_end
    """
    slot_end_min = slot_start_min + slot_duration_min
    return any(slot_start_min < ex_end and ex_start < slot_end_min for ex_start, ex_end in windows)


def _collect_taken(
    table_name: str,
    filter_expr: ConditionBase,
    now_epoch: int,
) -> dict[str, list[tuple[int, int]]]:
    """
    Scan active appointments matching filter_expr.
    Returns {date: [(start_minutes, end_minutes), ...]} for every active appointment.
    Uses serviceDurationMinutes stored on the appointment; falls back to DEFAULT_DURATION_MINUTES.
    """
    taken: dict[str, list[tuple[int, int]]] = {}
    cursor = None
    for _ in range(20):
        items, cursor = scan_items(table_name, filter_expression=filter_expr, limit=100, cursor=cursor)
        for item in items:
            status = item.get("status", "")
            date_str = item.get("preferredDate", "")
            time_str = item.get("preferredTime", "")
            if not date_str or not time_str:
                continue

            active = False
            if status == "pending_payment":
                expires_at = item.get("expiresAt")
                if expires_at is not None and int(expires_at) > now_epoch:
                    active = True
            elif status in {"pending", "confirmed"}:
                active = True

            if not active:
                continue

            start_min = _time_str_to_minutes(time_str)
            appt_duration = int(item.get("serviceDurationMinutes", DEFAULT_DURATION_MINUTES))
            end_min = start_min + appt_duration
            taken.setdefault(date_str, []).append((start_min, end_min))

        if not cursor:
            break
    return taken


def _format_time_12h(hour: int, minute: int = 0) -> str:
    suffix = "AM" if hour < 12 else "PM"
    display = hour % 12 or 12
    return f"{display}:{minute:02d} {suffix}"


def _slot_is_within_24hr(slot_str: str, date: dt.date, cutoff: dt.datetime) -> bool:
    h = int(slot_str.split(":")[0])
    slot_dt = dt.datetime(date.year, date.month, date.day, h, 0, tzinfo=SALON_TZ)
    return slot_dt <= cutoff


# ── Public API ────────────────────────────────────────────────────────────────


def get_month_availability(year: int, month: int, service_id: str | None = None) -> dict:
    config = get_config()
    hours, blocked_dates, blocked_windows = _get_settings()
    now_epoch = utc_now_epoch()
    now_chicago = dt.datetime.now(SALON_TZ)
    today_chicago = now_chicago.date()
    cutoff_24hr = now_chicago + dt.timedelta(hours=24)

    duration_minutes = _get_service_duration(service_id) if service_id else DEFAULT_DURATION_MINUTES

    first_day = dt.date(year, month, 1)
    last_day = (dt.date(year + 1, 1, 1) if month == 12 else dt.date(year, month + 1, 1)) - dt.timedelta(days=1)

    taken_by_date = _collect_taken(
        config.table_appointments,
        Attr("preferredDate").between(first_day.isoformat(), last_day.isoformat()),
        now_epoch,
    )

    dates_result = []
    current = first_day
    while current <= last_day:
        date_str = current.isoformat()
        day_name = DAY_NAMES[current.weekday()]
        day_hours = hours.get(day_name, {"closed": True})

        if current <= today_chicago:
            status = "past"
            available_count = 0
        elif date_str in blocked_dates:
            status = "blocked"
            available_count = 0
        elif day_hours.get("closed", True):
            status = "closed"
            available_count = 0
        else:
            all_slots = _generate_slots(day_hours, duration_minutes)
            taken_windows = taken_by_date.get(date_str, []) + blocked_windows.get(date_str, [])

            available_slots = []
            within_24hr_count = 0
            booked_count = 0

            for slot_str in all_slots:
                slot_start_min = _time_str_to_minutes(slot_str)
                if _overlaps(slot_start_min, duration_minutes, taken_windows):
                    booked_count += 1
                    continue
                slot_dt = dt.datetime(
                    current.year, current.month, current.day, slot_start_min // 60, 0, tzinfo=SALON_TZ
                )
                if slot_dt <= cutoff_24hr:
                    within_24hr_count += 1
                    continue
                available_slots.append(slot_str)

            available_count = len(available_slots)

            if available_count > 0:
                status = "available"
            elif not all_slots:
                status = "closed"
            elif within_24hr_count > 0:
                status = "blocked_24hr"
            else:
                status = "fully_booked"

        dates_result.append(
            {
                "date": date_str,
                "status": status,
                "availableSlots": available_count,
            }
        )
        current += dt.timedelta(days=1)

    return {
        "month": f"{year}-{month:02d}",
        "timezone": "America/Chicago",
        "dates": dates_result,
    }


def get_date_slots(date_str: str, service_id: str | None = None) -> dict:
    config = get_config()
    hours, blocked_dates, blocked_windows = _get_settings()
    now_epoch = utc_now_epoch()
    now_chicago = dt.datetime.now(SALON_TZ)
    today_chicago = now_chicago.date()
    cutoff_24hr = now_chicago + dt.timedelta(hours=24)

    duration_minutes = _get_service_duration(service_id) if service_id else DEFAULT_DURATION_MINUTES

    try:
        date = dt.date.fromisoformat(date_str)
    except ValueError:
        return {"date": date_str, "timezone": "America/Chicago", "slots": []}

    if date <= today_chicago:
        return {"date": date_str, "timezone": "America/Chicago", "slots": []}

    if date_str in blocked_dates:
        return {"date": date_str, "timezone": "America/Chicago", "slots": []}

    day_name = DAY_NAMES[date.weekday()]
    day_hours = hours.get(day_name, {"closed": True})
    all_slots = _generate_slots(day_hours, duration_minutes)
    if not all_slots:
        return {"date": date_str, "timezone": "America/Chicago", "slots": []}

    taken_by_date = _collect_taken(
        config.table_appointments,
        Attr("preferredDate").eq(date_str),
        now_epoch,
    )
    taken_windows = taken_by_date.get(date_str, []) + blocked_windows.get(date_str, [])

    slots_result = []
    for slot_str in all_slots:
        slot_start_min = _time_str_to_minutes(slot_str)
        if _overlaps(slot_start_min, duration_minutes, taken_windows):
            continue
        h = slot_start_min // 60
        slot_dt = dt.datetime(date.year, date.month, date.day, h, 0, tzinfo=SALON_TZ)
        if slot_dt <= cutoff_24hr:
            continue
        slots_result.append(
            {
                "time": _format_time_12h(h),
                "datetime": slot_dt.isoformat(),
                "available": True,
            }
        )

    return {
        "date": date_str,
        "timezone": "America/Chicago",
        "slots": slots_result,
    }
