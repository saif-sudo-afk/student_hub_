"""
Serializers for user authentication and profile management.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import CustomUser, StudentProfile, ProfessorProfile


class StudentRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    major_id = serializers.UUIDField(write_only=True)
    year_of_study = serializers.IntegerField(min_value=1, max_value=5)
    agree_terms = serializers.BooleanField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'email', 'first_name', 'last_name', 'phone_number',
            'password', 'confirm_password', 'major_id', 'year_of_study', 'agree_terms',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        if not attrs.pop('agree_terms', False):
            raise serializers.ValidationError({'agree_terms': 'You must agree to the terms.'})
        return attrs

    def create(self, validated_data):
        from apps.pedagogique.models import Major
        major_id = validated_data.pop('major_id')
        year = validated_data.pop('year_of_study')
        password = validated_data.pop('password')

        user = CustomUser.objects.create(
            role=CustomUser.STUDENT,
            is_active=False,  # inactive until email verified
            is_email_verified=False,
            **validated_data,
        )
        user.set_password(password)
        user.save()

        major = Major.objects.filter(id=major_id).first()
        StudentProfile.objects.create(user=user, major=major, year_of_study=year)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            email=attrs['email'],
            password=attrs['password'],
        )
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is not active. Please verify your email.')
        attrs['user'] = user
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(validators=[validate_password])
    confirm_password = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class StudentProfileSerializer(serializers.ModelSerializer):
    major_name = serializers.CharField(source='major.name', read_only=True)
    major_code = serializers.CharField(source='major.code', read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'major', 'major_name', 'major_code',
            'year_of_study', 'submission_rate', 'approval_rate',
            'grade_average', 'activity_score',
        ]
        read_only_fields = ['submission_rate', 'approval_rate', 'grade_average', 'activity_score']


class ProfessorProfileSerializer(serializers.ModelSerializer):
    major_ids = serializers.PrimaryKeyRelatedField(
        source='majors',
        many=True,
        read_only=True,
    )

    class Meta:
        model = ProfessorProfile
        fields = ['id', 'major_ids', 'bio']


class UserSerializer(serializers.ModelSerializer):
    student_profile = StudentProfileSerializer(read_only=True)
    professor_profile = ProfessorProfileSerializer(read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role',
            'phone_number', 'is_email_verified', 'force_password_change',
            'profile_picture_url', 'created_at', 'student_profile', 'professor_profile',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_email_verified', 'created_at']

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            return obj.profile_picture.url
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    """For updating first_name, last_name, phone_number, profile_picture."""
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'phone_number', 'profile_picture']


class CreateProfessorSerializer(serializers.Serializer):
    """Admin-only: create a professor account."""
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    major_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)
    send_welcome_email = serializers.BooleanField(default=True)

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value
