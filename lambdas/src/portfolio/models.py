from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from common.validators import HtmlStrippingModelMixin, https_url


class PortfolioWrite(HtmlStrippingModelMixin, BaseModel):
    title: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=80)
    imageUrl: str
    thumbnailUrl: str
    # Optional full gallery at create time — normalized to cover-first,
    # deduped, max 4 by the handler.
    images: list[str] | None = Field(default=None, max_length=4)
    featured: bool = False
    active: bool = True

    @field_validator("imageUrl", "thumbnailUrl")
    @classmethod
    def validate_urls(cls, value: str) -> str:
        return https_url(value)

    @field_validator("images")
    @classmethod
    def validate_images(cls, value: list[str] | None) -> list[str] | None:
        if value:
            for url in value:
                https_url(url)
        return value


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
