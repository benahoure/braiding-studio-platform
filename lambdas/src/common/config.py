from __future__ import annotations

import functools
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    table_services: str
    table_appointments: str
    table_portfolio: str
    table_reviews: str
    table_contact_messages: str
    table_business_settings: str
    table_audit_log: str
    allowed_origin: str
    assets_bucket: str
    cdn_base_url: str
    environment: str
    ses_sender_email: str
    admin_alert_email: str
    kms_key_id: str | None
    business_settings_distribution_id: str | None
    stripe_secret_key_ssm: str | None
    stripe_webhook_secret_ssm: str | None


def require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@functools.lru_cache(maxsize=1)
def get_config() -> Config:
    return Config(
        table_services=require_env("TABLE_SERVICES"),
        table_appointments=require_env("TABLE_APPOINTMENTS"),
        table_portfolio=require_env("TABLE_PORTFOLIO"),
        table_reviews=require_env("TABLE_REVIEWS"),
        table_contact_messages=require_env("TABLE_CONTACT_MESSAGES"),
        table_business_settings=require_env("TABLE_BUSINESS_SETTINGS"),
        table_audit_log=require_env("TABLE_AUDIT_LOG"),
        allowed_origin=require_env("ALLOWED_ORIGIN"),
        assets_bucket=os.environ.get("ASSETS_BUCKET", ""),
        cdn_base_url=require_env("CDN_BASE_URL").rstrip("/"),
        environment=os.environ.get("ENVIRONMENT", "dev"),
        ses_sender_email=require_env("SES_SENDER_EMAIL"),
        admin_alert_email=require_env("ADMIN_ALERT_EMAIL"),
        kms_key_id=os.environ.get("KMS_KEY_ID"),
        business_settings_distribution_id=os.environ.get("BUSINESS_SETTINGS_DISTRIBUTION_ID"),
        stripe_secret_key_ssm=os.environ.get("STRIPE_SECRET_KEY_SSM"),
        stripe_webhook_secret_ssm=os.environ.get("STRIPE_WEBHOOK_SECRET_SSM"),
    )
