"""Braids by Deb transactional email layouts.

Two distinct designs, both table-based and inline-styled for email-client
compatibility (light color-scheme forced to avoid iOS dark-mode inversion):

- ``email_layout``       — CLIENT emails ("Editorial Onyx"): cream page, white
  card, deep-onyx editorial header with the gold wordmark and a serif title,
  status chip in the per-type accent colour, gold hairlines, pill CTA, onyx
  footer. Matches the public braidsbydeb.com brand.
- ``admin_email_layout`` — ADMIN notifications ("Rose Noir"): deep plum card,
  holographic hairline, rose-gold accents — matches the /admin dashboard skin.
"""

from __future__ import annotations

from html import escape

# ── Client design tokens (public brand: cream / onyx / gold) ──
_BG = "#FBF7F2"
_CARD_BG = "#FFFFFF"
_ONYX = "#111111"
_GOLD = "#BFA14A"
_GOLD_LIGHT = "#D4B86A"
_GOLD_DARK = "#8E7320"
_TEXT_DARK = "#1A1008"
_TEXT_BODY = "#4A3A2C"
_TEXT_MUTED = "#7A6A58"
_BORDER = "#E9DFD2"
_ROW_ALT_BG = "#FAF7F3"

# ── Accent colours by email type (status chip + check + CTA) ──
ACCENT_CONFIRMED = "#BFA14A"  # brand gold — booking confirmed
ACCENT_RESCHEDULED = "#3D7E9E"  # steel blue — calm, informational
ACCENT_CANCELLED = "#9B5068"  # rose-mauve — regretful but professional
ACCENT_FORFEITED = "#B05A30"  # terracotta — firm policy enforcement
ACCENT_NOSHOW = "#8B6840"  # bronze-brown — firm, neutral

_HAIRLINE = (
    "background: linear-gradient(90deg, rgba(191,161,74,0) 0%, #D4B86A 30%, "
    "#ECD88A 50%, #D4B86A 70%, rgba(191,161,74,0) 100%); "
    f"background-color: {_GOLD_LIGHT};"
)


def _doc(*, preheader: str, title: str, body: str, page_bg: str) -> str:
    return f"""<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>{escape(title)}</title>
    <style>
      :root {{ color-scheme: light; supported-color-schemes: light; }}
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: {page_bg};
    -webkit-text-size-adjust: 100%; mso-line-height-rule: exactly;">

    <!-- Preheader (hidden) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;
      font-size: 1px; line-height: 1px; opacity: 0; color: {page_bg};">
      {escape(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
      bgcolor="{page_bg}" style="background-color: {page_bg};">
      <tr>
        <td align="center" style="padding: 36px 16px;">
{body}
        </td>
      </tr>
    </table>

  </body>
</html>"""


# ═════════════════════════════════════════════════════════════════════════════
# CLIENT layout — "Editorial Onyx"
# ═════════════════════════════════════════════════════════════════════════════


