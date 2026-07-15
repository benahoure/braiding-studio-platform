from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from common.validators import HtmlStrippingModelMixin, https_url

# Braids by Deb main categories — must stay in sync with
# apps/web/src/lib/serviceCategories.ts and services/handler.py.
ServiceCategory = Literal[
    "braids-protective-styles",
    "natural-ponytails",
    "sew-in-wigs",
    "kids",
]


class LengthOption(HtmlStrippingModelMixin, BaseModel):
    """One length tier of a service, e.g. 'Waist length' at $300."""

    label: str = Field(min_length=2, max_length=40)
    price: int = Field(gt=0, le=500_000)  # cents


class ServiceWrite(HtmlStrippingModelMixin, BaseModel):
    name: str = Field(min_length=2, max_length=100)
    category: ServiceCategory
    subcategory: str | None = Field(default=None, max_length=100)
    description: str = Field(min_length=10, max_length=500)
    startingPrice: int = Field(gt=0)
    durationMinutes: int = Field(gt=0, le=720)
    lengths: list[LengthOption] | None = Field(default=None, max_length=6)
    imageUrl: str
    imageAlt: str | None = Field(default=None, max_length=200)
    imagePosition: str | None = Field(default=None, max_length=50)
    featured: bool = False
    active: bool = True

    @field_validator("imageUrl")
    @classmethod
    def validate_image_url(cls, value: str) -> str:
        return https_url(value)


class ServicePatch(HtmlStrippingModelMixin, BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    category: ServiceCategory | None = None
    subcategory: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, min_length=10, max_length=500)
    startingPrice: int | None = Field(default=None, gt=0)
    durationMinutes: int | None = Field(default=None, gt=0, le=720)
    lengths: list[LengthOption] | None = Field(default=None, max_length=6)
    imageUrl: str | None = None
    imageAlt: str | None = Field(default=None, max_length=200)
    imagePosition: str | None = Field(default=None, max_length=50)
    featured: bool | None = None
    active: bool | None = None
    addImage: str | None = None  # appends a URL to the images[] gallery list

    @field_validator("imageUrl", "addImage")
    @classmethod
    def validate_optional_image_url(cls, value: str | None) -> str | None:
        return https_url(value) if value else value
