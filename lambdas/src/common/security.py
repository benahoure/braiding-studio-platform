from __future__ import annotations

import base64
import re
from typing import Any

import boto3

from common.config import get_config
from common.errors import ForbiddenError

_kms = boto3.client("kms")


def _groups_from_claims(claims: dict[str, Any]) -> set[str]:
    raw = claims.get("cognito:groups", [])
    if isinstance(raw, list):
        return {str(item).strip() for item in raw if str(item).strip()}
    if isinstance(raw, str):
        # HTTP API JWT authorizers serialize array claims to a string such as
        # "[admins]" or "[admins, staff]"; strip wrapping brackets, then split
        # on commas/whitespace so every serialization shape resolves correctly.
        cleaned = raw.strip().removeprefix("[").removesuffix("]")
        return {part.strip() for part in re.split(r"[,\s]+", cleaned) if part.strip()}
    return set()


def require_admin(event: dict) -> str:
    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    if "admins" not in _groups_from_claims(claims):
        raise ForbiddenError("Admin group membership is required.")
    return str(claims.get("sub", "unknown-admin"))


def encrypt_pii(value: str | None) -> str | None:
    if not value:
        return value
    config = get_config()
    if not config.kms_key_id:
        if config.environment == "prod":
            raise RuntimeError("KMS_KEY_ID is required in prod for PII encryption.")
        encoded = base64.b64encode(value.encode("utf-8")).decode("utf-8")
        return f"local:v1:{encoded}"

    response = _kms.encrypt(KeyId=config.kms_key_id, Plaintext=value.encode("utf-8"))
    encoded = base64.b64encode(response["CiphertextBlob"]).decode("utf-8")
    return f"kms:v1:{encoded}"


def decrypt_pii(value: str | None) -> str | None:
    if not value:
        return value
    if value.startswith("local:v1:"):
        return base64.b64decode(value.removeprefix("local:v1:")).decode("utf-8")
    if value.startswith("kms:v1:"):
        blob = base64.b64decode(value.removeprefix("kms:v1:"))
        return _kms.decrypt(CiphertextBlob=blob)["Plaintext"].decode("utf-8")
    return value


def validate_cdn_url(value: str, prefix: str) -> str:
    """Accept CDN URLs under either the legacy direct prefix or the uploads/ prefix."""
    config = get_config()
    clean = prefix.strip("/")
    allowed = [
        f"{config.cdn_base_url}/{clean}/",
        f"{config.cdn_base_url}/uploads/{clean}/",
    ]
    if not any(value.startswith(p) for p in allowed):
        raise ValueError(f"Image URL must be a CDN URL under /{clean}/ or /uploads/{clean}/")
    return value


def validate_cdn_url_any(value: str) -> str:
    """Accept any CDN-hosted URL regardless of folder prefix."""
    config = get_config()
    if not value.startswith(f"{config.cdn_base_url}/"):
        raise ValueError(f"Image URL must be hosted on the CDN ({config.cdn_base_url})")
    return value
