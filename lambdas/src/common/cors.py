from __future__ import annotations

from common.config import get_config


def cors_headers(cache_control: str = "no-store") -> dict[str, str]:
    config = get_config()
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": config.allowed_origin,
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "Cache-Control": cache_control,
        "Vary": "Origin",
    }
