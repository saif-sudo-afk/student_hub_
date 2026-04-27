from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import AcademicEvent
from .serializers import AcademicEventSerializer
from apps.users.permissions import IsAdmin


class AcademicEventViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicEventSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        qs = AcademicEvent.objects.select_related('major', 'created_by')

        # Students see only their major's events + all-major events
        if user.role == 'STUDENT':
            try:
                major = user.student_profile.major
                qs = qs.filter(major=major) | qs.filter(major__isnull=True)
            except Exception:
                qs = qs.filter(major__isnull=True)
        return qs
