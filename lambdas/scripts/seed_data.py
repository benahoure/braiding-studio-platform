#!/usr/bin/env python3
from __future__ import annotations

import os
from decimal import Decimal
from typing import Any

import boto3

BUSINESS_SETTINGS = {
    "settingId": "BUSINESS#SETTINGS",
    "version": "v1",
    "businessName": "Braids by Deb",
    "phone": "+12145550192",
    "email": "bookings@braidsbydeb.com",
    "address": {
        "street": "2847 Oak Lawn Ave, Suite 104",
        "city": "Dallas",
        "state": "TX",
        "zip": "75219",
    },
    "hours": {
        day: {"open": "09:00", "close": "20:00", "closed": False}
        for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    },
    "socialLinks": {
        "instagram": "https://www.instagram.com/braided_bydebs/",
        "facebook": None,
        "tiktok": "https://www.tiktok.com/@braids_by_debs",
    },
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Braids+by+Deb+Dallas+TX",
    "googleReviewUrl": "https://www.google.com/maps/search/?api=1&query=Braids+by+Deb+Dallas+TX",
    "announcementBanner": None,
    "bookingNotice": "A $20 non-refundable deposit is required to reserve your appointment.",
    "updatedAt": "2026-05-14T00:00:00Z",
    "updatedBy": "seed",
}

