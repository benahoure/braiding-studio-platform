from __future__ import annotations

import datetime as dt
import json
from pathlib import Path


def test_appointment_honeypot_returns_silent_created(lambda_context) -> None:
    from appointments.handler import lambda_handler

    response = lambda_handler(
        {
            "rawPath": "/appointments/payment-intent",
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"honeypot": "bot"}),
        },
        lambda_context,
    )

    assert response["statusCode"] == 201


def test_appointment_handler_accepts_portfolio_style_id(monkeypatch, lambda_context) -> None:
    from appointments import handler

    captured = {}

    def fake_create_payment_intent_hold(request, client_ip, user_agent):
        captured["portfolioStyleId"] = request.portfolioStyleId
        return {"appointmentId": "appt-1", "clientSecret": "pi_fake_secret"}

    monkeypatch.setattr(handler, "create_payment_intent_hold", fake_create_payment_intent_hold)

    response = handler.lambda_handler(
        {
            "rawPath": "/appointments/payment-intent",
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps(
                {
                    "serviceId": "svc-knotless-braids",
                    "portfolioStyleId": "style-boho-waist-length",
                    "clientName": "Amara Test",
                    "clientEmail": "amara@example.com",
                    "clientPhone": "3175550123",
                    "preferredDate": (dt.date.today() + dt.timedelta(days=2)).isoformat(),
                    "preferredTime": "10:00",
                    "policyAccepted": True,
                    "honeypot": "",
                }
            ),
        },
        lambda_context,
    )

    assert response["statusCode"] == 201
    assert captured["portfolioStyleId"] == "style-boho-waist-length"


def test_appointment_service_persists_portfolio_style_id(monkeypatch) -> None:
    from types import SimpleNamespace

    from appointments import service
    from appointments.models import PaymentIntentRequest

    writes = []
    monkeypatch.setattr(
        service,
        "get_item",
        lambda *args, **kwargs: {
            "serviceId": "svc-knotless-braids",
            "name": "Knotless Braids",
            "active": True,
            "startingPrice": 15000,
        },
    )
    monkeypatch.setattr(service, "put_item", lambda table, item: writes.append((table, item)))
    monkeypatch.setattr(service, "_slot_is_available", lambda *args, **kwargs: True)
    monkeypatch.setattr(
        service,
        "create_payment_intent",
        lambda *args, **kwargs: SimpleNamespace(id="pi_test_123", client_secret="pi_test_123_secret"),
    )

    request = PaymentIntentRequest.model_validate(
        {
            "serviceId": "svc-knotless-braids",
            "portfolioStyleId": "style-boho-waist-length",
            "clientName": "Amara Test",
            "clientEmail": "amara@example.com",
            "clientPhone": "3175550123",
            "preferredDate": (dt.date.today() + dt.timedelta(days=2)).isoformat(),
            "preferredTime": "10:00",
            "policyAccepted": True,
            "honeypot": "",
        }
    )

    result = service.create_payment_intent_hold(request, client_ip=None, user_agent=None)

    appointment_item = next(item for table, item in writes if table == "appointments")
    assert appointment_item["portfolioStyleId"] == "style-boho-waist-length"
    assert appointment_item["status"] == "pending_payment"
    assert appointment_item["stripePaymentIntentId"] == "pi_test_123"
    assert result["clientSecret"] == "pi_test_123_secret"


def test_validation_errors_use_standardized_error_shape(lambda_context) -> None:
    from appointments.handler import lambda_handler

    response = lambda_handler(
        {
            "rawPath": "/appointments/payment-intent",
            "requestContext": {"http": {"method": "POST"}},
            "body": json.dumps({"serviceId": "", "honeypot": ""}),
        },
        lambda_context,
    )
    body = json.loads(response["body"])

    assert response["statusCode"] == 400
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Please review the highlighted fields."
    assert "fieldErrors" in body["error"]
    assert "errors" not in body