def email_layout(
    *,
    preheader: str,
    title: str,
    intro: str,
    content: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
    cta_helper: str | None = None,
    show_check: bool = False,
    accent_color: str = _GOLD,
    cta_text_color: str = _TEXT_DARK,
) -> str:

    check_html = ""
    if show_check:
        check_html = f"""
              <tr>
                <td align="center" style="padding: 0 0 20px 0;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td bgcolor="{accent_color}" width="52" height="52"
                        style="border-radius: 26px; text-align: center; vertical-align: middle;
                               font-size: 26px; font-family: Arial, sans-serif; color: {cta_text_color};
                               line-height: 52px;">
                        &#10003;
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>"""

    cta_html = ""
    if cta_label and cta_url:
        helper_html = ""
        if cta_helper:
            helper_html = f"""
              <p style="margin: 14px 0 0 0; font-family: Arial, sans-serif; font-size: 11px;
                line-height: 1.5; color: {_TEXT_MUTED}; text-align: center;">
                {escape(cta_helper)}
              </p>"""
        cta_html = f"""
          <tr>
            <td align="center" style="padding: 8px 40px 38px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td bgcolor="{accent_color}" style="border-radius: 999px; text-align: center;">
                    <a href="{escape(cta_url)}" target="_blank"
                      style="display: inline-block; background-color: {accent_color};
                      color: {cta_text_color}; font-family: Arial, sans-serif; font-size: 13px;
                      font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
                      text-decoration: none; padding: 15px 40px; border-radius: 999px;">
                      {escape(cta_label)}
                    </a>
                  </td>
                </tr>
              </table>
              {helper_html}
              <p style="margin: 10px 0 0 0; font-family: Arial, sans-serif; font-size: 10px;
                line-height: 1.6; color: {_TEXT_MUTED}; text-align: center; word-break: break-all;">
                Button not working? Open this link:<br>
                <a href="{escape(cta_url)}" target="_blank" style="color: {_GOLD_DARK};">{escape(cta_url)}</a>
              </p>
            </td>
          </tr>"""

    card = f"""
          <!-- Card -->
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
            style="max-width: 580px; background-color: {_CARD_BG};
              border-radius: 14px; overflow: hidden;
              border: 1px solid {_BORDER};
              box-shadow: 0 10px 36px rgba(17, 17, 17, 0.10);">

            <!-- Editorial onyx header -->
            <tr>
              <td bgcolor="{_ONYX}" align="center"
                style="background-color: {_ONYX}; padding: 34px 40px 30px 40px;">
                <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif;
                  font-size: 14px; color: {_GOLD_LIGHT}; letter-spacing: 0.1em;">
                  &#10022;
                </p>
                <p style="margin: 10px 0 0 0; font-family: Arial, sans-serif; font-size: 11px;
                  font-weight: 700; letter-spacing: 0.32em; text-transform: uppercase;
                  color: {_GOLD_LIGHT};">
                  Braids&nbsp;by&nbsp;Deb
                </p>
                <p style="margin: 6px 0 0 0; font-family: Arial, sans-serif; font-size: 9px;
                  font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase;
                  color: #8A8378;">
                  Dallas&nbsp;&middot;&nbsp;Texas
                </p>
                <h1 style="margin: 20px 0 0 0; font-family: Georgia, 'Times New Roman', serif;
                  font-style: italic; font-size: 30px; font-weight: 400; line-height: 1.2;
                  color: #FBF7F2; letter-spacing: 0.01em;">
                  {escape(title)}
                </h1>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation"
                  style="margin-top: 18px;">
                  <tr>
                    <td bgcolor="{accent_color}"
                      style="border-radius: 999px; padding: 5px 16px; font-family: Arial, sans-serif;
                      font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
                      text-transform: uppercase; color: {cta_text_color};">
                      Appointment&nbsp;Update
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Gold shimmer hairline -->
            <tr>
              <td height="2" style="font-size: 0; line-height: 0; {_HAIRLINE}">&nbsp;</td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding: 30px 40px 8px 40px; background-color: {_CARD_BG};">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  {check_html}
                  <tr>
                    <td>
                      <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif;
                        font-size: 16px; line-height: 1.7; color: {_TEXT_BODY};">
                        {escape(intro)}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Dynamic content -->
            {content}

            <!-- CTA -->
            {cta_html}

            <!-- Onyx footer -->
            <tr>
              <td bgcolor="{_ONYX}" style="background-color: {_ONYX}; padding: 26px 40px;
                text-align: center;">
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px;
                  font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase;
                  color: {_GOLD_LIGHT};">
                  Braids&nbsp;by&nbsp;Deb
                </p>
                <p style="margin: 10px 0 0 0; font-family: Georgia, 'Times New Roman', serif;
                  font-style: italic; font-size: 12px; color: #A79F92;">
                  Braids by Deb &middot; braided with precision, worn with confidence.
                </p>
                <p style="margin: 12px 0 0 0; font-family: Arial, sans-serif; font-size: 11px;
                  line-height: 1.7; color: #8A8378;">
                  Dallas, TX
                  &nbsp;&middot;&nbsp;
                  <a href="mailto:bookings@braidsbydeb.com"
                    style="color: {_GOLD_LIGHT}; text-decoration: none;">
                    bookings@braidsbydeb.com
                  </a>
                </p>
                <p style="margin: 8px 0 0 0; font-family: Arial, sans-serif; font-size: 11px;">
                  <a href="https://www.instagram.com/braided_bydebs/"
                    style="color: #8A8378; text-decoration: none;">Instagram</a>
                  <span style="color: #55504a;">&nbsp;&middot;&nbsp;</span>
                  <a href="https://www.tiktok.com/@braids_by_debs"
                    style="color: #8A8378; text-decoration: none;">TikTok</a>
                  <span style="color: #55504a;">&nbsp;&middot;&nbsp;</span>
                  <a href="https://braidsbydeb.com"
                    style="color: #8A8378; text-decoration: none;">braidsbydeb.com</a>
                </p>
              </td>
            </tr>

          </table>
          <!-- /Card -->"""

    return _doc(preheader=preheader, title=title, body=card, page_bg=_BG)


