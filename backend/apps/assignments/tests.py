from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.notifications.models import Notification
from apps.pedagogique.models import Major
from apps.users.models import CustomUser, ProfessorProfile, StudentProfile

from .models import Assignment, Submission


class AssignmentRouteAndCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.major = Major.objects.create(name='Computer Science', code=f'CS{str(uuid4())[:6]}')
        self.professor_user = CustomUser.objects.create_user(
            email='professor@example.com',
            password='correct-password',
            first_name='Prof',
            last_name='User',
            role=CustomUser.PROFESSOR,
            is_active=True,
            is_email_verified=True,
        )
        self.professor = ProfessorProfile.objects.create(user=self.professor_user)
        self.professor.majors.set([self.major])
        self.student_user = CustomUser.objects.create_user(
            email='student@example.com',
            password='correct-password',
            first_name='Student',
            last_name='User',
            role=CustomUser.STUDENT,
            is_active=True,
            is_email_verified=True,
        )
        self.student = StudentProfile.objects.create(user=self.student_user, major=self.major)

    def assignment_payload(self, **overrides):
        data = {
            'title': 'Assignment',
            'description': 'Complete the work.',
            'deadline': (timezone.now() + timedelta(days=2)).isoformat(),
            'type': 'TD',
            'is_group_work': False,
            'majors': [str(self.major.id)],
        }
        data.update(overrides)
        return data

    def test_groups_route_resolves_to_group_list(self):
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/v1/assignments/groups/')

        self.assertEqual(response.status_code, 200)

    def test_notice_route_resolves_to_notice_view(self):
        self.client.force_authenticate(user=self.professor_user)

        response = self.client.post(
            '/api/v1/assignments/notices/',
            {
                'student_id': '00000000-0000-0000-0000-000000000000',
                'message': 'Please review your work.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data['detail'], 'Student not found.')

    @patch('apps.notifications.services.send_email_async')
    def test_assignment_create_notifies_students(self, _send_email_async):
        self.client.force_authenticate(user=self.professor_user)

        response = self.client.post(
            '/api/v1/assignments/',
            self.assignment_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            Notification.objects.filter(
                recipient=self.student_user,
                type=Notification.ASSIGNMENT_POSTED,
            ).count(),
            1,
        )

    def test_invalid_assignment_file_does_not_persist_assignment(self):
        self.client.force_authenticate(user=self.professor_user)
        before = Assignment.objects.count()

        response = self.client.post(
            '/api/v1/assignments/',
            {
                **self.assignment_payload(),
                'files': [SimpleUploadedFile('bad.exe', b'bad')],
            },
            format='multipart',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Assignment.objects.count(), before)

    def test_student_submit_permission_reaches_submit_action(self):
        assignment = Assignment.objects.create(
            title='Submit me',
            description='Upload a file.',
            deadline=timezone.now() + timedelta(days=2),
            professor=self.professor,
            type=Assignment.TD,
        )
        assignment.majors.set([self.major])
        self.client.force_authenticate(user=self.student_user)

        response = self.client.post(
            f'/api/v1/assignments/{assignment.id}/submit/',
            {'files': [SimpleUploadedFile('bad.exe', b'bad')]},
            format='multipart',
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Submission.objects.count(), 0)
