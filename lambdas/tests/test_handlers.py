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


class TestServiceGallery:
    """Service photo gallery (up to 4 angles for the public slider):
    addImage is capped and deduped; removeImage filters the list but can
    never orphan the cover photo."""

    URL_A = "https://assets.braidsbydeb.com/services/a.jpg"
    URL_B = "https://assets.braidsbydeb.com/services/b.jpg"
    URL_C = "https://assets.braidsbydeb.com/services/c.jpg"

    def _event(self, body: dict) -> dict:
        return {"body": json.dumps(body), "pathParameters": {"serviceId": "svc-1"}}

    def _run(self, monkeypatch, body: dict, item: dict):
        from admin import handler

        calls: dict = {}
        monkeypatch.setattr(handler, "validate_cdn_url", lambda value, prefix: value)
        monkeypatch.setattr(handler, "audit", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "get_item", lambda table, key: dict(item))
        monkeypatch.setattr(
            handler,
            "append_list_item",
            lambda table, key, attr, value: calls.setdefault("appended", value)
            or {**item, "images": [*item.get("images", []), value]},
        )
        monkeypatch.setattr(
            handler,
            "update_item",
            lambda table, key, updates: calls.setdefault("updated", updates) or {**item, **updates},
        )
        monkeypatch.setattr(
            handler,
            "update_item_with_removes",
            lambda table, key, sets, removes: {**item, **sets},
        )
        response = handler.patch_service(self._event(body), "admin-1")
        return response, calls

    def _item(self, images: list[str]) -> dict:
        return {"serviceId": "svc-1", "name": "Small Knotless", "imageUrl": self.URL_A, "images": images}

    def test_add_image_appends(self, monkeypatch):
        response, calls = self._run(monkeypatch, {"addImage": self.URL_B}, self._item([self.URL_A]))
        assert response["statusCode"] == 200
        assert calls["appended"] == self.URL_B

    def test_add_image_rejected_at_cap_of_four(self, monkeypatch):
        item = self._item([self.URL_A, self.URL_B, self.URL_C, "https://assets.braidsbydeb.com/services/d.jpg"])
        response, calls = self._run(monkeypatch, {"addImage": "https://assets.braidsbydeb.com/services/e.jpg"}, item)
        assert response["statusCode"] == 400
        assert "4 photos" in json.loads(response["body"])["error"]["message"]
        assert "appended" not in calls

    def test_add_image_rejects_duplicate(self, monkeypatch):
        response, calls = self._run(monkeypatch, {"addImage": self.URL_B}, self._item([self.URL_A, self.URL_B]))
        assert response["statusCode"] == 400
        assert "already" in json.loads(response["body"])["error"]["message"]
        assert "appended" not in calls

    def test_remove_image_filters_gallery(self, monkeypatch):
        response, calls = self._run(monkeypatch, {"removeImage": self.URL_B}, self._item([self.URL_A, self.URL_B]))
        assert response["statusCode"] == 200
        assert calls["updated"]["images"] == [self.URL_A]

    def test_remove_cover_is_blocked(self, monkeypatch):
        response, calls = self._run(monkeypatch, {"removeImage": self.URL_A}, self._item([self.URL_A, self.URL_B]))
        assert response["statusCode"] == 400
        assert "cover" in json.loads(response["body"])["error"]["message"]
        assert "updated" not in calls

    def test_remove_image_alone_passes_empty_guard(self, monkeypatch):
        response, _ = self._run(monkeypatch, {"removeImage": self.URL_C}, self._item([self.URL_A, self.URL_B]))
        assert response["statusCode"] == 200


