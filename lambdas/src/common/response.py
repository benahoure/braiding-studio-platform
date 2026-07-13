from __future__ import annotations

import json
from typing import Any

from common.cors import cors_headers


def build_response(status_code: int, body: Any, *, cache_control: str = "no-store") -> dict:
    return {
        "statusCode": status_code,
        "headers": cors_headers(cache_control),
        "body": json.dumps(body, default=str),
    }


def ok(body: Any, *, cache_control: str = "no-store") -> dict:
    return build_response(200, body, cache_control=cache_control)


def created(body: Any) -> dict:
    return build_response(201, body)


def error_body(code: str, message: str, field_errors: dict[str, str] | None = None) -> dict:
    error: dict[str, object] = {"code": code, "message": message}
    if field_errors:
        error["fieldErrors"] = field_errors
    return {"error": error}


def error_response(
    status_code: int,
    code: str,
    message: str,
    field_errors: dict[str, str] | None = None,
) -> dict:
    return build_response(status_code, error_body(code, message, field_errors))


def bad_request(errors: dict[str, str] | str) -> dict:
    if isinstance(errors, str):
        return error_response(400, "bad_request", errors)
    return error_response(400, "validation_error", "Please review the highlighted fields.", errors)


def unauthorized(message: str = "Unauthorized") -> dict:
    return error_response(401, "unauthorized", message)


def forbidden(message: str = "Forbidden") -> dict:
    return error_response(403, "forbidden", message)


def not_found(message: str = "Not found") -> dict:
    return error_response(404, "not_found", message)


def conflict(message: str) -> dict:
    return error_response(409, "conflict", message)


def internal_error() -> dict:
    return error_response(500, "internal_error", "An unexpected error occurred. Please try again.")


def options() -> dict:
    return build_response(204, {})
