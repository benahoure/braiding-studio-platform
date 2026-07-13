from __future__ import annotations


def test_redact_pii_masks_email_and_phone_fields() -> None:
    from common.logger import redact_pii

    redacted = redact_pii(
        {
            "clientEmail": "amara@example.com",
            "clientPhone": "+13175550123",
            "detail": {"phone": "3175551111"},
            "to": "client@example.com",
            "toAddress": "admin@example.com",
        }
    )

    assert redacted["clientEmail"] == "[REDACTED]"
    assert redacted["clientPhone"] == "[REDACTED]"
    assert redacted["detail"]["phone"] == "[REDACTED]"
    assert redacted["to"] == "[REDACTED]"
    assert redacted["toAddress"] == "[REDACTED]"


def test_require_admin_rejects_non_admin_group() -> None:
    import pytest

    from common.errors import ForbiddenError
    from common.security import require_admin

    with pytest.raises(ForbiddenError):
        require_admin(
            {"requestContext": {"authorizer": {"jwt": {"claims": {"sub": "user-1", "cognito:groups": ["staff"]}}}}}
        )


def test_require_admin_accepts_bracketed_string_group_claim() -> None:
    from common.security import require_admin

    # HTTP API JWT authorizers serialize array claims to a bracketed string.
    assert (
        require_admin(
            {"requestContext": {"authorizer": {"jwt": {"claims": {"sub": "admin-1", "cognito:groups": "[admins]"}}}}}
        )
        == "admin-1"
    )


def test_require_admin_accepts_multi_group_bracketed_string() -> None:
    from common.security import require_admin

    assert (
        require_admin(
            {
                "requestContext": {
                    "authorizer": {"jwt": {"claims": {"sub": "admin-2", "cognito:groups": "[staff, admins]"}}}
                }
            }
        )
        == "admin-2"
    )


def test_decode_cursor_rejects_non_dict_payload() -> None:
    import base64

    import pytest

    from common.dynamo import decode_cursor

    cursor = base64.urlsafe_b64encode(b'["not", "a", "key"]')

    with pytest.raises(ValueError, match="Invalid pagination cursor"):
        decode_cursor(cursor.decode("utf-8"))
