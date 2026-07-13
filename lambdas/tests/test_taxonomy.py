"""Service taxonomy validation — categories, subcategories, and filters.

Guards the sync between apps/web/src/lib/serviceCategories.ts,
services/models.py, and services/handler.py.
"""

from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

from services import handler as services_handler
from services.models import ServicePatch, ServiceWrite

MAIN_CATEGORIES = [
    "braids-protective-styles",
    "natural-ponytails",
    "sew-in-wigs",
    "kids",
]

BRAID_SUBCATEGORIES = [
    "box-braids",
    "knotless-braids",
    "boho-braids",
    "twist-braids",
    "cornrows",
    "fulani-braids",
]

LEGACY_CATEGORIES = ["african-braids", "natural", "sew-in", "men", "braids-protective"]


def make_service_body(**overrides) -> dict:
    body = {
        "name": "Small Box Braids",
        "category": "braids-protective-styles",
        "subcategory": "box-braids",
        "description": "Small box braids with clean square parts.",
        "startingPrice": 20000,
        "durationMinutes": 360,
        "imageUrl": "https://cdn.example.test/services/small-box-braids.png",
    }
    body.update(overrides)
    return body


class TestServiceModelTaxonomy:
    @pytest.mark.parametrize("category", MAIN_CATEGORIES)
    def test_write_accepts_all_main_categories(self, category: str) -> None:
        service = ServiceWrite.model_validate(make_service_body(category=category))
        assert service.category == category

    @pytest.mark.parametrize("subcategory", BRAID_SUBCATEGORIES)
    def test_write_accepts_braid_subcategories(self, subcategory: str) -> None:
        service = ServiceWrite.model_validate(make_service_body(subcategory=subcategory))
        assert service.subcategory == subcategory

    @pytest.mark.parametrize("category", LEGACY_CATEGORIES)
    def test_write_rejects_legacy_categories(self, category: str) -> None:
        with pytest.raises(ValidationError):
            ServiceWrite.model_validate(make_service_body(category=category))

    def test_write_accepts_optional_image_alt(self) -> None:
        service = ServiceWrite.model_validate(
            make_service_body(imageAlt="Client wearing small box braids")
        )
        assert service.imageAlt == "Client wearing small box braids"

    def test_write_works_without_image_alt(self) -> None:
        service = ServiceWrite.model_validate(make_service_body())
        assert service.imageAlt is None

    def test_patch_accepts_new_category_and_image_alt(self) -> None:
        patch = ServicePatch.model_validate(
            {"category": "braids-protective-styles", "imageAlt": "Updated alt"}
        )
        assert patch.category == "braids-protective-styles"
        assert patch.imageAlt == "Updated alt"

    def test_patch_rejects_legacy_category(self) -> None:
        with pytest.raises(ValidationError):
            ServicePatch.model_validate({"category": "african-braids"})


def make_get_event(category: str | None) -> dict:
    return {
        "requestContext": {"http": {"method": "GET"}},
        "queryStringParameters": {"category": category} if category else None,
        "rawPath": "/services",
    }


class FakeContext:
    function_name = "test"
    memory_limit_in_mb = 128
    invoked_function_arn = "arn:aws:lambda:us-east-1:0:function:test"
    aws_request_id = "test"


@pytest.fixture
def scanned_services(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    items = [
        {
            "serviceId": "bb-small",
            "name": "Small Box Braids",
            "category": "braids-protective-styles",
            "subcategory": "box-braids",
            "active": True,
        },
        {
            "serviceId": "kids-cornrows",
            "name": "Kids Cornrows",
            "category": "kids",
            "active": True,
        },
    ]
    monkeypatch.setattr(services_handler, "scan_items", lambda *a, **k: (items, None))
    return items


class TestServicesFilterEndpoint:
    @pytest.mark.parametrize(
        "category",
        ["braids-protective-styles", *BRAID_SUBCATEGORIES, "natural-ponytails", "sew-in-wigs", "kids"],
    )
    def test_get_services_accepts_all_taxonomy_filters(
        self, category: str, scanned_services: list[dict]
    ) -> None:
        response = services_handler.lambda_handler(make_get_event(category), FakeContext())
        assert response["statusCode"] == 200, f"{category} should be a valid filter"

    def test_get_services_filters_by_main_category(self, scanned_services: list[dict]) -> None:
        response = services_handler.lambda_handler(
            make_get_event("braids-protective-styles"), FakeContext()
        )
        services = json.loads(response["body"])["services"]
        assert [s["serviceId"] for s in services] == ["bb-small"]

    def test_get_services_filters_by_subcategory(self, scanned_services: list[dict]) -> None:
        response = services_handler.lambda_handler(make_get_event("box-braids"), FakeContext())
        services = json.loads(response["body"])["services"]
        assert [s["serviceId"] for s in services] == ["bb-small"]

    @pytest.mark.parametrize("category", ["african-braids", "specialty-braids", "bogus"])
    def test_get_services_rejects_unknown_filters(
        self, category: str, scanned_services: list[dict]
    ) -> None:
        response = services_handler.lambda_handler(make_get_event(category), FakeContext())
        assert response["statusCode"] == 400
