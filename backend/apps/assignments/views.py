"""
Views for assignments, submissions, groups, and student notices.
"""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Assignment, AssignmentFile, Submission, SubmissionFile, ProjectGroup, StudentNotice
from .serializers import (
    AssignmentSerializer, SubmissionSerializer, ReviewSubmissionSerializer,
    ProjectGroupSerializer, StudentNoticeSerializer,
)
from .file_validators import validate_uploaded_file
from apps.users.permissions import IsAdmin, IsProfessor, IsStudent, IsAdminOrProfessor
from apps.notifications.services import notify, notify_many


class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsProfessor()]

    def get_queryset(self):
        user = self.request.user
        qs = Assignment.objects.prefetch_related('files', 'majors').select_related(
            'professor__user', 'course'
        )
        if user.role == 'STUDENT':
            try:
                major = user.student_profile.major
                qs = qs.filter(majors=major, is_group_work=False)
            except Exception:
                return qs.none()
        elif user.role == 'PROFESSOR':
            qs = qs.filter(professor=user.professor_profile)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        assignment = serializer.save()
        # Notify all students in the relevant majors
        from apps.users.models import CustomUser
        students = CustomUser.objects.filter(
            role='STUDENT',
            student_profile__major__in=assignment.majors.all(),
        )
        notify_many(
            students,
            notif_type='ASSIGNMENT_POSTED',
            title=f'New Assignment: {assignment.title}',
            message=f'{assignment.professor.user.get_full_name()} posted a new {assignment.type} assignment: "{assignment.title}". Deadline: {assignment.deadline.strftime("%Y-%m-%d %H:%M")}.',
            link=f'/student/assignments',
        )

    @action(detail=True, methods=['post'], permission_classes=[IsStudent])
    def submit(self, request, pk=None):
        assignment = self.get_object()
        student = request.user.student_profile

        if timezone.now() > assignment.deadline:
            return Response(
                {'detail': 'Submission deadline has passed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Submission.objects.filter(assignment=assignment, student=student).exists():
            return Response({'detail': 'Already submitted.'}, status=status.HTTP_400_BAD_REQUEST)

        files = request.FILES.getlist('files')
        if not files:
            return Response({'detail': 'At least one file is required.'}, status=status.HTTP_400_BAD_REQUEST)

        submission = Submission.objects.create(
            assignment=assignment,
            student=student,
            status=Submission.PENDING,
        )
        for f in files:
            file_type = validate_uploaded_file(f)
            SubmissionFile.objects.create(
                submission=submission,
                file=f,
                original_filename=f.name,
                file_type=file_type,
                file_size=f.size,
            )

        # Notify professor
        notify(
            assignment.professor.user,
            notif_type='ASSIGNMENT_POSTED',
            title=f'New submission: {assignment.title}',
            message=f'{request.user.get_full_name()} submitted "{assignment.title}".',
            link=f'/professor/assignments',
        )

        # Recalculate student activity score
        student.recalculate_scores()

        return Response(SubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsProfessor])
    def review(self, request, pk=None):
        assignment = self.get_object()
        submission_id = request.data.get('submission_id')

        try:
            submission = Submission.objects.get(id=submission_id, assignment=assignment)
        except Submission.DoesNotExist:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReviewSubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        action_type = serializer.validated_data['action']
        submission.reviewed_at = timezone.now()
        submission.reviewed_by = request.user.professor_profile
        submission.feedback = serializer.validated_data.get('feedback', '')

        if action_type == 'approve':
            submission.status = Submission.APPROVED
            submission.grade = serializer.validated_data['grade']
            submission.save()

            if submission.student:
                notify(
                    submission.student.user,
                    notif_type='SUBMISSION_APPROVED',
                    title=f'Submission Approved: {assignment.title}',
                    message=f'Your submission for "{assignment.title}" was approved. Grade: {submission.grade}/20.',
                    link=f'/student/assignments',
                )
                submission.student.recalculate_scores()
            elif submission.group:
                for member in submission.group.members.select_related('user').all():
                    notify(
                        member.user,
                        notif_type='SUBMISSION_APPROVED',
                        title=f'Group Submission Approved: {assignment.title}',
                        message=f'Your group "{submission.group.name}" submission was approved. Grade: {submission.grade}/20.',
                        link=f'/student/groups',
                    )
        else:
            submission.status = Submission.REJECTED
            submission.save()
            if submission.student:
                notify(
                    submission.student.user,
                    notif_type='SUBMISSION_REJECTED',
                    title=f'Submission Rejected: {assignment.title}',
                    message=f'Your submission for "{assignment.title}" was rejected. Feedback: {submission.feedback}',
                    link=f'/student/assignments',
                )
                submission.student.recalculate_scores()
            elif submission.group:
                for member in submission.group.members.select_related('user').all():
                    notify(
                        member.user,
                        notif_type='SUBMISSION_REJECTED',
                        title=f'Group Submission Rejected: {assignment.title}',
                        message=f'Your group submission was rejected. Feedback: {submission.feedback}',
                        link=f'/student/groups',
                    )

        return Response(SubmissionSerializer(submission).data)

    @action(detail=True, methods=['get'], permission_classes=[IsAdminOrProfessor])
    def submissions(self, request, pk=None):
        assignment = self.get_object()
        subs = Submission.objects.filter(assignment=assignment).prefetch_related('files')
        return Response(SubmissionSerializer(subs, many=True).data)

    @action(detail=True, methods=['get'], permission_classes=[IsProfessor])
    def non_submitters(self, request, pk=None):
        assignment = self.get_object()
        from apps.users.models import StudentProfile
        submitted_student_ids = Submission.objects.filter(
            assignment=assignment, student__isnull=False
        ).values_list('student_id', flat=True)

        non_submitters = StudentProfile.objects.filter(
            major__in=assignment.majors.all()
        ).exclude(id__in=submitted_student_ids).select_related('user', 'major')

        return Response([
            {
                'id': str(s.id),
                'name': s.user.get_full_name(),
                'email': s.user.email,
                'major': s.major.name if s.major else None,
            }
            for s in non_submitters
        ])

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        assignment = serializer.save()

        # Handle file uploads
        files = request.FILES.getlist('files')
        for f in files:
            file_type = validate_uploaded_file(f)
            AssignmentFile.objects.create(
                assignment=assignment,
                file=f,
                original_filename=f.name,
                file_type=file_type,
                file_size=f.size,
            )

        return Response(AssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)


class ProjectGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectGroupSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsProfessor()]

    def get_queryset(self):
        user = self.request.user
        qs = ProjectGroup.objects.select_related(
            'assignment', 'leader__user'
        ).prefetch_related('members__user')

        if user.role == 'STUDENT':
            try:
                qs = qs.filter(members=user.student_profile)
            except Exception:
                return qs.none()
        elif user.role == 'PROFESSOR':
            qs = qs.filter(assignment__professor=user.professor_profile)
        return qs

    def perform_create(self, serializer):
        group = serializer.save()
        # Notify all members they've been assigned to a group
        for member in group.members.select_related('user').all():
            notify(
                member.user,
                notif_type='GROUP_ASSIGNED',
                title=f'Group Assignment: {group.assignment.title}',
                message=f'You have been assigned to group "{group.name}" for project "{group.assignment.title}".',
                link='/student/groups',
            )

    @action(detail=True, methods=['post'], permission_classes=[IsStudent])
    def submit_link(self, request, pk=None):
        group = self.get_object()
        student = request.user.student_profile

        if group.leader != student:
            return Response(
                {'detail': 'Only the group leader can submit.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        link_url = request.data.get('link_url')
        if not link_url:
            return Response({'detail': 'link_url is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if Submission.objects.filter(assignment=group.assignment, group=group).exists():
            return Response({'detail': 'Already submitted.'}, status=status.HTTP_400_BAD_REQUEST)

        submission = Submission.objects.create(
            assignment=group.assignment,
            group=group,
            status=Submission.PENDING,
        )
        SubmissionFile.objects.create(
            submission=submission,
            link_url=link_url,
            file_type='link',
            file_size=0,
            original_filename='project_link',
        )

        # Notify professor
        notify(
            group.assignment.professor.user,
            notif_type='ASSIGNMENT_POSTED',
            title=f'Group submission received: {group.assignment.title}',
            message=f'Group "{group.name}" submitted for "{group.assignment.title}".',
            link='/professor/groups',
        )

        return Response(SubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsProfessor])
def send_student_notice(request):
    student_id = request.data.get('student_id')
    message = request.data.get('message')

    if not student_id or not message:
        return Response(
            {'detail': 'student_id and message are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    from apps.users.models import StudentProfile
    try:
        student = StudentProfile.objects.get(pk=student_id)
    except StudentProfile.DoesNotExist:
        return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    professor = request.user.professor_profile
    notice = StudentNotice.objects.create(professor=professor, student=student, message=message)

    notify(
        student.user,
        notif_type='NOTICE_RECEIVED',
        title=f'Notice from Prof. {professor.user.get_full_name()}',
        message=message,
        link='/student/notifications',
    )

    return Response(StudentNoticeSerializer(notice).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsStudent])
def received_notices(request):
    student = request.user.student_profile
    notices = StudentNotice.objects.filter(student=student).select_related('professor__user')
    return Response(StudentNoticeSerializer(notices, many=True).data)
