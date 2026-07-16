from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from common.validators import HtmlStrippingModelMixin, https_url


class PortfolioWrite(HtmlStrippingModelMixin, BaseModel):
    title: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=80)
    imageUrl: str
    thumbnailUrl: str
    featured: bool = False
    active: bool = True

    @field_validator("imageUrl", "thumbnailUrl")
    @classmethod
    def validate_urls(cls, value: str) -> str:
        return https_url(value)


class PortfolioPatch(HtmlStrippingModelMixin, BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    imageUrl: str | None = None
    thumbnailUrl: str | None = None
    featured: bool | None = None
    active: bool | None = None
    addImage: str | None = None  # appends a URL to the images[] gallery list
    # Removes a URL from images[]. Not URL-validated on purpose — it only
    # filters existing entries and must be able to remove a malformed legacy one.
    removeImage: str | None = None

    @field_validator("imageUrl", "thumbnailUrl", "addImage")
    @classmethod
    def validate_optional_urls(cls, value: str | None) -> str | None:
        return https_url(value) if value else value
