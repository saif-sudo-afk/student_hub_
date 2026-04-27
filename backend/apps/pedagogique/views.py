from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Major, Course, Semester
from .serializers import MajorSerializer, CourseSerializer, SemesterSerializer
from apps.users.permissions import IsAdmin, IsAdminOrProfessor


class MajorViewSet(viewsets.ModelViewSet):
    queryset = Major.objects.all()
    serializer_class = MajorSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [AllowAny()]
        return [IsAdmin()]


class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.prefetch_related('majors', 'professors__user').all()
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def assign_professor(self, request, pk=None):
        course = self.get_object()
        professor_id = request.data.get('professor_id')
        from apps.users.models import ProfessorProfile
        try:
            prof = ProfessorProfile.objects.get(pk=professor_id)
        except ProfessorProfile.DoesNotExist:
            return Response({'detail': 'Professor not found.'}, status=status.HTTP_404_NOT_FOUND)
        course.professors.add(prof)
        return Response(CourseSerializer(course).data)


class SemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all()
    serializer_class = SemesterSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]
