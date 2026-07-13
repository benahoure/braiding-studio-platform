"""Comprehensive tests for all transactional email paths.

Covers:
- email_layout colour theming (accent bar, CTA button, check circle)
- details_table / detail_row helpers
- Every email helper in admin/handler.py (cancel, reschedule, forfeit)
- Every email helper in appointments/portal_service.py (reschedule, cancel)
- Missing-email edge cases (must not raise)
- HTML content assertions (title, colour, detail rows)
- Text fallback assertions
- Admin notification HTML assertions
- Handler integration: correct email function fires on each action
"""

from __future__ import annotations

import json

# ─────────────────────────────────────────────────────────────────────────────
# email_layout helpers
# ─────────────────────────────────────────────────────────────────────────────


class TestEmailLayout:
    def _make(self, **kwargs):
        from common.email_layout import email_layout

        defaults = {
            "preheader": "Pre",
            "title": "Test Title",
            "intro": "Test intro.",
            "content": "<tr><td>body</td></tr>",
        }
        defaults.update(kwargs)
        return email_layout(**defaults)

    def test_default_accent_is_gold(self):
        html = self._make()
        assert "#BFA14A" in html

    def test_custom_accent_color_in_bar(self):
        html = self._make(accent_color="#3D7E9E")
        # Must appear in the status chip td
        assert "#3D7E9E" in html
        # Default gold must NOT appear as the chip/CTA bgcolor
        assert 'bgcolor="#BFA14A"' not in html

    def test_custom_accent_color_in_cta_button(self):
        html = self._make(
            accent_color="#9B5068",
            cta_text_color="#FFFFFF",
            cta_label="Click Me",
            cta_url="https://example.test/book",
        )
        assert "#9B5068" in html
        assert "#FFFFFF" in html
        assert "Click Me" in html

    def test_cta_text_color_applied_to_link_style(self):
        html = self._make(
            accent_color="#B05A30",
            cta_text_color="#FFFFFF",
            cta_label="Book Again",
            cta_url="https://example.test/book",
        )
        assert "color: #FFFFFF" in html

    def test_no_cta_when_omitted(self):
        html = self._make()
        assert "Book Again" not in html
        # No CTA button — only the footer mailto link should exist, not a button href
        assert "border-radius: 4px" not in html

    def test_show_check_uses_accent_color(self):
        html = self._make(
            accent_color="#3D7E9E",
            cta_text_color="#FFFFFF",
            show_check=True,
        )
        assert "&#10003;" in html
        assert "#3D7E9E" in html

    def test_title_escaped_in_html(self):
        html = self._make(title="Test <script>")
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_intro_escaped_in_html(self):
        html = self._make(intro="Hi <b>there</b>")
        assert "<b>there</b>" not in html
        assert "&lt;b&gt;there&lt;/b&gt;" in html

    def test_cta_url_escaped(self):
        html = self._make(
            cta_label="Go",
            cta_url="https://example.test/?a=1&b=<2>",
        )
        assert "<2>" not in html

    def test_preheader_in_hidden_div(self):
        html = self._make(preheader="Secret preview text")
        assert "Secret preview text" in html
        assert "display: none" in html

    def test_content_injected_verbatim(self):
        html = self._make(content="<tr><td>UNIQUE_MARKER</td></tr>")
        assert "UNIQUE_MARKER" in html

    def test_footer_always_present(self):
        html = self._make()
        assert "Braids by Deb" in html
        assert "Dallas, TX" in html
        assert "bookings@braidsbydeb.com" in html


class TestDetailsTable:
    def test_renders_all_rows(self):
        from common.email_layout import details_table

        html = details_table(
            [
                ("Service", "Knotless Braids"),
                ("Date", "Monday, June 9, 2025"),
                ("Time", "10:00 AM"),
            ]
        )
        assert "Service" in html
        assert "Knotless Braids" in html
        assert "Date" in html
        assert "Time" in html
        assert "10:00 AM" in html

    def test_skips_none_values(self):
        from common.email_layout import details_table

        html = details_table([("Label", None), ("Present", "yes")])
        assert "Label" not in html
        assert "Present" in html
        assert "yes" in html

    def test_alternating_background_set(self):
        from common.email_layout import detail_row

        even_row = detail_row("A", "1", alt=False)
        odd_row = detail_row("B", "2", alt=True)
        assert "#FAF7F3" in odd_row
        assert "#FAF7F3" not in even_row
        assert "#FFFFFF" in even_row

    def test_empty_rows_returns_table_wrapper(self):
        from common.email_layout import details_table

        html = details_table([])
        assert "<table" in html

    def test_values_escaped(self):
        from common.email_layout import details_table

        html = details_table([("Col", "<script>alert(1)</script>")])
        assert "<script>" not in html