# startingPrice is in cents. Prices/durations mirror the Braids by Deb service menu.
SERVICES: list[dict[str, Any]] = [
    {
        "serviceId": "bb-small",
        "name": "Small Box Braids",
        "category": "braids-protective-styles",
        "subcategory": "box-braids",
        "description": "Small box braids with clean square parts, a lightweight feel, and beautiful length.",
        "startingPrice": 20000,
        "durationMinutes": 360,
        "imagePath": "/images/small-box-braids.png",
        "featured": False,
        "bookingCount": 120,
    },
    {
        "serviceId": "bb-medium",
        "name": "Medium Box Braids",
        "category": "braids-protective-styles",
        "subcategory": "box-braids",
        "description": "Classic medium box braids — the everyday protective style, neat and versatile.",
        "startingPrice": 18000,
        "durationMinutes": 300,
        "imagePath": "/images/medium-box-braids.jpg",
        "featured": True,
        "bookingCount": 163,
    },
    {
        "serviceId": "bb-large",
        "name": "Large Box Braids",
        "category": "braids-protective-styles",
        "subcategory": "box-braids",
        "description": "Large box braids for a bold, quick-install look with plenty of movement.",
        "startingPrice": 16000,
        "durationMinutes": 180,
        "imagePath": "/images/large-box-braids.png",
        "featured": False,
        "bookingCount": 88,
    },
    {
        "serviceId": "kl-small",
        "name": "Small Knotless Braids",
        "category": "braids-protective-styles",
        "subcategory": "knotless-braids",
        "description": "Small knotless braids with a natural lay and reduced scalp tension for lasting comfort.",
        "startingPrice": 20000,
        "durationMinutes": 420,
        "imagePath": "/images/small-knotless-braids.jpg",
        "featured": True,
        "bookingCount": 201,
    },
    {
        "serviceId": "kl-medium",
        "name": "Medium Knotless Braids",
        "category": "braids-protective-styles",
        "subcategory": "knotless-braids",
        "description": "Lightweight medium knotless braids that lay flat and feel weightless from day one.",
        "startingPrice": 18000,
        "durationMinutes": 360,
        "imagePath": "/images/medium-knotless-braids.jpg",
        "featured": True,
        "bookingCount": 187,
    },
    {
        "serviceId": "kl-large",
        "name": "Large Knotless Braids",
        "category": "braids-protective-styles",
        "subcategory": "knotless-braids",
        "description": "Large knotless braids with a soft, natural finish and a faster install time.",
        "startingPrice": 16000,
        "durationMinutes": 240,
        "imagePath": "/images/large-knotless-braids.jpg",
        "featured": False,
        "bookingCount": 96,
    },
    {
        "serviceId": "boho-small",
        "name": "Small Boho Braids",
        "category": "braids-protective-styles",
        "subcategory": "boho-braids",
        "description": "Small boho braids with soft curly pieces for a romantic, dimensional finish.",
        "startingPrice": 28000,
        "durationMinutes": 360,
        "imagePath": "/images/small-boho-braids.jpg",
        "featured": True,
        "bookingCount": 109,
    },
    {
        "serviceId": "boho-medium",
        "name": "Medium Boho Braids",
        "category": "braids-protective-styles",
        "subcategory": "boho-braids",
        "description": "Medium boho braids blending sleek braids with loose curls for a boho-chic look.",
        "startingPrice": 24000,
        "durationMinutes": 300,
        "imagePath": "/images/medium-boho-braids.jpg",
        "featured": True,
        "bookingCount": 94,
    },
    {
        "serviceId": "boho-large",
        "name": "Large Boho Braids",
        "category": "braids-protective-styles",
        "subcategory": "boho-braids",
        "description": "Large boho braids with statement curls for effortless volume and texture.",
        "startingPrice": 20000,
        "durationMinutes": 240,
        "imagePath": "/images/medium-twist-boho-braids.jpg",
        "featured": False,
        "bookingCount": 61,
    },
    {
        "serviceId": "twist-small",
        "name": "Small Twist Braids",
        "category": "braids-protective-styles",
        "subcategory": "twist-braids",
        "description": "Small two-strand twists with a smooth finish, natural movement, and lasting hold.",
        "startingPrice": 26000,
        "durationMinutes": 330,
        "imagePath": "/images/twist-braids.jpg",
        "featured": False,
        "bookingCount": 72,
    },
    {
        "serviceId": "twist-medium",
        "name": "Medium Twist Braids",
        "category": "braids-protective-styles",
        "subcategory": "twist-braids",
        "description": "Medium twists with a clean, defined finish — a lightweight protective favorite.",
        "startingPrice": 22000,
        "durationMinutes": 270,
        "imagePath": "/images/twist-braids.jpg",
        "featured": True,
        "bookingCount": 83,
    },
    {
        "serviceId": "twist-large",
        "name": "Large Twist Braids",
        "category": "braids-protective-styles",
        "subcategory": "twist-braids",
        "description": "Large twists for a bold, textured look with a quicker install.",
        "startingPrice": 20000,
        "durationMinutes": 210,
        "imagePath": "/images/medium-twist-boho-braids.jpg",
        "featured": False,
        "bookingCount": 44,
    },
    {
        "serviceId": "cornrows",
        "name": "Cornrows",
        "category": "braids-protective-styles",
        "subcategory": "cornrows",
        "description": "Neat straight-back or custom-pattern cornrows with clean parts and a comfortable install.",
        "startingPrice": 18000,
        "durationMinutes": 180,
        "imagePath": "/images/straight-back-cornrows.jpg",
        "featured": True,
        "bookingCount": 77,
    },
    {
        "serviceId": "fulani-small",
        "name": "Small Fulani Braids",
        "category": "braids-protective-styles",
        "subcategory": "fulani-braids",
        "description": "Small Fulani braids with delicate cornrow patterns and a refined protective finish.",
        "startingPrice": 20000,
        "durationMinutes": 180,
        "imagePath": "/images/fulani-braids.jpg",
        "featured": True,
        "bookingCount": 98,
    },
    {
        "serviceId": "fulani-medium",
        "name": "Medium Fulani Braids",
        "category": "braids-protective-styles",
        "subcategory": "fulani-braids",
        "description": "Traditional Fulani braids with signature center patterns and beautiful detailing.",
        "startingPrice": 18000,
        "durationMinutes": 150,
        "imagePath": "/images/fulani-braids.jpg",
        "featured": False,
        "bookingCount": 65,
    },
    {
        "serviceId": "fulani-hairstyle",
        "name": "Fulani Hairstyle",
        "category": "braids-protective-styles",
        "subcategory": "fulani-braids",
        "description": "A styled Fulani look with braided patterns designed for a polished, finished result.",
        "startingPrice": 15000,
        "durationMinutes": 180,
        "imagePath": "/images/fulani-hairstyle.jpg",
        "featured": False,
        "bookingCount": 39,
    },
    {
        "serviceId": "kids-cornrows",
        "name": "Kids Cornrows",
        "category": "kids",
        "description": "Gentle, neat cornrows for children — comfortable, quick, and confidence-boosting.",
        "startingPrice": 12000,
        "durationMinutes": 90,
        "imagePath": "/images/kids-cornrows.jpg",
        "featured": True,
        "bookingCount": 134,
    },
    {
        "serviceId": "kids-box",
        "name": "Kids Box Braids",
        "category": "kids",
        "description": "Kid-friendly box braids styled for comfort, neatness, and easy upkeep.",
        "startingPrice": 16000,
        "durationMinutes": 150,
        "imagePath": "/images/kids-box-braids.png",
        "featured": False,
        "bookingCount": 71,
    },
    {
        "serviceId": "kids-knotless",
        "name": "Kids Knotless",
        "category": "kids",
        "description": "Lightweight knotless braids for kids with a soft, tension-free install.",
        "startingPrice": 16000,
        "durationMinutes": 150,
        "imagePath": "/images/kids-braided-ponytails.jpg",
        "featured": False,
        "bookingCount": 58,
    },
    {
        "serviceId": "kids-other",
        "name": "Kids Other Styles",
        "category": "kids",
        "description": "Custom kids styles — twists, puffs, and beaded looks tailored to your little one.",
        "startingPrice": 12000,
        "durationMinutes": 120,
        "imagePath": "/images/kids-braided-ponytails.jpg",
        "featured": False,
        "bookingCount": 47,
    },
]

