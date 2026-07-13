from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext
from pydantic import ValidationError

from common.config import get_config
from common.dynamo import bool_filter, get_item, put_item, scan_items
from common.honeypot import is_bot
from common.http import method, parse_json_body, query_params, validation_errors
from common.ids import new_id, utc_now
from common.logger import logger
from common.response import bad_request, created, internal_error, ok, options
from reviews.models import ReviewSubmission


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    request_method = method(event)
    if request_method == "OPTIONS":
        return options()
    if request_method == "POST":
        return submit_review(event)
    return get_reviews(event)


def get_reviews(event: dict) -> dict:
    try:
        params = query_params(event)
        limit = min(int(params.get("limit", "10")), 25)
        items, next_cursor = scan_items(
            get_config().table_reviews,
            filter_expression=bool_filter("approved", True),
            limit=limit,
            cursor=params.get("cursor"),
        )
        reviews = [
            {
                "reviewId": item["reviewId"],
                "clientName": item["clientName"],
                "rating": item["rating"],
                "body": item["body"],
                "serviceName": item.get("serviceName"),
                "createdAt": item["createdAt"],
                "source": item.get("source", "website"),
                "status": "approved",
                "featured": item.get("featured", False),
            }
            for item in sorted(items, key=lambda item: item.get("createdAt", ""), reverse=True)
            if not str(item.get("reviewId", "")).startswith("AGGREGATE#")
        ]
        aggregate = get_item(get_config().table_reviews, {"reviewId": "AGGREGATE#RATINGS"}) or {}
        if not aggregate:
            aggregate = _compute_and_store_aggregate()
        return ok(
            {
                "reviews": reviews,
                "nextCursor": next_cursor,
                "aggregates": {
                    "averageRating": aggregate.get("averageRating", 0),
                    "totalCount": aggregate.get("totalCount", 0),
                },
            },
            cache_control="public, max-age=300",
        )
    except ValueError as exc:
        return bad_request(str(exc))
    except Exception:
        logger.exception("Failed to fetch reviews")
        return internal_error()


def _compute_and_store_aggregate() -> dict:
    """Scan all approved reviews, persist the aggregate row, and return it.

    Called when AGGREGATE#RATINGS is missing — self-heals without admin action.
    """
    all_items: list[dict] = []
    cursor = None
    while True:
        page, cursor = scan_items(
            get_config().table_reviews,
            filter_expression=bool_filter("approved", True),
            limit=100,
            cursor=cursor,
        )
        all_items.extend(it for it in page if not str(it.get("reviewId", "")).startswith("AGGREGATE#"))
        if not cursor:
            break
    total = len(all_items)
    rating_sum = sum(int(it.get("rating", 0)) for it in all_items)
    average = round(rating_sum / total, 2) if total else 0
    agg = {"averageRating": average, "totalCount": total}
    put_item(
        get_config().table_reviews,
        {
            "reviewId": "AGGREGATE#RATINGS",
            "totalCount": total,
            "sumRatings": rating_sum,
            "averageRating": average,
            "updatedAt": utc_now(),
        },
    )
    return agg


def submit_review(event: dict) -> dict:
    try:
        body = parse_json_body(event)
        if is_bot(body):
            return created({"reviewId": new_id(), "status": "pending"})
        review = ReviewSubmission.model_validate(body)
    except ValueError as exc:
        return bad_request(str(exc))
    except ValidationError as exc:
        return bad_request(validation_errors(exc))

    try:
        now = utc_now()
        review_id = new_id()
        put_item(
            get_config().table_reviews,
            {
                "reviewId": review_id,
                "clientName": review.clientName,
                "rating": review.rating,
                "body": review.body,
                "approved": False,
                "approvedKey": "false",
                "source": "submitted",
                "createdAt": now,
                "updatedAt": now,
            },
        )
        return created({"reviewId": review_id, "status": "pending"})
    except Exception:
        logger.exception("Failed to submit review")
        return internal_error()