class TestAccentConstants:
    def test_all_constants_exported(self):
        from common.email_layout import (
            ACCENT_CANCELLED,
            ACCENT_CONFIRMED,
            ACCENT_FORFEITED,
            ACCENT_NOSHOW,
            ACCENT_RESCHEDULED,
        )

        for val in (ACCENT_CANCELLED, ACCENT_CONFIRMED, ACCENT_FORFEITED, ACCENT_NOSHOW, ACCENT_RESCHEDULED):
            assert val.startswith("#")
            assert len(val) == 7

    def test_each_accent_is_distinct(self):
        from common.email_layout import (
            ACCENT_CANCELLED,
            ACCENT_CONFIRMED,
            ACCENT_FORFEITED,
            ACCENT_NOSHOW,
            ACCENT_RESCHEDULED,
        )

        colors = [ACCENT_CANCELLED, ACCENT_CONFIRMED, ACCENT_FORFEITED, ACCENT_NOSHOW, ACCENT_RESCHEDULED]
        assert len(set(colors)) == len(colors), "Every accent colour must be unique"


# ─────────────────────────────────────────────────────────────────────────────
# Admin handler email helpers
# ─────────────────────────────────────────────────────────────────────────────

_BASE_APPT = {
    "appointmentId": "appt-test-001",
    "clientName": "Jane Doe",
    "clientEmail": "local:v1:amFuZUBleGFtcGxlLnRlc3Q=",  # base64 of "jane@example.test"
    "clientPhone": "local:v1:MzE3NTU1MDEyMw==",
    "serviceName": "Knotless Braids",
    "servicePrice": 15000,
    "preferredDate": "2025-06-20",
    "preferredTime": "10:00",
    "depositAmount": 2000,
    "depositStatus": "paid",
    "status": "confirmed",
    "stripeChargeId": "ch_test_abc",
    "appointmentToken": "tok-test-xyz",
}


