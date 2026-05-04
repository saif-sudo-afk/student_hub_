"""
Email dispatch helper.

Priority:
  1. Resend HTTP API  — when RESEND_API_KEY is set in env.
  2. Django SMTP      — automatic fallback when RESEND_API_KEY is absent.
                        Configure EMAIL_HOST_USER + EMAIL_HOST_PASSWORD in
                        env (e.g. a Gmail account with an App Password).

No threading for critical paths (password reset, welcome email) so the
send completes before the serverless worker returns the HTTP response.
send_email_async() is kept only for best-effort notification emails.
"""

import json
import logging
import threading
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import send_mail as django_send_mail

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"


# ── Resend backend ────────────────────────────────────────────────────────────

def _resend_send(subject, html, recipient, from_email):
    api_key = (getattr(settings, "RESEND_API_KEY", "") or "").strip()
    if not api_key:
        return False  # caller will fall through to SMTP

    payload = {
        "from": from_email,
        "to": [recipient] if isinstance(recipient, str) else list(recipient),
        "subject": subject,
        "html": html,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        RESEND_ENDPOINT,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if 200 <= resp.status < 300:
                logger.info("[email] Resend OK → %s | %r", recipient, subject)
                return True
            logger.error("[email] Resend status=%s → %s", resp.status, recipient)
            return False
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
        except Exception:
            pass
        logger.error("[email] Resend HTTP %s → %s | %s", exc.code, recipient, detail)
        return False
    except Exception as exc:
        logger.exception("[email] Resend exception → %s | %s", recipient, exc)
        return False


# ── SMTP / Django backend ─────────────────────────────────────────────────────

def _smtp_send(subject, html, recipient, from_email):
    smtp_user = (getattr(settings, "EMAIL_HOST_USER", "") or "").strip()
    if not smtp_user:
        logger.error(
            "[email] No delivery backend available. "
            "Set RESEND_API_KEY (Resend) or EMAIL_HOST_USER + EMAIL_HOST_PASSWORD (Gmail SMTP)."
        )
        return False
    try:
        to = [recipient] if isinstance(recipient, str) else list(recipient)
        django_send_mail(
            subject=subject,
            message="",
            html_message=html,
            from_email=from_email,
            recipient_list=to,
            fail_silently=False,
        )
        logger.info("[email] SMTP OK → %s | %r", recipient, subject)
        return True
    except Exception as exc:
        logger.exception("[email] SMTP failed → %s | %s", recipient, exc)
        return False


# ── Public API ────────────────────────────────────────────────────────────────

def send_email(subject, html, recipient, from_email=None):
    """Send a single HTML email. Returns True on success."""
    if not recipient:
        return False
    sender = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")
    # Try Resend first; fall back to Django SMTP.
    return _resend_send(subject, html, recipient, sender) or _smtp_send(subject, html, recipient, sender)


def send_email_async(subject, html, recipient, from_email=None):
    """Best-effort background send (notifications only — not for critical paths)."""
    thread = threading.Thread(
        target=send_email,
        args=(subject, html, recipient, from_email),
        daemon=True,
    )
    thread.start()
