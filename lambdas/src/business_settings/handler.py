from __future__ import annotations

from aws_lambda_powertools.utilities.typing import LambdaContext

from common.config import get_config
from common.dynamo import get_item
from common.http import method
from common.logger import logger
from common.response import internal_error, ok, options

SETTINGS_KEY = {"settingId": "BUSINESS#SETTINGS", "version": "v1"}

DEFAULT_HOURS = {
    day: {"open": "09:00", "close": "20:00", "closed": False}
    for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
}

DEFAULT_SETTINGS = {
    "businessName": "Braids by Deb",
    "phone": "+12145550192",
    "email": "bookings@braidsbydeb.com",
    "address": {
        "street": "2847 Oak Lawn Ave, Suite 104",
        "city": "Dallas",
        "state": "TX",
        "zip": "75219",
    },
    "hours": DEFAULT_HOURS,
    "socialLinks": {
        "instagram": "https://www.instagram.com/braided_bydebs/",
        "facebook": None,
        "tiktok": "https://www.tiktok.com/@braids_by_debs",
    },
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Braids+by+Deb+Dallas+TX",
    "googleReviewUrl": "https://www.google.com/maps/search/?api=1&query=Braids+by+Deb+Dallas+TX",
    "announcementBanner": None,
    "bookingNotice": "A $20 non-refundable deposit is required to reserve your appointment.",
}


@logger.inject_lambda_context(log_event=False)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    if method(event) == "OPTIONS":
        return options()
    try:
        settings = get_item(get_config().table_business_settings, SETTINGS_KEY)
        if not settings:
            settings = DEFAULT_SETTINGS
        public_fields = {
            "businessName": settings["businessName"],
            "phone": settings["phone"],
            "email": settings["email"],
            "address": settings["address"],
            "hours": settings["hours"],
            "socialLinks": settings.get("socialLinks", {}),
            "googleMapsUrl": settings["googleMapsUrl"],
            "googleReviewUrl": settings.get("googleReviewUrl", ""),
            "announcementBanner": settings.get("announcementBanner"),
            "bookingNotice": settings.get("bookingNotice", "We confirm all appointments within 24 hours."),
            "founderImageUrl": settings.get("founderImageUrl"),
            "contactImageUrl": settings.get("contactImageUrl"),
        }
        # Short, revalidating cache: settings (hours, photos, days off) must
        # reflect admin edits within seconds, not the 5 minutes a long cache
        # would hold a stale founder/contact photo after an upload.
        return ok(public_fields, cache_control="public, max-age=30, must-revalidate")
    except Exception:
        logger.exception("Failed to fetch business settings")
        return internal_error()
