from django.test import TestCase
from django.test import override_settings
from unittest.mock import patch

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount, SocialLogin
from rest_framework.test import APIClient

from apps.pedagogique.models import Major

from .adapters import StudentHubSocialAccountAdapter
from .models import CustomUser, EmailVerificationToken, ProfessorProfile


class StudentRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.major = Major.objects.create(name='Computer Science', code='CS')

    def payload(self, **overrides):
        data = {
            'email': 'student@example.com',
            'first_name': 'Student',
            'last_name': 'User',
            'phone_number': '',
            'major_id': str(self.major.id),
            'year_of_study': 1,
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'agree_terms': True,
        }
        data.update(overrides)
        return data

    @override_settings(FRONTEND_URL='http://frontend.test')
    @patch('apps.users.views.send_email', return_value=True)
    def test_registration_creates_inactive_user_and_sends_verification_email(self, send_email):
        response = self.client.post(
            '/api/v1/auth/register/student/',
            self.payload(),
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        user = CustomUser.objects.get(email='student@example.com')
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_email_verified)

        token = EmailVerificationToken.objects.get(user=user)
        send_email.assert_called_once()
        subject, html, recipient = send_email.call_args.args
        self.assertEqual(subject, 'Student Hub - Verify your email')
        self.assertEqual(recipient, user.email)
        self.assertIn(str(token.token), html)
        self.assertIn('http://frontend.test/auth/verify-email/', html)

    @patch('apps.users.views.send_email', return_value=False)
    def test_registration_rolls_back_when_verification_email_fails(self, send_email):
        response = self.client.post(
            '/api/v1/auth/register/student/',
            self.payload(),
            format='json',
        )

        self.assertEqual(response.status_code, 503)
        self.assertFalse(CustomUser.objects.filter(email='student@example.com').exists())
        self.assertEqual(EmailVerificationToken.objects.count(), 0)
        send_email.assert_called_once()

    @patch('apps.users.views.send_email', return_value=True)
    def test_verify_email_activates_student_account(self, _send_email):
        self.client.post(
            '/api/v1/auth/register/student/',
            self.payload(),
            format='json',
        )
        user = CustomUser.objects.get(email='student@example.com')
        token = EmailVerificationToken.objects.get(user=user)

        response = self.client.get(f'/api/v1/auth/verify-email/{token.token}/')

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)
        self.assertFalse(EmailVerificationToken.objects.filter(user=user).exists())


class GoogleSocialLoginTests(TestCase):
    def test_google_callback_reverse_uses_single_api_prefix(self):
        from django.urls import reverse

        self.assertEqual(
            reverse('google_callback'),
            '/api/v1/auth/social/google/login/callback/',
        )

    def test_verified_google_login_marks_user_active_and_email_verified(self):
        user = CustomUser(
            email='google@example.com',
            first_name='',
            last_name='',
            is_active=False,
            is_email_verified=False,
        )
        sociallogin = SocialLogin(
            user=user,
            account=SocialAccount(
                provider='google',
                uid='google-123',
                extra_data={'email_verified': True},
            ),
            email_addresses=[
                EmailAddress(email='google@example.com', verified=True, primary=True),
            ],
        )

        adapter = StudentHubSocialAccountAdapter()
        adapter.populate_user(None, sociallogin, {
            'email': 'google@example.com',
            'first_name': 'Google',
            'last_name': 'User',
        })

        self.assertTrue(user.is_active)
        self.assertTrue(user.is_email_verified)
        self.assertEqual(user.first_name, 'Google')
        self.assertEqual(user.last_name, 'User')

    @override_settings(FRONTEND_URL='http://frontend.test')
    def test_social_complete_redirects_authenticated_user_with_jwt_fragment(self):
        user = CustomUser.objects.create_user(
            email='google@example.com',
            password=None,
            first_name='Google',
            last_name='User',
            is_active=True,
            is_email_verified=True,
        )
        self.client.force_login(user)

        response = self.client.get('/api/v1/auth/social/complete/')

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response['Location'].startswith('http://frontend.test/auth/login#access='))
        self.assertIn('&refresh=', response['Location'])


class AdminProfessorCreationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.major = Major.objects.create(name='Mathematics', code='MATH')
        self.admin = CustomUser.objects.create_user(
            email='admin@example.com',
            password='correct-password',
            first_name='Admin',
            last_name='User',
            role=CustomUser.ADMIN,
            is_active=True,
            is_email_verified=True,
        )

    @patch('apps.users.admin_views.send_email', return_value=False)
    def test_create_professor_rolls_back_when_welcome_email_fails(self, send_email):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            '/api/v1/admin/professors/create/',
            {
                'email': 'professor@example.com',
                'first_name': 'Prof',
                'last_name': 'User',
                'major_ids': [str(self.major.id)],
                'send_welcome_email': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 503)
        self.assertFalse(CustomUser.objects.filter(email='professor@example.com').exists())
        self.assertEqual(ProfessorProfile.objects.count(), 0)
        send_email.assert_called_once()


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

    def test_active_user_can_login_when_vercel_strips_api_prefix(self):
        CustomUser.objects.create_user(
            email='vercel@example.com',
            password='correct-password',
            first_name='Vercel',
            last_name='User',
            is_active=True,
            is_email_verified=True,
        )

        response = self.client.post(
            '/v1/auth/login/',
            {'email': 'vercel@example.com', 'password': 'correct-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['email'], 'vercel@example.com')

    def test_active_user_can_login_with_different_email_case(self):
        CustomUser.objects.create_user(
            email='mixed.case@example.com',
            password='correct-password',
            first_name='Mixed',
            last_name='Case',
            is_active=True,
            is_email_verified=True,
        )

        response = self.client.post(
            '/api/v1/auth/login/',
            {'email': 'Mixed.Case@Example.com', 'password': 'correct-password'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['email'], 'mixed.case@example.com')

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
