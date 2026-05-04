from django.test import TestCase, override_settings
from unittest.mock import patch

from .email import send_email


class EmailDispatchTests(TestCase):
    @override_settings(
        RESEND_API_KEY='',
        EMAIL_HOST_USER='sender@example.com',
        DEFAULT_FROM_EMAIL='Student Hub <sender@example.com>',
    )
    @patch('apps.notifications.email.django_send_mail', return_value=1)
    def test_send_email_uses_smtp_when_resend_is_not_configured(self, django_send_mail):
        sent = send_email('Subject', '<p>Hello</p>', 'recipient@example.com')

        self.assertTrue(sent)
        django_send_mail.assert_called_once()
        kwargs = django_send_mail.call_args.kwargs
        self.assertEqual(kwargs['subject'], 'Subject')
        self.assertEqual(kwargs['html_message'], '<p>Hello</p>')
        self.assertEqual(kwargs['from_email'], 'Student Hub <sender@example.com>')
        self.assertEqual(kwargs['recipient_list'], ['recipient@example.com'])

    @override_settings(RESEND_API_KEY='', EMAIL_HOST_USER='')
    def test_send_email_returns_false_without_resend_or_smtp(self):
        self.assertFalse(send_email('Subject', '<p>Hello</p>', 'recipient@example.com'))
