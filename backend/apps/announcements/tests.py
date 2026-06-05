from uuid import uuid4

from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import CustomUser

from .models import Announcement


class AnnouncementPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email=f'admin-{uuid4()}@example.com',
            password='correct-password',
            first_name='Admin',
            last_name='User',
            role=CustomUser.ADMIN,
            is_active=True,
            is_email_verified=True,
        )
        self.student = CustomUser.objects.create_user(
            email=f'student-{uuid4()}@example.com',
            password='correct-password',
            first_name='Student',
            last_name='User',
            role=CustomUser.STUDENT,
            is_active=True,
            is_email_verified=True,
        )

    def test_student_cannot_edit_approved_announcement(self):
        announcement = Announcement.objects.create(
            title='Original title',
            description='Published announcement.',
            author=self.admin,
            author_role=CustomUser.ADMIN,
            status=Announcement.APPROVED,
        )
        self.client.force_authenticate(user=self.student)

        response = self.client.patch(
            f'/api/v1/announcements/{announcement.id}/',
            {'title': 'Student edit'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        announcement.refresh_from_db()
        self.assertEqual(announcement.title, 'Original title')
