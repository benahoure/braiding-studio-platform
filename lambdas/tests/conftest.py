from __future__ import annotations

import os
import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

# Stub out the stripe package so tests that transitively import common.stripe_client
# don't fail with ModuleNotFoundError when the package isn't installed in the test venv.
if "stripe" not in sys.modules:
    sys.modules["stripe"] = MagicMock()


@pytest.fixture(autouse=True)
def lambda_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("AWS_" + "ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_" + "SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("TABLE_SERVICES", "services")
    monkeypatch.setenv("TABLE_APPOINTMENTS", "appointments")
    monkeypatch.setenv("TABLE_PORTFOLIO", "portfolio")
    monkeypatch.setenv("TABLE_REVIEWS", "reviews")
    monkeypatch.setenv("TABLE_CONTACT_MESSAGES", "contact-messages")
    monkeypatch.setenv("TABLE_BUSINESS_SETTINGS", "business-settings")
    monkeypatch.setenv("TABLE_AUDIT_LOG", "audit-log")
    monkeypatch.setenv("ALLOWED_ORIGIN", "https://example.test")
    monkeypatch.setenv("ASSETS_BUCKET", "assets")
    monkeypatch.setenv("CDN_BASE_URL", "https://cdn.example.test")
    monkeypatch.setenv("SES_SENDER_EMAIL", "no-reply@example.test")
    monkeypatch.setenv("ADMIN_ALERT_EMAIL", "admin@example.test")
    monkeypatch.delenv("KMS_KEY_ID", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "dev")
    os.environ.setdefault("POWERTOOLS_SERVICE_NAME", "braids-by-deb-test")


@pytest.fixture
def lambda_context():
    return SimpleNamespace(
        function_name="test-function",
        memory_limit_in_mb=128,
        invoked_function_arn="arn:aws:lambda:us-east-1:123456789012:function:test-function",
        aws_request_id="test-request-id",
    )