class TestCreateWithGallery:
    """Admins add all photos in one flow at CREATE time — no more
    save-first-then-edit round-trip."""

    COVER = "https://assets.braidsbydeb.com/services/cover.jpg"
    B = "https://assets.braidsbydeb.com/services/b.jpg"
    C = "https://assets.braidsbydeb.com/services/c.jpg"

    def _create_service(self, monkeypatch, body: dict):
        from admin import handler

        stored: dict = {}
        monkeypatch.setattr(handler, "validate_cdn_url", lambda value, prefix: value)
        monkeypatch.setattr(handler, "audit", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "put_item", lambda table, item: stored.update(item))
        response = handler.create_service({"body": json.dumps(body)}, "admin-1")
        return response, stored

    def _service_body(self, images: list[str] | None) -> dict:
        body = {
            "name": "Small Knotless Braids",
            "category": "braids-protective-styles",
            "description": "Beautiful small knotless braids",
            "startingPrice": 20000,
            "durationMinutes": 360,
            "imageUrl": self.COVER,
        }
        if images is not None:
            body["images"] = images
        return body

    def test_service_created_with_full_gallery(self, monkeypatch):
        response, stored = self._create_service(monkeypatch, self._service_body([self.B, self.C]))
        assert response["statusCode"] == 201
        assert stored["images"] == [self.COVER, self.B, self.C]

    def test_service_gallery_dedupes_cover(self, monkeypatch):
        response, stored = self._create_service(monkeypatch, self._service_body([self.COVER, self.B]))
        assert response["statusCode"] == 201
        assert stored["images"] == [self.COVER, self.B]

    def test_service_gallery_over_cap_rejected(self, monkeypatch):
        extras = [f"https://assets.braidsbydeb.com/services/{n}.jpg" for n in "wxyz"]
        response, stored = self._create_service(monkeypatch, self._service_body(extras))
        assert response["statusCode"] == 400
        assert not stored

    def test_service_without_images_keeps_cover_only(self, monkeypatch):
        response, stored = self._create_service(monkeypatch, self._service_body(None))
        assert response["statusCode"] == 201
        assert stored["images"] == [self.COVER]

    def test_portfolio_created_with_full_gallery(self, monkeypatch):
        from admin import handler

        stored: dict = {}
        monkeypatch.setattr(handler, "validate_cdn_url_any", lambda value: value)
        monkeypatch.setattr(handler, "audit", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "put_item", lambda table, item: stored.update(item))
        body = {
            "title": "Boho Look",
            "category": "boho",
            "imageUrl": self.COVER,
            "thumbnailUrl": self.COVER,
            "images": [self.B, self.C],
        }
        response = handler.create_portfolio({"body": json.dumps(body)}, "admin-1")
        assert response["statusCode"] == 201
        assert stored["images"] == [self.COVER, self.B, self.C]


class TestPortfolioGallery:
    """Portfolio items share the service gallery rules: capped at 4,
    deduped, and the cover picture can never be removed."""

    URL_A = "https://assets.braidsbydeb.com/portfolio/a.jpg"
    URL_B = "https://assets.braidsbydeb.com/portfolio/b.jpg"

    def _run(self, monkeypatch, body: dict, item: dict):
        from admin import handler

        calls: dict = {}
        monkeypatch.setattr(handler, "validate_cdn_url_any", lambda value: value)
        monkeypatch.setattr(handler, "audit", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "get_item", lambda table, key: dict(item))
        monkeypatch.setattr(
            handler,
            "append_list_item",
            lambda table, key, attr, value: calls.setdefault("appended", value)
            or {**item, "images": [*item.get("images", []), value]},
        )
        monkeypatch.setattr(
            handler,
            "update_item",
            lambda table, key, updates: calls.setdefault("updated", updates) or {**item, **updates},
        )
        event = {"body": json.dumps(body), "pathParameters": {"styleId": "style-1"}}
        return handler.patch_portfolio(event, "admin-1"), calls

    def _item(self, images: list[str] | None) -> dict:
        item = {"styleId": "style-1", "title": "Boho Look", "imageUrl": self.URL_A}
        if images is not None:
            item["images"] = images
        return item

    def test_add_image_appends_even_on_legacy_items_without_gallery(self, monkeypatch):
        response, calls = self._run(monkeypatch, {"addImage": self.URL_B}, self._item(None))
        assert response["statusCode"] == 200
        assert calls["appended"] == self.URL_B

    def test_add_image_rejected_at_cap(self, monkeypatch):
        item = self._item([f"https://assets.braidsbydeb.com/portfolio/{n}.jpg" for n in "abcd"])
        response, calls = self._run(monkeypatch, {"addImage": self.URL_B}, item)
        assert response["statusCode"] == 400
        assert "appended" not in calls

    def test_remove_cover_is_blocked(self, monkeypatch):
        response, calls = self._run(monkeypatch, {"removeImage": self.URL_A}, self._item([self.URL_A, self.URL_B]))
        assert response["statusCode"] == 400
        assert "cover" in json.loads(response["body"])["error"]["message"]
        assert "updated" not in calls

    def test_remove_image_filters_gallery(self, monkeypatch):
        response, calls = self._run(monkeypatch, {"removeImage": self.URL_B}, self._item([self.URL_A, self.URL_B]))
        assert response["statusCode"] == 200
        assert calls["updated"]["images"] == [self.URL_A]


