from common import (
    REVIEWS_TABLE,
    bad_request,
    clean_string,
    generate_id,
    method_not_allowed,
    not_found,
    now_utc,
    parse_body,
    response,
    review_response,
)
from boto3.dynamodb.conditions import Key


def _list_reviews(event):
    query_params = event.get("queryStringParameters") or {}
    status = clean_string(query_params.get("status")) or "approved"
    items = REVIEWS_TABLE.query(
        IndexName="byStatus",
        KeyConditionExpression=Key("status").eq(status),
        ScanIndexForward=False,
    ).get("Items", [])
    return response(200, {"reviews": [review_response(item) for item in items]})


def _create_review(payload):
    errors = {}
    if not clean_string(payload.get("name")):
        errors["name"] = "name is required"
    try:
        rating = int(payload.get("rating"))
        if rating < 1 or rating > 5:
            raise ValueError
    except Exception:
        errors["rating"] = "rating must be an integer between 1 and 5"
        rating = None
    if not clean_string(payload.get("text")):
        errors["text"] = "text is required"
    if errors:
        return bad_request("Invalid review payload", errors)

    review_id = generate_id("rev")
    item = {
        "reviewId": review_id,
        "name": clean_string(payload["name"]),
        "location": clean_string(payload.get("location")),
        "serviceName": clean_string(payload.get("serviceName")),
        "rating": rating,
        "text": clean_string(payload["text"]),
        "appointmentId": clean_string(payload.get("appointmentId")),
        "status": "pending",
        "createdAt": now_utc(),
        "updatedAt": now_utc(),
    }
    REVIEWS_TABLE.put_item(Item=item)
    return response(201, {"review": review_response(item)})


def _patch_review(review_id, payload):
    existing = REVIEWS_TABLE.get_item(Key={"reviewId": review_id}).get("Item")
    if not existing:
        return not_found("Review not found")

    updates = {"updatedAt": now_utc()}
    if "status" in payload:
        status = clean_string(payload["status"])
        if status not in {"pending", "approved", "rejected"}:
            return bad_request("Unsupported status")
        updates["status"] = status
    if "text" in payload:
        updates["text"] = clean_string(payload["text"])
    if "serviceName" in payload:
        updates["serviceName"] = clean_string(payload["serviceName"])
    if "location" in payload:
        updates["location"] = clean_string(payload["location"])
    if "name" in payload:
        updates["name"] = clean_string(payload["name"])
    if "rating" in payload:
        try:
            updates["rating"] = int(payload["rating"])
        except Exception:
            return bad_request("rating must be an integer")

    expression_names = {}
    expression_values = {}
    expressions = []
    for index, (key, value) in enumerate(updates.items(), start=1):
        name_key = f"#field{index}"
        value_key = f":value{index}"
        expression_names[name_key] = key
        expression_values[value_key] = value
        expressions.append(f"{name_key} = {value_key}")

    REVIEWS_TABLE.update_item(
        Key={"reviewId": review_id},
        UpdateExpression="SET " + ", ".join(expressions),
        ExpressionAttributeNames=expression_names,
        ExpressionAttributeValues=expression_values,
    )
    updated = REVIEWS_TABLE.get_item(Key={"reviewId": review_id}).get("Item")
    return response(200, {"review": review_response(updated)})


def handler(event, _context):
    method = event.get("requestContext", {}).get("http", {}).get("method")
    review_id = (event.get("pathParameters") or {}).get("reviewId")
    if method == "GET":
        return _list_reviews(event)
    if method == "POST":
        return _create_review(parse_body(event))
    if method == "PATCH" and review_id:
        return _patch_review(review_id, parse_body(event))
    return method_not_allowed()