def test_public_reviews_return_approved_only(monkeypatch, lambda_context) -> None:
    from reviews import handler

    monkeypatch.setattr(
        handler,
        "scan_items",
        lambda *args, **kwargs: (
            [
                {
                    "reviewId": "approved-1",
                    "clientName": "Amara T.",
                    "rating": 5,
                    "body": "Grace took great care of my hair.",
                    "approved": True,
                    "featured": True,
                    "source": "website",
                    "serviceName": "Knotless Braids",
                    "createdAt": "2026-05-01T00:00:00Z",
                }
            ],
            None,
        ),
    )
    monkeypatch.setattr(
        handler,
        "get_item",
        lambda *args, **kwargs: {"averageRating": 5, "totalCount": 1},
    )

    response = handler.lambda_handler({"rawPath": "/reviews"}, lambda_context)
    body = json.loads(response["body"])

    assert response["statusCode"] == 200
    assert body["reviews"][0]["clientName"] == "Amara T."
    assert body["reviews"][0]["status"] == "approved"
    assert body["reviews"][0]["featured"] is True
    assert body["reviews"][0]["source"] == "website"
    assert body["reviews"][0]["serviceName"] == "Knotless Braids"
    assert body["aggregates"]["totalCount"] == 1
    assert body["aggregates"]["averageRating"] == 5


def test_public_reviews_self_heal_aggregate_when_missing(monkeypatch, lambda_context) -> None:
    """When AGGREGATE#RATINGS is absent, the handler computes and stores it on the fly."""
    from reviews import handler

    review_row = {
        "reviewId": "approved-1",
        "clientName": "Mariame F.",
        "rating": 5,
        "body": "Amazing service!",
        "approved": True,
        "featured": False,
        "source": "submitted",
        "createdAt": "2026-06-01T00:00:00Z",
    }

    stored: list[dict] = []

    monkeypatch.setattr(handler, "scan_items", lambda *a, **kw: ([review_row], None))
    monkeypatch.setattr(handler, "get_item", lambda *a, **kw: None)
    monkeypatch.setattr(handler, "put_item", lambda _table, item: stored.append(item))

    response = handler.lambda_handler({"rawPath": "/reviews"}, lambda_context)
    body = json.loads(response["body"])

    assert response["statusCode"] == 200
    assert body["aggregates"]["totalCount"] == 1
    assert body["aggregates"]["averageRating"] == 5.0
    assert body["reviews"][0]["clientName"] == "Mariame F."

    assert len(stored) == 1
    assert stored[0]["reviewId"] == "AGGREGATE#RATINGS"
    assert stored[0]["totalCount"] == 1
    assert stored[0]["averageRating"] == 5.0


def test_public_reviews_self_heal_aggregate_excludes_aggregate_row(monkeypatch, lambda_context) -> None:
    """AGGREGATE# rows in the scan result are not counted as real reviews."""
    from reviews import handler

    rows = [
        {
            "reviewId": "approved-1",
            "clientName": "Client A",
            "rating": 4,
            "body": "Great!",
            "approved": True,
            "featured": False,
            "source": "submitted",
            "createdAt": "2026-06-01T00:00:00Z",
        },
        {
            "reviewId": "AGGREGATE#RATINGS",
            "totalCount": 0,
            "averageRating": 0,
        },
    ]

    stored: list[dict] = []

    monkeypatch.setattr(handler, "scan_items", lambda *a, **kw: (rows, None))
    monkeypatch.setattr(handler, "get_item", lambda *a, **kw: None)
    monkeypatch.setattr(handler, "put_item", lambda _table, item: stored.append(item))

    response = handler.lambda_handler({"rawPath": "/reviews"}, lambda_context)
    body = json.loads(response["body"])

    assert body["aggregates"]["totalCount"] == 1
    assert body["aggregates"]["averageRating"] == 4.0
    assert stored[0]["totalCount"] == 1


def test_public_reviews_post_route_exists() -> None:
    locals_tf = Path(__file__).resolve().parents[2] / "infra" / "locals.tf"

    assert '"POST /reviews"' in locals_tf.read_text()


def test_public_api_router_dispatches_required_public_routes(monkeypatch, lambda_context) -> None:
    from public_api import handler

    dispatched = []

    def fake_handler(name):
        def _handler(event, context):
            dispatched.append((name, event["rawPath"], event["requestContext"]["http"]["method"]))
            return {"statusCode": 200, "body": name}

        return _handler

    monkeypatch.setattr(handler, "appointments_handler", fake_handler("appointments"))
    monkeypatch.setattr(handler, "contact_handler", fake_handler("contact"))
    monkeypatch.setattr(handler, "reviews_handler", fake_handler("reviews"))

    for method_name, raw_path in [
        ("POST", "/appointments/payment-intent"),
        ("POST", "/contact"),
        ("GET", "/reviews"),
        ("POST", "/reviews"),
    ]:
        response = handler.lambda_handler(
            {"rawPath": raw_path, "requestContext": {"http": {"method": method_name}}},
            lambda_context,
        )
        assert response["statusCode"] == 200

    assert dispatched == [
        ("appointments", "/appointments/payment-intent", "POST"),
        ("contact", "/contact", "POST"),
        ("reviews", "/reviews", "GET"),
        ("reviews", "/reviews", "POST"),
    ]


