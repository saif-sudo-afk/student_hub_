"""
Announcement views: admin posts directly, professors request, admin approves/rejects.
"""

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Announcement
from .serializers import AnnouncementSerializer
from apps.users.permissions import IsAdmin, IsProfessor
from apps.notifications.services import notify, notify_many


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAuthenticated()]  # Further checked in method

    def get_queryset(self):
        user = self.request.user
        qs = Announcement.objects.select_related('major', 'author')

        if user.role == 'STUDENT':
            try:
                major = user.student_profile.major
                qs = qs.filter(status='APPROVED').filter(
                    major=major
                ) | qs.filter(status='APPROVED', major__isnull=True)
            except Exception:
                qs = qs.filter(status='APPROVED', major__isnull=True)
        elif user.role == 'PROFESSOR':
            # Professors see their own + approved ones
            qs = qs.filter(author=user) | qs.filter(status='APPROVED')
        # Admins see everything
        return qs.distinct().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'ADMIN':
            # Admins publish immediately
            serializer.save(
                author=user,
                author_role=user.role,
                status=Announcement.APPROVED,
                published_at=timezone.now(),
            )
        elif user.role == 'PROFESSOR':
            # Professor requests go to pending
            serializer.save(
                author=user,
                author_role=user.role,
                status=Announcement.PENDING,
            )
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Students cannot create announcements.')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)
        announcement = serializer.instance

        # If admin published, notify students
        if announcement.status == Announcement.APPROVED:
            self._notify_students(announcement)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _notify_students(self, announcement):
        from apps.users.models import CustomUser
        if announcement.major:
            users = CustomUser.objects.filter(
                role='STUDENT',
                student_profile__major=announcement.major,
            )
        else:
            users = CustomUser.objects.filter(role='STUDENT')
        notify_many(
            users,
            notif_type='ANNOUNCEMENT_PUBLISHED',
            title=f'New Announcement: {announcement.title}',
            message=announcement.description[:200],
            link='/student/announcements',
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, pk=None):
        announcement = self.get_object()
        if announcement.status != Announcement.PENDING:
            return Response(
                {'detail': 'Only pending announcements can be approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        announcement.status = Announcement.APPROVED
        announcement.published_at = timezone.now()
        announcement.save()

        # Notify requesting professor
        notify(
            announcement.author,
            notif_type='ANNOUNCEMENT_REQUEST_STATUS',
            title='Announcement Approved',
            message=f'Your announcement "{announcement.title}" has been approved and published.',
            link='/professor/announcements',
        )
        self._notify_students(announcement)

        return Response(AnnouncementSerializer(announcement).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject(self, request, pk=None):
        announcement = self.get_object()
        reason = request.data.get('reason', '')
        if not reason:
            return Response(
                {'detail': 'A rejection reason is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        announcement.status = Announcement.REJECTED
        announcement.rejection_reason = reason
        announcement.save()

        notify(
            announcement.author,
            notif_type='ANNOUNCEMENT_REQUEST_STATUS',
            title='Announcement Rejected',
            message=f'Your announcement "{announcement.title}" was rejected. Reason: {reason}',
            link='/professor/announcements',
        )

        return Response(AnnouncementSerializer(announcement).data)