def detail_row(label: str, value: str | None, alt: bool = False) -> str:
    if not value:
        return ""
    bg = f"background-color: {_ROW_ALT_BG};" if alt else f"background-color: {_CARD_BG};"
    return f"""
      <tr>
        <td style="{bg} padding: 12px 0; width: 40%; vertical-align: top;
          font-family: Arial, sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: {_GOLD_DARK};
          border-bottom: 1px solid {_BORDER};">
          {escape(label)}
        </td>
        <td style="{bg} padding: 12px 0 12px 16px; vertical-align: top;
          font-family: Arial, sans-serif; font-size: 14px; font-weight: 500;
          line-height: 1.4; color: {_TEXT_DARK};
          border-bottom: 1px solid {_BORDER};">
          {escape(value)}
        </td>
      </tr>"""


def details_table(rows: list[tuple[str, str | None]]) -> str:
    rendered_rows = "".join(detail_row(label, value, alt=(i % 2 == 1)) for i, (label, value) in enumerate(rows))
    return f"""
      <tr>
        <td style="padding: 16px 40px 24px 40px; background-color: {_CARD_BG};">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
            style="border-collapse: collapse; border-top: 1px solid {_BORDER};">
            {rendered_rows}
          </table>
        </td>
      </tr>"""


# ═════════════════════════════════════════════════════════════════════════════
# ADMIN layout — "Rose Noir" (matches the /admin dashboard skin)
# ═════════════════════════════════════════════════════════════════════════════

_A_BG = "#150A11"
_A_CARD = "#221120"
_A_CARD_ALT = "#2A1526"
_A_BORDER = "#3A2033"
_A_ROSE = "#E8789F"
_A_ROSE_LIGHT = "#F5A8C2"
_A_TEXT = "#FFF2F8"
_A_TEXT_BODY = "#E8CFDD"
_A_TEXT_MUTED = "#B893A8"

_A_HOLO = (
    "background: linear-gradient(90deg, #FFD9A0 0%, #F5A8C2 32%, #B389F4 64%, #7FE3E0 100%); "
    f"background-color: {_A_ROSE};"
)


