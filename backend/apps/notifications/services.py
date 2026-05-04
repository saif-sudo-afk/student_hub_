"""
Notification service layer.
Creates in-app Notification records and sends HTML emails via threading.
"""

from django.template.loader import render_to_string
from django.conf import settings
from .email import send_email_async
from .models import Notification


def notify(recipient, notif_type, title, message, link=None, send_email=True):
    """
    Create in-app notification and optionally send an email.

    Args:
        recipient: CustomUser instance
        notif_type: one of Notification.TYPE_CHOICES keys
        title: short notification title
        message: full notification body
        link: optional relative URL for frontend routing
        send_email: whether to also send an HTML email
    """
    notif = Notification.objects.create(
        recipient=recipient,
        type=notif_type,
        title=title,
        message=message,
        link=link,
    )

    if send_email and recipient.email:
        ctx = {
            'recipient_name': recipient.get_full_name(),
            'title': title,
            'message': message,
            'link': f"{settings.FRONTEND_URL}{link}" if link else settings.FRONTEND_URL,
            'frontend_url': settings.FRONTEND_URL,
        }
        html = render_to_string('emails/notification.html', ctx)
        send_email_async(f'Student Hub — {title}', html, recipient.email)

    return notif


def notify_many(recipients, notif_type, title, message, link=None, send_email=True):
    """Bulk notify multiple recipients."""
    for recipient in recipients:
        notify(recipient, notif_type, title, message, link=link, send_email=send_email)
