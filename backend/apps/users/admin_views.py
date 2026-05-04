"""
Admin-only API views for user management.
"""

import secrets
import string

from django.conf import settings
from django.template.loader import render_to_string
from rest_framework import status, generics

from apps.notifications.email import send_email
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import CustomUser, StudentProfile, ProfessorProfile
from .serializers import UserSerializer, CreateProfessorSerializer, StudentProfileSerializer
from .permissions import IsAdmin
from apps.pedagogique.models import Major


def generate_temp_password(length=12):
    chars = string.ascii_letters + string.digits + '!@#$%'
    return ''.join(secrets.choice(chars) for _ in range(length))


@api_view(['GET'])
@permission_classes([IsAdmin])
def list_users(request):
    """List all users with optional filtering by role, major, year."""
    qs = CustomUser.objects.select_related(
        'student_profile__major', 'professor_profile'
    ).order_by('-created_at')

    role = request.query_params.get('role')
    major_id = request.query_params.get('major')
    year = request.query_params.get('year')
    search = request.query_params.get('search')

    if role:
        qs = qs.filter(role=role.upper())
    if major_id:
        qs = qs.filter(student_profile__major_id=major_id)
    if year:
        qs = qs.filter(student_profile__year_of_study=year)
    if search:
        qs = qs.filter(
            first_name__icontains=search
        ) | qs.filter(last_name__icontains=search) | qs.filter(email__icontains=search)

    # Pagination
    try:
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except (ValueError, TypeError):
        page, page_size = 1, 20
    start = (page - 1) * page_size
    end = start + page_size
    total = qs.count()
    users = qs[start:end]

    return Response({
        'count': total,
        'page': page,
        'page_size': page_size,
        'results': UserSerializer(users, many=True).data,
    })


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def user_detail(request, pk):
    """View, edit, or delete any user."""
    try:
        user = CustomUser.objects.get(pk=pk)
    except CustomUser.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(UserSerializer(user).data)

    if request.method in ('PUT', 'PATCH'):
        from .serializers import UserUpdateSerializer
        partial = request.method == 'PATCH'
        # Allow admin to toggle is_active
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
            user.save()
        serializer = UserUpdateSerializer(user, data=request.data, partial=partial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(UserSerializer(user).data)

    if request.method == 'DELETE':
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([IsAdmin])
def create_professor(request):
    """Admin creates a professor account with a temp password."""
    serializer = CreateProfessorSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    temp_password = generate_temp_password()

    user = CustomUser.objects.create(
        email=data['email'],
        first_name=data['first_name'],
        last_name=data['last_name'],
        role=CustomUser.PROFESSOR,
        is_active=True,
        is_email_verified=True,
        force_password_change=True,
    )
    user.set_password(temp_password)
    user.save()

    prof = ProfessorProfile.objects.create(user=user)
    majors = Major.objects.filter(id__in=data['major_ids'])
    prof.majors.set(majors)

    if data.get('send_welcome_email', True):
        html = render_to_string('emails/welcome_professor.html', {
            'first_name': user.first_name,
            'email': user.email,
            'temp_password': temp_password,
            'login_url': f"{settings.FRONTEND_URL}/auth/login",
        })
        send_email('Welcome to Student Hub — Your Professor Account', html, user.email)

    return Response(
        {'detail': 'Professor account created.', 'user': UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAdmin])
def student_profiles(request):
    """List all student profiles with stats."""
    qs = StudentProfile.objects.select_related('user', 'major').order_by('-activity_score')
    major_id = request.query_params.get('major')
    if major_id:
        qs = qs.filter(major_id=major_id)

    try:
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except (ValueError, TypeError):
        page, page_size = 1, 20
    start = (page - 1) * page_size
    total = qs.count()

    return Response({
        'count': total,
        'results': StudentProfileSerializer(qs[start:start + page_size], many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def student_profile_detail(request, pk):
    try:
        profile = StudentProfile.objects.select_related('user', 'major').get(pk=pk)
    except StudentProfile.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    from apps.assignments.serializers import SubmissionSerializer
    from apps.assignments.models import Submission
    submissions = Submission.objects.filter(student=profile).select_related('assignment')

    data = StudentProfileSerializer(profile).data
    data['user'] = UserSerializer(profile.user).data
    data['submissions'] = SubmissionSerializer(submissions, many=True).data
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def professor_activity(request):
    """Summary per professor: active assignments, files uploaded, submissions received."""
    from apps.assignments.models import Assignment, AssignmentFile, Submission
    professors = ProfessorProfile.objects.select_related('user').all()
    results = []
    for prof in professors:
        assignments = Assignment.objects.filter(professor=prof)
        total_files = AssignmentFile.objects.filter(assignment__professor=prof).count()
        total_submissions = Submission.objects.filter(assignment__professor=prof).count()
        results.append({
            'professor': UserSerializer(prof.user).data,
            'active_assignments': assignments.count(),
            'total_files_uploaded': total_files,
            'total_submissions_received': total_submissions,
        })
    return Response(results)


@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_dashboard_stats(request):
    """Quick stats for admin overview card."""
    from apps.assignments.models import Assignment
    from apps.announcements.models import Announcement

    return Response({
        'total_students': CustomUser.objects.filter(role='STUDENT').count(),
        'total_professors': CustomUser.objects.filter(role='PROFESSOR').count(),
        'active_assignments': Assignment.objects.count(),
        'pending_announcements': Announcement.objects.filter(status='PENDING').count(),
    })
