"""
Serializers for assignments, submissions, groups, and notices.
"""

from rest_framework import serializers
from django.conf import settings
from .models import Assignment, AssignmentFile, Submission, SubmissionFile, ProjectGroup, StudentNotice


class AssignmentFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentFile
        fields = ['id', 'file_type', 'file_size', 'original_filename', 'uploaded_at', 'url']

    def get_url(self, obj):
        return obj.file.url if obj.file else None


class AssignmentSerializer(serializers.ModelSerializer):
    files = AssignmentFileSerializer(many=True, read_only=True)
    professor_name = serializers.CharField(source='professor.user.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True, default=None)
    major_names = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'title', 'description', 'deadline', 'type',
            'is_group_work', 'professor', 'professor_name',
            'course', 'course_name', 'majors', 'major_names',
            'files', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'professor', 'created_at', 'updated_at']

    def get_major_names(self, obj):
        return [m.name for m in obj.majors.all()]

    def create(self, validated_data):
        majors = validated_data.pop('majors', [])
        validated_data['professor'] = self.context['request'].user.professor_profile
        assignment = super().create(validated_data)
        assignment.majors.set(majors)
        return assignment


class SubmissionFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = SubmissionFile
        fields = ['id', 'file_type', 'file_size', 'original_filename', 'link_url', 'url']

    def get_url(self, obj):
        return obj.file.url if obj.file else None


class SubmissionSerializer(serializers.ModelSerializer):
    files = SubmissionFileSerializer(many=True, read_only=True)
    student_name = serializers.SerializerMethodField()
    group_name = serializers.CharField(source='group.name', read_only=True, default=None)
    assignment_title = serializers.CharField(source='assignment.title', read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'assignment', 'assignment_title',
            'student', 'student_name', 'group', 'group_name',
            'submitted_at', 'status', 'grade', 'feedback',
            'reviewed_at', 'reviewed_by', 'files',
        ]
        read_only_fields = [
            'id', 'submitted_at', 'status', 'grade', 'feedback',
            'reviewed_at', 'reviewed_by',
        ]

    def get_student_name(self, obj):
        if obj.student:
            return obj.student.user.get_full_name()
        return None


class ReviewSubmissionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    grade = serializers.DecimalField(max_digits=4, decimal_places=2, min_value=0, max_value=20, required=False)
    feedback = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['action'] == 'approve' and attrs.get('grade') is None:
            raise serializers.ValidationError({'grade': 'Grade is required when approving.'})
        if attrs['action'] == 'reject' and not attrs.get('feedback'):
            raise serializers.ValidationError({'feedback': 'Feedback is required when rejecting.'})
        return attrs


class ProjectGroupSerializer(serializers.ModelSerializer):
    member_details = serializers.SerializerMethodField()
    leader_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectGroup
        fields = [
            'id', 'assignment', 'name', 'leader', 'leader_name',
            'members', 'member_details', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_member_details(self, obj):
        return [
            {
                'id': str(m.id),
                'name': m.user.get_full_name(),
                'email': m.user.email,
                'phone': m.user.phone_number,
            }
            for m in obj.members.select_related('user').all()
        ]

    def get_leader_name(self, obj):
        return obj.leader.user.get_full_name() if obj.leader else None


class StudentNoticeSerializer(serializers.ModelSerializer):
    professor_name = serializers.CharField(source='professor.user.get_full_name', read_only=True)
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)

    class Meta:
        model = StudentNotice
        fields = [
            'id', 'professor', 'professor_name', 'student', 'student_name',
            'message', 'created_at', 'is_read',
        ]
        read_only_fields = ['id', 'professor', 'created_at', 'is_read']
