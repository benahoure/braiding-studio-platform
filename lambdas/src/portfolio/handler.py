from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext

from common.config import get_config
from common.dynamo import active_filter, scan_items
from common.http import method, query_params
from common.logger import logger
from common.response import bad_request, internal_error, ok, options

VALID_CATEGORIES = {"knotless", "box-braids", "senegalese", "sew-in", "natural", "kids", "men"}


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()
    try:
        params = query_params(event)
        category = params.get("category")
        if category and category not in VALID_CATEGORIES:
            return bad_request("Invalid portfolio category.")
        limit = min(int(params.get("limit", "50")), 50)
        items, next_cursor = scan_items(
            get_config().table_portfolio,
            filter_expression=active_filter(),
            limit=limit,
            cursor=params.get("cursor"),
        )
        if category:
            items = [item for item in items if item.get("category") == category]
        items = sorted(items, key=lambda item: item.get("createdAt", ""), reverse=True)
        return ok({"items": items, "nextCursor": next_cursor}, cache_control="public, max-age=120")
    except ValueError as exc:
        return bad_request(str(exc))
    except Exception:
        logger.exception("Failed to fetch portfolio")
        return internal_error()
