from __future__ import annotations

import re

from aws_lambda_powertools.utilities.typing import LambdaContext

from appointments.availability import get_date_slots, get_month_availability
from common.http import method, query_params
from common.logger import logger
from common.response import bad_request, internal_error, ok, options

_MONTH_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
_DATE_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")
_SERVICE_RE = re.compile(r"^[a-zA-Z0-9_\-]{1,80}$")


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()

    params = query_params(event)
    month_param = params.get("month")
    date_param = params.get("date")
    service_id = params.get("serviceId") or None

    if service_id and not _SERVICE_RE.match(service_id):
        return bad_request("Invalid serviceId format.")

    try:
        if month_param:
            if not _MONTH_RE.match(month_param):
                return bad_request("Invalid month format. Expected YYYY-MM.")
            year, mon = int(month_param[:4]), int(month_param[5:])
            result = get_month_availability(year, mon, service_id=service_id)
            return ok(result, cache_control="public, max-age=60")

        if date_param:
            if not _DATE_RE.match(date_param):
                return bad_request("Invalid date format. Expected YYYY-MM-DD.")
            result = get_date_slots(date_param, service_id=service_id)
            return ok(result, cache_control="public, max-age=15")

        return bad_request("Provide either ?month=YYYY-MM or ?date=YYYY-MM-DD.")

    except Exception:
        logger.exception("Failed to fetch availability")
        return internal_error()