class TestStoryImageSetting:
    """About page 'Her Story' photo — admin-editable via storyImageUrl.

    The public handler allowlists response fields, so a model-only addition
    silently never reaches the site; both halves are covered here."""

    def test_patch_accepts_https_story_image(self):
        from business_settings.models import BusinessSettingsPatch

        patch = BusinessSettingsPatch.model_validate(
            {"storyImageUrl": "https://assets.braidsbydeb.com/story.jpg"}
        )
        assert patch.storyImageUrl == "https://assets.braidsbydeb.com/story.jpg"

    def test_patch_rejects_non_https_story_image(self):
        import pytest
        from pydantic import ValidationError

        from business_settings.models import BusinessSettingsPatch

        with pytest.raises(ValidationError, match="HTTPS"):
            BusinessSettingsPatch.model_validate({"storyImageUrl": "http://insecure.example.com/x.jpg"})

    def test_public_endpoint_serves_story_image(self, monkeypatch, lambda_context):
        from business_settings import handler

        stored = dict(handler.DEFAULT_SETTINGS)
        stored["storyImageUrl"] = "https://assets.braidsbydeb.com/story.jpg"
        monkeypatch.setattr(handler, "get_item", lambda *args, **kwargs: stored)

        response = handler.lambda_handler({"rawPath": "/business-settings"}, lambda_context)
        body = json.loads(response["body"])

        assert response["statusCode"] == 200
        assert body["storyImageUrl"] == "https://assets.braidsbydeb.com/story.jpg"


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


class TestConfirmAlreadyConfirmed:
    """Regression: the Stripe webhook races the browser's confirm call and
    usually wins. The already-confirmed branch used to return a bare
    {"status": "already_confirmed"} with no portalUrl, silently hiding the
    "View My Appointment" button on the confirmation screen."""

    def _appt(self):
        return {
            "appointmentId": "appt-race-001",
            "status": "confirmed",
            "appointmentToken": "tok-race-xyz",
        }

    def test_returns_full_payload_with_portal_url(self, monkeypatch):
        from types import SimpleNamespace

        from appointments import service
        from appointments.models import ConfirmAppointmentRequest

        monkeypatch.setattr(service, "get_item", lambda table, key: self._appt())
        monkeypatch.setattr(
            service,
            "retrieve_payment_intent",
            lambda intent_id: SimpleNamespace(
                metadata=SimpleNamespace(appointmentId="appt-race-001"), status="succeeded"
            ),
        )

        result = service.confirm_appointment(
            "appt-race-001", ConfirmAppointmentRequest(stripePaymentIntentId="pi_test_race")
        )

        assert result["status"] == "confirmed"
        assert result["appointmentId"] == "appt-race-001"
        assert result["portalUrl"].endswith("/appointment/tok-race-xyz")

    def test_still_rejects_mismatched_intent(self, monkeypatch):
        from types import SimpleNamespace

        import pytest

        from appointments import service
        from appointments.models import ConfirmAppointmentRequest

        monkeypatch.setattr(service, "get_item", lambda table, key: self._appt())
        monkeypatch.setattr(
            service,
            "retrieve_payment_intent",
            lambda intent_id: SimpleNamespace(
                metadata=SimpleNamespace(appointmentId="SOME-OTHER-APPT"), status="succeeded"
            ),
        )

        with pytest.raises(ValueError, match="does not match"):
            service.confirm_appointment(
                "appt-race-001", ConfirmAppointmentRequest(stripePaymentIntentId="pi_test_race")
            )