class TestAdminCancelEmail:
    def test_sends_email_with_rose_accent(self, monkeypatch):
        from admin import handler

        sent = {}

        def fake_send(*, to_address, subject, text_body, html_body):
            sent["to"] = to_address
            sent["subject"] = subject
            sent["html"] = html_body
            sent["text"] = text_body

        monkeypatch.setattr(handler, "best_effort_send_email", fake_send)
        handler._send_admin_cancel_email(_BASE_APPT)

        assert sent["to"] == "jane@example.test"
        assert "Cancelled" in sent["subject"]
        assert "Refund" in sent["subject"]
        from common.email_layout import ACCENT_CANCELLED

        assert ACCENT_CANCELLED in sent["html"]

    def test_html_contains_required_details(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        handler._send_admin_cancel_email(_BASE_APPT)

        assert "Knotless Braids" in sent["html"]
        assert "Jane" in sent["html"]
        assert "20.00" in sent["html"]

    def test_text_body_contains_service_and_reason(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(text=text_body),
        )
        handler._send_admin_cancel_email(_BASE_APPT)

        assert "Knotless Braids" in sent["text"]
        assert "20.00" in sent["text"]

    def test_no_send_when_email_missing(self, monkeypatch):
        from admin import handler

        called = []
        monkeypatch.setattr(handler, "best_effort_send_email", lambda **_: called.append(1))
        appt = {**_BASE_APPT, "clientEmail": ""}
        handler._send_admin_cancel_email(appt)
        assert called == []

    def test_no_send_when_email_key_absent(self, monkeypatch):
        from admin import handler

        called = []
        monkeypatch.setattr(handler, "best_effort_send_email", lambda **_: called.append(1))
        appt = {k: v for k, v in _BASE_APPT.items() if k != "clientEmail"}
        handler._send_admin_cancel_email(appt)
        assert called == []


class TestAdminRescheduleEmail:
    def test_sends_email_with_blue_accent(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(
                to=to_address, subject=subject, html=html_body
            ),
        )
        handler._send_admin_reschedule_email(_BASE_APPT, "2025-06-27", "14:00")

        assert sent["to"] == "jane@example.test"
        assert "Rescheduled" in sent["subject"]
        from common.email_layout import ACCENT_RESCHEDULED

        assert ACCENT_RESCHEDULED in sent["html"]

    def test_html_contains_old_and_new_dates(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        handler._send_admin_reschedule_email(_BASE_APPT, "2025-06-27", "14:00")

        assert "June 20" in sent["html"]  # old date
        assert "June 27" in sent["html"]  # new date
        assert "10:00 AM" in sent["html"]  # old time
        assert "2:00 PM" in sent["html"]  # new time

    def test_portal_url_in_html_when_token_present(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        handler._send_admin_reschedule_email(_BASE_APPT, "2025-06-27", "14:00")

        assert "tok-test-xyz" in sent["html"]

    def test_fallback_url_when_no_token(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        appt = {**_BASE_APPT, "appointmentToken": ""}
        handler._send_admin_reschedule_email(appt, "2025-06-27", "14:00")

        assert "/book" in sent["html"]

    def test_no_send_when_email_missing(self, monkeypatch):
        from admin import handler

        called = []
        monkeypatch.setattr(handler, "best_effort_send_email", lambda **_: called.append(1))
        appt = {**_BASE_APPT, "clientEmail": ""}
        handler._send_admin_reschedule_email(appt, "2025-06-27", "14:00")
        assert called == []


class TestAdminForfeitEmail:
    def test_late_cancel_subject_and_terracotta_accent(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(subject=subject, html=html_body),
        )
        handler._send_admin_forfeit_email(_BASE_APPT, "late_cancel")

        assert "Forfeited" in sent["subject"]
        assert "Cancelled" in sent["subject"]
        from common.email_layout import ACCENT_FORFEITED

        assert ACCENT_FORFEITED in sent["html"]

    def test_no_show_subject_and_noshow_accent(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(subject=subject, html=html_body),
        )
        handler._send_admin_forfeit_email(_BASE_APPT, "no_show")

        assert "Missed" in sent["subject"]
        assert "Forfeited" in sent["subject"]
        from common.email_layout import ACCENT_NOSHOW

        assert ACCENT_NOSHOW in sent["html"]

    def test_late_cancel_html_mentions_24_hour_policy(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        handler._send_admin_forfeit_email(_BASE_APPT, "late_cancel")

        assert "24 hours" in sent["html"]

    def test_no_show_html_mentions_book_again(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        handler._send_admin_forfeit_email(_BASE_APPT, "no_show")

        assert "book again" in sent["html"].lower()

    def test_html_contains_service_date_time(self, monkeypatch):
        from admin import handler

        sent = {}
        monkeypatch.setattr(
            handler,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        handler._send_admin_forfeit_email(_BASE_APPT, "late_cancel")

        assert "Knotless Braids" in sent["html"]
        assert "June 20" in sent["html"]
        assert "10:00 AM" in sent["html"]

    def test_no_send_when_email_missing(self, monkeypatch):
        from admin import handler

        called = []
        monkeypatch.setattr(handler, "best_effort_send_email", lambda **_: called.append(1))
        appt = {**_BASE_APPT, "clientEmail": ""}
        handler._send_admin_forfeit_email(appt, "late_cancel")
        assert called == []


class TestNotifyAdminHtml:
    def test_returns_html_string(self):
        from admin.handler import _notify_admin_html

        html = _notify_admin_html("Title", "Intro text", [("Key", "Value")])
        assert "<!doctype html" in html.lower()

    def test_title_present(self):
        from admin.handler import _notify_admin_html

        html = _notify_admin_html("Cancelled by Admin", "Client cancelled.", [])
        assert "Cancelled by Admin" in html

    def test_accent_color_applied(self):
        from admin.handler import _notify_admin_html
        from common.email_layout import ACCENT_CANCELLED

        html = _notify_admin_html("Title", "Intro", [], accent_color=ACCENT_CANCELLED)
        assert ACCENT_CANCELLED in html

    def test_detail_rows_in_output(self):
        from admin.handler import _notify_admin_html

        html = _notify_admin_html("T", "I", [("Service", "Braids"), ("Date", "June 20")])
        assert "Braids" in html
        assert "June 20" in html

    def test_dashboard_cta_link_present(self):
        from admin.handler import _notify_admin_html

        html = _notify_admin_html("T", "I", [])
        assert "/admin/appointments" in html


# ─────────────────────────────────────────────────────────────────────────────
# Portal service email helpers
# ─────────────────────────────────────────────────────────────────────────────


class TestPortalRescheduleEmail:
    def test_sends_with_blue_accent(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(
                to=to_address, html=html_body, subject=subject
            ),
        )
        portal_service._send_reschedule_confirmation(
            client_email="jane@example.test",
            name="Jane Doe",
            service_name="Knotless Braids",
            old_date="2025-06-20",
            old_time="10:00",
            new_date="2025-06-27",
            new_time="14:00",
            token="tok-abc",
        )

        assert sent["to"] == "jane@example.test"
        assert "Rescheduled" in sent["subject"]
        from common.email_layout import ACCENT_RESCHEDULED

        assert ACCENT_RESCHEDULED in sent["html"]

    def test_html_contains_old_and_new_details(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        portal_service._send_reschedule_confirmation(
            client_email="jane@example.test",
            name="Jane",
            service_name="Braids",
            old_date="2025-06-20",
            old_time="10:00",
            new_date="2025-06-27",
            new_time="14:00",
            token="tok-abc",
        )

        assert "June 20" in sent["html"]
        assert "June 27" in sent["html"]
        assert "2:00 PM" in sent["html"]

    def test_text_body_contains_new_date(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(text=text_body),
        )
        portal_service._send_reschedule_confirmation(
            client_email="jane@example.test",
            name="Jane",
            service_name="Braids",
            old_date="2025-06-20",
            old_time="10:00",
            new_date="2025-06-27",
            new_time="14:00",
            token="tok-abc",
        )

        assert "June 27" in sent["text"]
        assert "tok-abc" in sent["text"]

    def test_portal_link_in_cta(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        portal_service._send_reschedule_confirmation(
            client_email="jane@example.test",
            name="Jane",
            service_name="Braids",
            old_date="2025-06-20",
            old_time="10:00",
            new_date="2025-06-27",
            new_time="14:00",
            token="tok-xyz",
        )

        assert "tok-xyz" in sent["html"]


class TestPortalCancelEmail:
    def test_sends_with_rose_accent(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(
                to=to_address, html=html_body, subject=subject
            ),
        )
        portal_service._send_cancel_confirmation(
            client_email="jane@example.test",
            name="Jane Doe",
            service_name="Knotless Braids",
            date="2025-06-20",
            time="10:00",
        )

        assert sent["to"] == "jane@example.test"
        assert "Cancelled" in sent["subject"]
        assert "Refund" in sent["subject"]
        from common.email_layout import ACCENT_CANCELLED

        assert ACCENT_CANCELLED in sent["html"]

    def test_html_contains_refund_details(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        portal_service._send_cancel_confirmation(
            client_email="jane@example.test",
            name="Jane",
            service_name="Knotless Braids",
            date="2025-06-20",
            time="10:00",
        )

        assert "20.00" in sent["html"]
        assert "Knotless Braids" in sent["html"]
        assert "June 20" in sent["html"]

    def test_text_body_mentions_refund_and_days(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(text=text_body),
        )
        portal_service._send_cancel_confirmation(
            client_email="jane@example.test",
            name="Jane",
            service_name="Braids",
            date="2025-06-20",
            time="10:00",
        )

        assert "20.00" in sent["text"]
        assert "5–10" in sent["text"]

    def test_book_again_cta_present(self, monkeypatch):
        from appointments import portal_service

        sent = {}
        monkeypatch.setattr(
            portal_service,
            "best_effort_send_email",
            lambda *, to_address, subject, text_body, html_body: sent.update(html=html_body),
        )
        portal_service._send_cancel_confirmation(
            client_email="jane@example.test",
            name="Jane",
            service_name="Braids",
            date="2025-06-20",
            time="10:00",
        )

        assert "/book" in sent["html"]


# ─────────────────────────────────────────────────────────────────────────────
# Format helpers
# ─────────────────────────────────────────────────────────────────────────────


class TestFormatHelpers:
    def test_fmt_date(self):
        from admin.handler import _fmt_date

        assert _fmt_date("2025-06-20") == "Friday, June 20, 2025"

    def test_fmt_time_am(self):
        from admin.handler import _fmt_time

        assert _fmt_time("09:30") == "9:30 AM"

    def test_fmt_time_noon(self):
        from admin.handler import _fmt_time

        assert _fmt_time("12:00") == "12:00 PM"

    def test_fmt_time_midnight(self):
        from admin.handler import _fmt_time

        assert _fmt_time("00:00") == "12:00 AM"

    def test_fmt_time_pm(self):
        from admin.handler import _fmt_time

        assert _fmt_time("14:00") == "2:00 PM"

    def test_fmt_time_leading_zero_minutes(self):
        from admin.handler import _fmt_time

        assert _fmt_time("09:05") == "9:05 AM"

    def test_portal_format_date(self):
        from appointments.portal_service import _format_date

        assert _format_date("2025-06-20") == "Friday, June 20, 2025"

    def test_portal_format_time_pm(self):
        from appointments.portal_service import _format_time

        assert _format_time("16:30") == "4:30 PM"


# ─────────────────────────────────────────────────────────────────────────────
# Handler integration: correct email fires on each admin action
# ─────────────────────────────────────────────────────────────────────────────


def _make_admin_event(path: str, method: str = "POST", body: dict | None = None) -> dict:
    return {
        "rawPath": path,
        "requestContext": {"http": {"method": method}},
        "pathParameters": {"appointmentId": "appt-test-001"},
        "body": json.dumps(body or {}),
        "headers": {"authorization": "Bearer fake.jwt.token"},
    }


class TestAdminCancelRefundIntegration:
    def test_email_fires_on_cancel_refund(self, monkeypatch, lambda_context):
        from admin import handler

        monkeypatch.setattr(handler, "require_admin", lambda _: "admin-001")
        monkeypatch.setattr(handler, "_get_appointment_or_404", lambda _: dict(_BASE_APPT))
        monkeypatch.setattr(handler, "update_item", lambda *a, **kw: dict(_BASE_APPT, status="cancelled"))
        monkeypatch.setattr(handler, "update_item_with_removes", lambda *a, **kw: dict(_BASE_APPT, status="cancelled"))
        monkeypatch.setattr(handler, "_trigger_stripe_refund", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "put_item", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "notify_admin", lambda *a, **kw: None)

        email_calls: list[dict] = []
        monkeypatch.setattr(handler, "_send_admin_cancel_email", lambda appt: email_calls.append(appt))

        event = _make_admin_event("/admin/appointments/appt-test-001/cancel-refund")
        handler.lambda_handler(event, lambda_context)

        assert len(email_calls) == 1

    def test_no_email_when_appointment_not_found(self, monkeypatch, lambda_context):
        from admin import handler

        monkeypatch.setattr(handler, "require_admin", lambda _: "admin-001")
        monkeypatch.setattr(handler, "_get_appointment_or_404", lambda _: None)

        email_calls: list = []
        monkeypatch.setattr(handler, "_send_admin_cancel_email", lambda appt: email_calls.append(appt))

        event = _make_admin_event("/admin/appointments/appt-test-001/cancel-refund")
        resp = handler.lambda_handler(event, lambda_context)

        assert resp["statusCode"] == 404
        assert email_calls == []


class TestAdminRescheduleIntegration:
    def test_email_fires_on_reschedule(self, monkeypatch, lambda_context):
        from admin import handler

        monkeypatch.setattr(handler, "require_admin", lambda _: "admin-001")
        monkeypatch.setattr(handler, "_get_appointment_or_404", lambda _: dict(_BASE_APPT))
        monkeypatch.setattr(
            handler, "update_item", lambda *a, **kw: dict(_BASE_APPT, preferredDate="2025-06-27", preferredTime="14:00")
        )
        monkeypatch.setattr(handler, "put_item", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "notify_admin", lambda *a, **kw: None)

        email_calls: list[tuple] = []
        monkeypatch.setattr(
            handler,
            "_send_admin_reschedule_email",
            lambda appt, new_date, new_time: email_calls.append((new_date, new_time)),
        )

        event = _make_admin_event(
            "/admin/appointments/appt-test-001/reschedule",
            body={"preferredDate": "2025-06-27", "preferredTime": "14:00"},
        )
        handler.lambda_handler(event, lambda_context)

        assert len(email_calls) == 1
        assert email_calls[0] == ("2025-06-27", "14:00")

    def test_no_email_on_validation_error(self, monkeypatch, lambda_context):
        from admin import handler

        monkeypatch.setattr(handler, "require_admin", lambda _: "admin-001")

        email_calls: list = []
        monkeypatch.setattr(handler, "_send_admin_reschedule_email", lambda *a, **kw: email_calls.append(True))

        # Missing required fields → ValidationError
        event = _make_admin_event("/admin/appointments/appt-test-001/reschedule", body={})
        resp = handler.lambda_handler(event, lambda_context)

        assert resp["statusCode"] == 400
        assert email_calls == []


class TestAdminForfeitIntegration:
    def test_late_cancel_email_fires(self, monkeypatch, lambda_context):
        from admin import handler

        monkeypatch.setattr(handler, "require_admin", lambda _: "admin-001")
        monkeypatch.setattr(handler, "_get_appointment_or_404", lambda _: dict(_BASE_APPT))
        monkeypatch.setattr(
            handler, "update_item", lambda *a, **kw: dict(_BASE_APPT, status="cancelled", depositStatus="forfeited")
        )
        monkeypatch.setattr(handler, "put_item", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "notify_admin", lambda *a, **kw: None)

        email_calls: list[str] = []
        monkeypatch.setattr(handler, "_send_admin_forfeit_email", lambda appt, action: email_calls.append(action))

        event = _make_admin_event("/admin/appointments/appt-test-001/forfeit", body={"action": "late_cancel"})
        handler.lambda_handler(event, lambda_context)

        assert email_calls == ["late_cancel"]

    def test_no_show_email_fires(self, monkeypatch, lambda_context):
        from admin import handler

        monkeypatch.setattr(handler, "require_admin", lambda _: "admin-001")
        monkeypatch.setattr(handler, "_get_appointment_or_404", lambda _: dict(_BASE_APPT))
        monkeypatch.setattr(
            handler, "update_item", lambda *a, **kw: dict(_BASE_APPT, status="no_show", depositStatus="forfeited")
        )
        monkeypatch.setattr(handler, "put_item", lambda *a, **kw: None)
        monkeypatch.setattr(handler, "notify_admin", lambda *a, **kw: None)

        email_calls: list[str] = []
        monkeypatch.setattr(handler, "_send_admin_forfeit_email", lambda appt, action: email_calls.append(action))

        event = _make_admin_event("/admin/appointments/appt-test-001/forfeit", body={"action": "no_show"})
        handler.lambda_handler(event, lambda_context)

        assert email_calls == ["no_show"]


# ─────────────────────────────────────────────────────────────────────────────
# Smoke: email_layout + details_table round-trip per email type
# ─────────────────────────────────────────────────────────────────────────────


class TestEmailRoundTrip:
    """End-to-end: build an HTML email body for each type and verify key properties."""

    def _build(self, accent, text_color="#FFFFFF", **kwargs):
        from common.email_layout import details_table, email_layout

        rows = [("Service", "Braids"), ("Date", "Friday, June 20, 2025"), ("Time", "10:00 AM")]
        return email_layout(
            preheader="Pre",
            title=kwargs.pop("title", "Email Title"),
            intro=kwargs.pop("intro", "Hi there."),
            content=details_table(rows),
            cta_label=kwargs.pop("cta_label", "Action"),
            cta_url=kwargs.pop("cta_url", "https://example.test/"),
            accent_color=accent,
            cta_text_color=text_color,
            **kwargs,
        )

    def test_confirmed_gold(self):
        from common.email_layout import ACCENT_CONFIRMED

        html = self._build(ACCENT_CONFIRMED, text_color="#1A1008")
        assert ACCENT_CONFIRMED in html
        assert "Braids" in html
        assert "<!doctype" in html.lower()

    def test_rescheduled_blue(self):
        from common.email_layout import ACCENT_RESCHEDULED

        html = self._build(ACCENT_RESCHEDULED)
        assert ACCENT_RESCHEDULED in html

    def test_cancelled_rose(self):
        from common.email_layout import ACCENT_CANCELLED

        html = self._build(ACCENT_CANCELLED)
        assert ACCENT_CANCELLED in html

    def test_forfeited_terracotta(self):
        from common.email_layout import ACCENT_FORFEITED

        html = self._build(ACCENT_FORFEITED)
        assert ACCENT_FORFEITED in html

    def test_noshow_bronze(self):
        from common.email_layout import ACCENT_NOSHOW

        html = self._build(ACCENT_NOSHOW)
        assert ACCENT_NOSHOW in html

    def test_all_types_produce_valid_html_structure(self):
        from common.email_layout import (
            ACCENT_CANCELLED,
            ACCENT_CONFIRMED,
            ACCENT_FORFEITED,
            ACCENT_NOSHOW,
            ACCENT_RESCHEDULED,
        )

        for accent in (ACCENT_CONFIRMED, ACCENT_RESCHEDULED, ACCENT_CANCELLED, ACCENT_FORFEITED, ACCENT_NOSHOW):
            html = self._build(accent)
            assert "<!doctype html>" in html.lower()
            assert "</html>" in html.lower()
            assert "Braids by Deb" in html
            assert "Dallas, TX" in html
