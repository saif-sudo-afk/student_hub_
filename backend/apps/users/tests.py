from django.test import TestCase
from rest_framework.test import APIClient

from .models import CustomUser


class LoginViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_active_user_can_login(self):
        CustomUser.objects.create_user(
            email='active@example.com',
            password='correct-password',
            first_name='Active',
            last_name='User',
            is_active=True,
            is_email_verified=True,
        )

        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': 'active@example.com', 'password': 'correct-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'active@example.com')

    def test_inactive_user_with_valid_password_gets_inactive_message(self):
        CustomUser.objects.create_user(
            email='inactive@example.com',
            password='correct-password',
            first_name='Inactive',
            last_name='User',
            is_active=False,
            is_email_verified=False,
        )

        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': 'inactive@example.com', 'password': 'correct-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Account is not active', str(response.data))

    def test_inactive_user_with_wrong_password_keeps_generic_error(self):
        CustomUser.objects.create_user(
            email='inactive@example.com',
            password='correct-password',
            first_name='Inactive',
            last_name='User',
            is_active=False,
            is_email_verified=False,
        )

        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': 'inactive@example.com', 'password': 'wrong-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid email or password', str(response.data))
