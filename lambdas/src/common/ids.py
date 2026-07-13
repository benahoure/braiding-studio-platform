from __future__ import annotations

import datetime as dt
import secrets

import ulid


def new_id() -> str:
    return str(ulid.new())


def new_appointment_token() -> str:
    """Cryptographically secure token for client portal URLs."""
    return secrets.token_urlsafe(32)


def utc_now() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def utc_now_epoch() -> int:
    return int(dt.datetime.now(dt.UTC).timestamp())


def ttl_days(days: int) -> int:
    return int((dt.datetime.now(dt.UTC) + dt.timedelta(days=days)).timestamp())


def ttl_minutes(minutes: int) -> int:
    return int((dt.datetime.now(dt.UTC) + dt.timedelta(minutes=minutes)).timestamp())
