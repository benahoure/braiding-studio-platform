from __future__ import annotations

import json
from typing import Any


def method(event: dict) -> str:
    return (event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod") or "GET").upper()


def path(event: dict) -> str:
    return event.get("rawPath") or event.get("path") or "/"


def path_parameter(event: dict, name: str) -> str | None:
    return (event.get("pathParameters") or {}).get(name)


def query_params(event: dict) -> dict[str, str]:
    return event.get("queryStringParameters") or {}


def parse_json_body(event: dict) -> dict[str, Any]:
    body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raise ValueError("Base64 request bodies are not supported.")
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError("Request body must be valid JSON.") from exc
    if not isinstance(parsed, dict):
        raise ValueError("Request body must be a JSON object.")
    return parsed


def validation_errors(exc: Exception) -> dict[str, str]:
    errors: list[dict[str, Any]] = getattr(exc, "errors", lambda: [])()
    return {str(error["loc"][-1]): str(error["msg"]) for error in errors}