def test_public_api_router_preserves_existing_public_routes(monkeypatch, lambda_context) -> None:
    from public_api import handler

    dispatched = []

    def fake_handler(name):
        def _handler(event, context):
            dispatched.append(name)
            return {"statusCode": 200, "body": name}

        return _handler

    monkeypatch.setattr(handler, "services_handler", fake_handler("services"))
    monkeypatch.setattr(handler, "portfolio_handler", fake_handler("portfolio"))
    monkeypatch.setattr(handler, "business_settings_handler", fake_handler("business-settings"))

    for raw_path in ["/services", "/services/svc-knotless-braids", "/portfolio", "/business-settings"]:
        response = handler.lambda_handler(
            {"rawPath": raw_path, "requestContext": {"http": {"method": "GET"}}},
            lambda_context,
        )
        assert response["statusCode"] == 200

    assert dispatched == ["services", "services", "portfolio", "business-settings"]


def test_admin_api_router_delegates_to_existing_admin_handler(monkeypatch, lambda_context) -> None:
    from admin_api import handler

    captured = {}

    def fake_admin_handler(event, context):
        captured["rawPath"] = event["rawPath"]
        return {"statusCode": 200, "body": "admin"}

    monkeypatch.setattr(handler, "admin_handler", fake_admin_handler)

    response = handler.lambda_handler({"rawPath": "/admin/appointments"}, lambda_context)

    assert response["statusCode"] == 200
    assert captured["rawPath"] == "/admin/appointments"


def test_admin_appointment_update_keeps_status_index_key(monkeypatch, lambda_context) -> None:
    from admin import handler

    captured = {}
    monkeypatch.setattr(handler, "require_admin", lambda event: "admin-1")
    monkeypatch.setattr(handler, "get_item", lambda *args, **kwargs: {"appointmentId": "appt-1"})
    monkeypatch.setattr(handler, "decrypt_pii", lambda value: value)
    monkeypatch.setattr(handler, "audit", lambda *args, **kwargs: None)

    def fake_update_item(table, key, updates):
        captured["updates"] = updates
        return {
            "appointmentId": key["appointmentId"],
            "status": updates["status"],
            "statusKey": updates["statusKey"],
            "clientEmail": "local:v1:test",
            "clientPhone": "local:v1:test",
        }

    monkeypatch.setattr(handler, "update_item", fake_update_item)

    response = handler.lambda_handler(
        {
            "rawPath": "/admin/appointments/appt-1",
            "pathParameters": {"appointmentId": "appt-1"},
            "requestContext": {
                "http": {"method": "PATCH"},
                "authorizer": {"jwt": {"claims": {"sub": "admin-1", "cognito:groups": ["admins"]}}},
            },
            "body": json.dumps({"status": "confirmed"}),
        },
        lambda_context,
    )

    assert response["statusCode"] == 200
    assert captured["updates"]["status"] == "confirmed"
    assert captured["updates"]["statusKey"] == "confirmed"


def test_admin_routes_include_existing_handler_functionality() -> None:
    locals_tf = (Path(__file__).resolve().parents[2] / "infra" / "locals.tf").read_text()

    for route_key in [
        '"PATCH /admin/portfolio/{styleId}"',
        '"POST /admin/reviews"',
        '"DELETE /admin/reviews/{reviewId}"',
        '"GET /admin/contact-messages"',
    ]:
        assert route_key in locals_tf


