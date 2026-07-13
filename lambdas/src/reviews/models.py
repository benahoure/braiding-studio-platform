from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from common.validators import HtmlStrippingModelMixin, public_display_name


class ReviewSubmission(HtmlStrippingModelMixin, BaseModel):
    clientName: str = Field(min_length=2, max_length=50)
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=10, max_length=1000)
    honeypot: str = Field(default="", exclude=True)

    @field_validator("clientName")
    @classmethod
    def display_name_only(cls, value: str) -> str:
        return public_display_name(value)


class ReviewWrite(HtmlStrippingModelMixin, BaseModel):
    clientName: str = Field(min_length=2, max_length=50)
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=10, max_length=1000)
    approved: bool = False
    source: Literal["submitted", "manual"] = "manual"

    @field_validator("clientName")
    @classmethod
    def display_name_only(cls, value: str) -> str:
        return public_display_name(value)


class ReviewPatch(HtmlStrippingModelMixin, BaseModel):
    clientName: str | None = Field(default=None, min_length=2, max_length=50)
    rating: int | None = Field(default=None, ge=1, le=5)
    body: str | None = Field(default=None, min_length=10, max_length=1000)
    approved: bool | None = None
    featured: bool | None = None

    @field_validator("clientName")
    @classmethod
    def display_optional_name(cls, value: str | None) -> str | None:
        return public_display_name(value) if value else value
