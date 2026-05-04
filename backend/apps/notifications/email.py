"""
Resend HTTP API email helper.

Reads RESEND_API_KEY from environment via Django settings.
Uses stdlib urllib to avoid adding a runtime dependency.
"""

import json
import logging
import threading
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"


def _get_api_key():
    key = getattr(settings, "RESEND_API_KEY", "") or ""
    if not key:
        logger.error(
            "[Resend] RESEND_API_KEY is empty. "
            "Set it in your .env (local) and in Vercel environment variables (production)."
        )
    return key


def _post_resend(payload):
    api_key = _get_api_key()
    if not api_key:
        return False

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
                logger.info("[Resend] email sent to %s subject=%r", payload.get("to"), payload.get("subject"))
                return True
            logger.error("[Resend] unexpected status=%s to=%s", resp.status, payload.get("to"))
            return False
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
        except Exception:
            pass
        logger.error("[Resend] HTTPError %s to=%s body=%s", exc.code, payload.get("to"), detail)
        return False
    except Exception as exc:
        logger.exception("[Resend] send failed to=%s: %s", payload.get("to"), exc)
        return False


def send_email(subject, html, recipient, from_email=None):
    """Send a single HTML email via Resend. Returns bool."""
    if not recipient:
        return False
    payload = {
        "from": from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com"),
        "to": [recipient] if isinstance(recipient, str) else list(recipient),
        "subject": subject,
        "html": html,
    }
    return _post_resend(payload)


def send_email_async(subject, html, recipient, from_email=None):
    """Fire-and-forget background send."""
    thread = threading.Thread(
        target=send_email,
        args=(subject, html, recipient, from_email),
        daemon=True,
    )
    thread.start()