def test_contact_handler_accepts_phone_without_email_and_photo_name(monkeypatch, lambda_context) -> None:
    from contact import handler

    captured = {}

    def fake_create_contact_message(request):
        captured["email"] = request.email
        captured["phone"] = request.phone
        captured["inspirationPhotoName"] = request.inspirationPhotoName
        return {"messageId": "msg-1", "message": "Thanks for reaching out! We'll respond within 1 business day."}

    monkeypatch.setattr(handler, "create_contact_message", fake_create_contact_message)

    response = handler.lambda_handler(
        {
            "body": json.dumps(
                {
                    "name": "Amara Test",
                    "phone": "3175550123",
                    "message": "I would like help choosing a protective style.",
                    "services": ["Knotless Braids"],
                    "inspirationPhotoName": "inspiration-look.webp",
                    "honeypot": "",
                }
            )
        },
        lambda_context,
    )

    assert response["statusCode"] == 201
    assert captured["email"] is None
    assert captured["phone"] == "+13175550123"
    assert captured["inspirationPhotoName"] == "inspiration-look.webp"


def test_contact_service_persists_photo_name_and_skips_customer_email_when_email_missing(monkeypatch) -> None:
    from contact import service
    from contact.models import ContactRequest

    writes = []
    sent_emails = []
    monkeypatch.setattr(service, "put_item", lambda table, item: writes.append((table, item)))
    monkeypatch.setattr(service, "best_effort_send_email", lambda **kwargs: sent_emails.append(kwargs) or True)
    monkeypatch.setattr(service, "notify_admin", lambda *args, **kwargs: True)

    request = ContactRequest.model_validate(
        {
            "name": "Amara Test",
            "phone": "3175550123",
            "message": "I would like help choosing a protective style.",
            "services": ["Knotless Braids"],
            "inspirationPhotoName": "inspiration-look.webp",
            "honeypot": "",
        }
    )

    service.create_contact_message(request)

    contact_item = next(item for table, item in writes if table == "contact-messages")
    assert contact_item["email"] is None
    assert contact_item["phone"].startswith("local:v1:")
    assert contact_item["inspirationPhotoName"] == "inspiration-look.webp"
    assert sent_emails == []


def test_admin_route_requires_admin_group(lambda_context) -> None:
    from admin.handler import lambda_handler

    response = lambda_handler(
        {
            "rawPath": "/admin/appointments",
            "requestContext": {
                "http": {"method": "GET"},
                "authorizer": {"jwt": {"claims": {"sub": "user-1", "cognito:groups": ["staff"]}}},
            },
        },
        lambda_context,
    )

    assert response["statusCode"] == 403


def test_business_settings_returns_safe_defaults_when_unseeded(monkeypatch, lambda_context) -> None:
    from business_settings import handler

    monkeypatch.setattr(handler, "get_item", lambda *args, **kwargs: None)

    response = handler.lambda_handler({"rawPath": "/business-settings"}, lambda_context)
    body = json.loads(response["body"])

    assert response["statusCode"] == 200
    assert body["businessName"] == "Braids by Deb"
    assert body["email"] == "bookings@braidsbydeb.com"
    assert body["address"]["street"] == "2847 Oak Lawn Ave, Suite 104"
    assert body["address"]["city"] == "Dallas"


class TestReviewAggregateDecimal:
    """Regression: DynamoDB rejects Python floats — recalculate_review_aggregate
    crashed every admin review create/approve/delete with a 500 (found in the
    2026-07-12 dev smoke test)."""

    def test_average_is_decimal_not_float(self, monkeypatch):
        from decimal import Decimal

        from admin import handler

        fake_reviews = [
            {"reviewId": "r1", "rating": 5, "approved": True},
            {"reviewId": "r2", "rating": 4, "approved": True},
            {"reviewId": "r3", "rating": 5, "approved": True},
        ]
        monkeypatch.setattr(handler, "scan_items", lambda *a, **kw: (fake_reviews, None))
        written = {}
        monkeypatch.setattr(handler, "put_item", lambda table, item: written.update(item))

        handler.recalculate_review_aggregate()

        assert written["totalCount"] == 3
        assert written["averageRating"] == Decimal("4.67")
        assert isinstance(written["averageRating"], Decimal)
        assert not isinstance(written["averageRating"], float)

    def test_zero_reviews_writes_decimal_zero(self, monkeypatch):
        from decimal import Decimal

        from admin import handler

        monkeypatch.setattr(handler, "scan_items", lambda *a, **kw: ([], None))
        written = {}
        monkeypatch.setattr(handler, "put_item", lambda table, item: written.update(item))

        handler.recalculate_review_aggregate()

        assert written["totalCount"] == 0
        assert isinstance(written["averageRating"], Decimal)
