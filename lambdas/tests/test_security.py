from __future__ import annotations

import pytest


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


class TestValidateCdnUrl:
    """Regression: every seeded catalog photo lives under the flat /images/
    path, but validate_cdn_url only accepted /services/ and /uploads/services/
    — so re-saving ANY field on ANY of the original 20 services failed, since
    the edit form always resends the existing (unchanged) imageUrl. Found via
    a real "Failed to update service" report on production."""

    def _base_url(self, monkeypatch):
        from common.config import get_config

        get_config.cache_clear()
        monkeypatch.setenv("CDN_BASE_URL", "https://cdn.braidsbydeb.com")
        return "https://cdn.braidsbydeb.com"

    def test_accepts_legacy_flat_images_path(self, monkeypatch):
        from common.security import validate_cdn_url

        base = self._base_url(monkeypatch)
        url = f"{base}/images/small-box-braids.png"
        assert validate_cdn_url(url, "services") == url

    def test_accepts_services_prefix(self, monkeypatch):
        from common.security import validate_cdn_url

        base = self._base_url(monkeypatch)
        url = f"{base}/services/photo.jpg"
        assert validate_cdn_url(url, "services") == url

    def test_accepts_uploads_services_prefix(self, monkeypatch):
        from common.security import validate_cdn_url

        base = self._base_url(monkeypatch)
        url = f"{base}/uploads/services/abc123/photo.jpg"
        assert validate_cdn_url(url, "services") == url

    def test_rejects_offcdn_url(self, monkeypatch):
        from common.security import validate_cdn_url

        self._base_url(monkeypatch)
        with pytest.raises(ValueError, match="CDN URL"):
            validate_cdn_url("https://evil.example.com/images/x.jpg", "services")

    def test_rejects_unrelated_cdn_subpath(self, monkeypatch):
        from common.security import validate_cdn_url

        base = self._base_url(monkeypatch)
        with pytest.raises(ValueError, match="CDN URL"):
            validate_cdn_url(f"{base}/portfolio/x.jpg", "services")
