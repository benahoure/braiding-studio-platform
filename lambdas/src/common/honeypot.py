from __future__ import annotations


def is_bot(body: dict) -> bool:
    return bool(str(body.get("honeypot", "")).strip())