def admin_email_layout(
    *,
    preheader: str,
    title: str,
    intro: str,
    content: str,
    cta_label: str | None = None,
    cta_url: str | None = None,
    accent_color: str = _A_ROSE,
) -> str:

    cta_html = ""
    if cta_label and cta_url:
        cta_html = f"""
          <tr>
            <td align="center" style="padding: 10px 40px 36px 40px; background-color: {_A_CARD};">
              <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td bgcolor="{_A_ROSE}" style="border-radius: 999px; text-align: center;">
                    <a href="{escape(cta_url)}" target="_blank"
                      style="display: inline-block; background-color: {_A_ROSE}; color: #1F0A15;
                      font-family: Arial, sans-serif; font-size: 13px; font-weight: 700;
                      letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none;
                      padding: 15px 40px; border-radius: 999px;">
                      {escape(cta_label)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>"""

    card = f"""
          <!-- Card -->
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
            style="max-width: 580px; background-color: {_A_CARD};
              border-radius: 16px; overflow: hidden;
              border: 1px solid {_A_BORDER};
              box-shadow: 0 14px 44px rgba(0, 0, 0, 0.55);">

            <!-- Holographic hairline -->
            <tr>
              <td height="2" style="font-size: 0; line-height: 0; {_A_HOLO}">&nbsp;</td>
            </tr>

            <!-- Header -->
            <tr>
              <td align="center" style="background-color: {_A_CARD}; padding: 30px 40px 24px 40px;
                border-bottom: 1px solid {_A_BORDER};">
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 10px;
                  font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase;
                  color: {_A_ROSE_LIGHT};">
                  Braids&nbsp;by&nbsp;Deb&nbsp;&middot;&nbsp;Admin&nbsp;Studio
                </p>
                <h1 style="margin: 14px 0 0 0; font-family: Georgia, 'Times New Roman', serif;
                  font-style: italic; font-size: 26px; font-weight: 400; line-height: 1.25;
                  color: {_A_TEXT};">
                  {escape(title)}
                </h1>
                <table border="0" cellpadding="0" cellspacing="0" role="presentation"
                  style="margin-top: 14px;">
                  <tr>
                    <td bgcolor="{accent_color}"
                      style="border-radius: 999px; padding: 4px 14px; font-family: Arial, sans-serif;
                      font-size: 9px; font-weight: 700; letter-spacing: 0.18em;
                      text-transform: uppercase; color: #FFFFFF;">
                      Studio&nbsp;Alert
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td style="padding: 26px 40px 6px 40px; background-color: {_A_CARD};">
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 15px;
                  line-height: 1.65; color: {_A_TEXT_BODY};">
                  {escape(intro)}
                </p>
              </td>
            </tr>

            <!-- Dynamic content -->
            {content}

            <!-- CTA -->
            {cta_html}

            <!-- Footer -->
            <tr>
              <td style="background-color: #1B0D17; border-top: 1px solid {_A_BORDER};
                padding: 18px 40px; text-align: center;">
                <p style="margin: 0; font-family: Arial, sans-serif; font-size: 10px;
                  letter-spacing: 0.22em; text-transform: uppercase; color: {_A_TEXT_MUTED};">
                  Braids by Deb &middot; internal notification
                </p>
              </td>
            </tr>

          </table>
          <!-- /Card -->"""

    return _doc(preheader=preheader, title=title, body=card, page_bg=_A_BG)


def admin_detail_row(label: str, value: str | None, alt: bool = False) -> str:
    if not value:
        return ""
    bg = f"background-color: {_A_CARD_ALT};" if alt else f"background-color: {_A_CARD};"
    return f"""
      <tr>
        <td style="{bg} padding: 12px 0 12px 12px; width: 40%; vertical-align: top;
          font-family: Arial, sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: {_A_ROSE_LIGHT};
          border-bottom: 1px solid {_A_BORDER};">
          {escape(label)}
        </td>
        <td style="{bg} padding: 12px 12px 12px 16px; vertical-align: top;
          font-family: Arial, sans-serif; font-size: 14px; font-weight: 500;
          line-height: 1.4; color: {_A_TEXT};
          border-bottom: 1px solid {_A_BORDER};">
          {escape(value)}
        </td>
      </tr>"""


def admin_details_table(rows: list[tuple[str, str | None]]) -> str:
    rendered = "".join(admin_detail_row(label, value, alt=(i % 2 == 1)) for i, (label, value) in enumerate(rows))
    return f"""
      <tr>
        <td style="padding: 16px 40px 24px 40px; background-color: {_A_CARD};">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"
            style="border-collapse: collapse; border-top: 1px solid {_A_BORDER};">
            {rendered}
          </table>
        </td>
      </tr>"""
