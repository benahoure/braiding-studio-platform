from __future__ import annotations

import functools
import os
from typing import Any

import boto3
import stripe


@functools.lru_cache(maxsize=1)
def _secret_key() -> str:
    raw = os.environ.get("STRIPE_SECRET_KEY", "")
    if raw and raw != "REPLACE_ME":
        return raw
    ssm_name = os.environ.get("STRIPE_SECRET_KEY_SSM", "")
    if not ssm_name:
        raise RuntimeError("Neither STRIPE_SECRET_KEY nor STRIPE_SECRET_KEY_SSM is configured.")
    resp = boto3.client("ssm").get_parameter(Name=ssm_name, WithDecryption=True)
    return resp["Parameter"]["Value"]


@functools.lru_cache(maxsize=1)
def _webhook_secret() -> str:
    raw = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    if raw and raw != "REPLACE_ME":
        return raw
    ssm_name = os.environ.get("STRIPE_WEBHOOK_SECRET_SSM", "")
    if not ssm_name:
        raise RuntimeError("Neither STRIPE_WEBHOOK_SECRET nor STRIPE_WEBHOOK_SECRET_SSM is configured.")
    resp = boto3.client("ssm").get_parameter(Name=ssm_name, WithDecryption=True)
    return resp["Parameter"]["Value"]


@functools.lru_cache(maxsize=1)
def get_stripe() -> stripe.StripeClient:
    return stripe.StripeClient(_secret_key())


def create_payment_intent(amount_cents: int, metadata: dict[str, Any]) -> stripe.PaymentIntent:
    # Explicit list excludes Affirm/Afterpay which require higher minimums.
    # "card" covers debit, credit, Apple Pay, and Google Pay via wallet detection.
    return get_stripe().payment_intents.create(
        params={
            "amount": amount_cents,
            "currency": "usd",
            # card covers debit, credit, Apple Pay, and Google Pay via wallet detection
            "payment_method_types": ["card", "cashapp", "amazon_pay", "link"],
            "metadata": metadata,
        }
    )


def retrieve_payment_intent(intent_id: str) -> stripe.PaymentIntent:
    return get_stripe().payment_intents.retrieve(intent_id)


def create_refund(charge_id: str, idempotency_key: str) -> stripe.Refund:
    return get_stripe().refunds.create(
        params={"charge": charge_id},
        options={"idempotency_key": idempotency_key},
    )


def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify Stripe webhook signature and parse the event."""
    return stripe.Webhook.construct_event(
        payload=payload,
        sig_header=sig_header,
        secret=_webhook_secret(),
    )