PORTFOLIO_ITEMS: list[tuple[str, str, str, str]] = [
    ("style-knotless-waist", "Waist-Length Knotless Braids", "knotless", "/images/small-knotless-braids.jpg"),
    ("style-knotless-medium", "Medium Knotless Braids", "knotless", "/images/medium-knotless-braids.jpg"),
    ("style-boho-curls", "Boho Braids with Soft Curls", "boho", "/images/small-boho-braids.jpg"),
    ("style-boho-medium", "Medium Boho Braids", "boho", "/images/medium-boho-braids.jpg"),
    ("style-box-classic", "Classic Box Braids", "box-braids", "/images/medium-box-braids.jpg"),
    ("style-box-small", "Small Box Braids", "box-braids", "/images/small-box-braids.png"),
    ("style-fulani", "Fulani Braids", "fulani", "/images/fulani-braids.jpg"),
    ("style-fulani-styled", "Fulani Hairstyle", "fulani", "/images/fulani-hairstyle.jpg"),
    ("style-twist-medium", "Medium Twist Braids", "twists", "/images/twist-braids.jpg"),
    ("style-cornrows", "Custom Cornrow Design", "cornrows", "/images/straight-back-cornrows.jpg"),
    ("style-kids-beads", "Kids Cornrows with Beads", "kids", "/images/kids-cornrows.jpg"),
    ("style-kids-box", "Kids Box Braids", "kids", "/images/kids-box-braids.png"),
]

DEMO_REVIEWS: list[dict[str, Any]] = [
    {
        "reviewId": "review-1",
        "clientName": "Amara T.",
        "rating": 5,
        "body": (
            "Deb did an incredible job on my knotless braids. Clean parts, zero tension on my scalp, "
            "and they lasted almost 8 weeks."
        ),
        "serviceName": "Medium Knotless Braids",
        "createdAt": "2026-04-22T12:00:00Z",
        "featured": True,
    },
    {
        "reviewId": "review-2",
        "clientName": "Kezia M.",
        "rating": 5,
        "body": (
            "Brought my daughter in for the first time and she absolutely loved it. Deb was so patient "
            "and gentle with her."
        ),
        "serviceName": "Kids Cornrows",
        "createdAt": "2026-04-10T12:00:00Z",
        "featured": True,
    },
    {
        "reviewId": "review-3",
        "clientName": "Nadia B.",
        "rating": 5,
        "body": (
            "Best boho braids I have ever had. The texture was perfect, the length was flawless, "
            "and she listened to exactly what I wanted."
        ),
        "serviceName": "Small Boho Braids",
        "createdAt": "2026-03-28T12:00:00Z",
        "featured": True,
    },
    {
        "reviewId": "review-4",
        "clientName": "Imani R.",
        "rating": 5,
        "body": (
            "My Fulani braids came out so clean and detailed. I get compliments everywhere I go — "
            "already booked my next appointment."
        ),
        "serviceName": "Small Fulani Braids",
        "createdAt": "2026-03-15T12:00:00Z",
        "featured": False,
    },
    {
        "reviewId": "review-5",
        "clientName": "Zora A.",
        "rating": 5,
        "body": "My hair has never felt so healthy. Deb spent real time understanding my hair before touching it.",
        "serviceName": "Medium Box Braids",
        "createdAt": "2026-02-20T12:00:00Z",
        "featured": False,
    },
    {
        "reviewId": "review-6",
        "clientName": "Fatou D.",
        "rating": 5,
        "body": (
            "Came in for cornrows and left feeling like royalty. The parts are so clean and "
            "the install was painless."
        ),
        "serviceName": "Cornrows",
        "createdAt": "2026-02-05T12:00:00Z",
        "featured": False,
    },
]


