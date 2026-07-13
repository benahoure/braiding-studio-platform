from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext

from common.config import get_config
from common.dynamo import active_filter, bool_filter, scan_items
from common.http import method, query_params
from common.logger import logger
from common.response import bad_request, internal_error, ok, options

# Braids by Deb taxonomy — must stay in sync with
# apps/web/src/lib/serviceCategories.ts and services/models.py.
VALID_CATEGORIES = {
    "braids-protective-styles",
    "natural-ponytails",
    "sew-in-wigs",
    "kids",
}
VALID_SUBCATEGORIES = {
    # Braids & Protective Styles families
    "box-braids",
    "knotless-braids",
    "boho-braids",
    "twist-braids",
    "cornrows",
    "fulani-braids",
    # Natural Hair & Ponytails
    "natural-styling",
    "ponytails",
    # Sew-In, Wigs & Crochet
    "sew-in",
    "wig-cornrows",
    "crochet",
    # Kids & Toddlers
    "kids-braids",
    "toddler-styles",
}
VALID_FILTER_VALUES = VALID_CATEGORIES | VALID_SUBCATEGORIES


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()
    try:
        params = query_params(event)
        category = params.get("category")
        featured = params.get("featured")
        if category and category not in VALID_FILTER_VALUES:
            return bad_request("Invalid service category.")

        filter_expression = active_filter()
        if featured == "true":
            filter_expression = filter_expression & bool_filter("featured", True)
        items, _ = scan_items(get_config().table_services, filter_expression=filter_expression, limit=100)
        if category:
            items = [item for item in items if item.get("category") == category or item.get("subcategory") == category]
        return ok(
            {"services": sorted(items, key=lambda item: item.get("name", ""))},
            cache_control="public, max-age=300",
        )
    except Exception:
        logger.exception("Failed to fetch services")
        return internal_error()