class TestLengthPricing:
    """Length tiers: the browser sends only a label — the server resolves the
    real price from the service record and snapshots it on the appointment."""

    def _service(self):
        return {
            "serviceId": "kl-small",
            "name": "Small Knotless Braids",
            "active": True,
            "startingPrice": 20000,
            "durationMinutes": 360,
            "lengths": [
                {"label": "Mid-back", "price": 20000},
                {"label": "Waist length", "price": 30000},
            ],
        }

    def _request(self, length_label):
        from appointments.models import PaymentIntentRequest

        return PaymentIntentRequest(
            serviceId="kl-small",
            clientName="Test Client",
            clientEmail="t@example.com",
            clientPhone="3175550123",
            preferredDate=(dt.date.today() + dt.timedelta(days=30)).isoformat(),
            preferredTime="09:00",
            lengthLabel=length_label,
            policyAccepted=True,
        )

    def _run(self, monkeypatch, length_label):
        from types import SimpleNamespace

        from appointments import service

        stored = {}
        monkeypatch.setattr(service, "get_item", lambda table, key: self._service())
        monkeypatch.setattr(service, "_slot_is_available", lambda *a, **kw: True)
        monkeypatch.setattr(
            service, "create_payment_intent", lambda amount, metadata: SimpleNamespace(id="pi_x", client_secret="cs_x")
        )
        monkeypatch.setattr(service, "put_item", lambda table, item: stored.update(item))
        service.create_payment_intent_hold(self._request(length_label), None, None)
        return stored

    def test_price_resolved_from_length(self, monkeypatch):
        stored = self._run(monkeypatch, "Waist length")
        assert stored["servicePrice"] == 30000
        assert stored["lengthLabel"] == "Waist length"

    def test_missing_length_rejected_when_service_has_lengths(self, monkeypatch):
        import pytest

        with pytest.raises(ValueError, match="choose a length"):
            self._run(monkeypatch, None)

    def test_unknown_length_rejected(self, monkeypatch):
        import pytest

        with pytest.raises(ValueError, match="choose a length"):
            self._run(monkeypatch, "Ankle length")


class TestBlockedTimeWindows:
    """Partial-day blocks from settings.blockedSlots hide slots and are
    enforced server-side in the hold validation."""

    def test_settings_parse_blocked_windows(self, monkeypatch):
        from appointments import availability

        monkeypatch.setattr(
            availability,
            "get_item",
            lambda table, key: {
                "hours": availability.DEFAULT_HOURS,
                "blockedDates": ["2099-02-01"],
                "blockedSlots": [
                    {"date": "2099-02-02", "start": "09:00", "end": "13:00"},
                    {"date": "2099-02-02", "start": "18:00", "end": "20:00"},
                    {"date": "bad", "start": "10:00", "end": "09:00"},  # inverted → ignored
                ],
            },
        )
        hours, blocked_dates, windows = availability._get_settings()
        assert "2099-02-01" in blocked_dates
        assert windows["2099-02-02"] == [(540, 780), (1080, 1200)]
        assert "bad" not in windows

    def test_slot_overlapping_block_is_unavailable(self, monkeypatch):
        from appointments import availability, service

        monkeypatch.setattr(
            availability,
            "_get_settings",
            lambda: (availability.DEFAULT_HOURS, set(), {"2099-02-02": [(540, 780)]}),  # 9:00–13:00 blocked
        )
        monkeypatch.setattr(service, "scan_items", lambda *a, **kw: ([], None))

        # A 6h service at 08:00 runs into the 9–13 block → rejected
        assert service._slot_is_available("2099-02-02", "08:00", duration_minutes=360) is False
        # 13:00 starts exactly when the block ends → allowed
        assert service._slot_is_available("2099-02-02", "13:00", duration_minutes=360) is True
        # A fully blocked-out DATE still rejects everything
        monkeypatch.setattr(
            availability, "_get_settings", lambda: (availability.DEFAULT_HOURS, {"2099-02-02"}, {})
        )
        assert service._slot_is_available("2099-02-02", "13:00", duration_minutes=60) is False