def env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y"}


def money(value: int) -> Decimal:
    return Decimal(value)


def asset_url(cdn_base_url: str, path: str) -> str:
    return f"{cdn_base_url}/{path.lstrip('/')}"


def prune_missing(table: Any, key_name: str, expected_keys: set[str]) -> None:
    for item in table.scan(ProjectionExpression=key_name).get("Items", []):
        key = item.get(key_name)
        if key and key not in expected_keys:
            table.delete_item(Key={key_name: key})


def scan_all(table: Any) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    kwargs: dict[str, Any] = {}
    while True:
        response = table.scan(**kwargs)
        items.extend(response.get("Items", []))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            return items
        kwargs["ExclusiveStartKey"] = last_key


def main() -> None:
    dynamodb = boto3.resource("dynamodb")
    services_table = dynamodb.Table(os.environ["TABLE_SERVICES"])
    settings_table = dynamodb.Table(os.environ["TABLE_BUSINESS_SETTINGS"])
    reviews_table = dynamodb.Table(os.environ["TABLE_REVIEWS"])
    portfolio_table = dynamodb.Table(os.environ["TABLE_PORTFOLIO"])
    cdn_base_url = os.environ["CDN_BASE_URL"].rstrip("/")

    is_dev = "-dev-" in services_table.name
    prune_services = env_bool("PRUNE_SEED_SERVICES", default=is_dev)
    seed_demo_reviews = env_bool("SEED_DEMO_REVIEWS", default=is_dev)

    settings_table.put_item(Item=BUSINESS_SETTINGS)

    service_ids = {service["serviceId"] for service in SERVICES}
    if prune_services:
        prune_missing(services_table, "serviceId", service_ids)

    for index, service in enumerate(SERVICES):
        image_path = service["imagePath"]
        image_paths = service.get("imagePaths", [image_path])
        item = {
            "serviceId": service["serviceId"],
            "name": service["name"],
            "category": service["category"],
            "description": service["description"],
            "startingPrice": money(service["startingPrice"]),
            "priceUnit": "cents",
            "durationMinutes": money(service["durationMinutes"]),
            "imageUrl": asset_url(cdn_base_url, image_path),
            "images": [asset_url(cdn_base_url, path) for path in image_paths],
            "featured": service["featured"],
            "active": True,
            "activeKey": "true",
            "bookingCount": money(service["bookingCount"]),
            "displayOrder": money(index),
            "createdAt": "2026-05-14T00:00:00Z",
            "updatedAt": "2026-05-14T00:00:00Z",
        }
        if service.get("subcategory"):
            item["subcategory"] = service["subcategory"]
        if service.get("imagePosition"):
            item["imagePosition"] = service["imagePosition"]
        services_table.put_item(Item=item)

    for index, (style_id, title, category, image_path) in enumerate(PORTFOLIO_ITEMS):
        portfolio_table.put_item(
            Item={
                "styleId": style_id,
                "title": title,
                "category": category,
                "imageUrl": asset_url(cdn_base_url, image_path),
                "thumbnailUrl": asset_url(cdn_base_url, image_path),
                "featured": index < 8,
                "active": True,
                "activeKey": "true",
                "createdAt": f"2026-05-{index + 1:02d}T12:00:00Z",
                "updatedAt": "2026-05-14T00:00:00Z",
            }
        )

    if seed_demo_reviews:
        for review in DEMO_REVIEWS:
            item = {
                **review,
                "rating": Decimal(review["rating"]),
                "approved": True,
                "approvedKey": "true",
                "source": "website",
                "updatedAt": review["createdAt"],
            }
            reviews_table.put_item(Item=item)

    approved_reviews = [
        item
        for item in scan_all(reviews_table)
        if item.get("approved") is True and not str(item.get("reviewId", "")).startswith("AGGREGATE#")
    ]
    total = sum(int(review.get("rating", 0)) for review in approved_reviews)
    count = len(approved_reviews)
    average = Decimal(str(round(total / count, 2))) if count else Decimal(0)
    aggregate = {
        "reviewId": "AGGREGATE#RATINGS",
        "totalCount": Decimal(count),
        "sumRatings": Decimal(total),
        "averageRating": average,
        "updatedAt": "2026-05-14T00:00:00Z",
    }
    reviews_table.put_item(Item=aggregate)


if __name__ == "__main__":
    main()
