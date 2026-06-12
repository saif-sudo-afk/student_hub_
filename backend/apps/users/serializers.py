"""
Serializers for user authentication and profile management.
"""

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

    def validate_email(self, value):
        email = CustomUser.objects.normalize_email(value).strip()
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate_major_id(self, value):
        from apps.pedagogique.models import Major
        if not Major.objects.filter(id=value).exists():
            raise serializers.ValidationError('Selected major does not exist.')
        return value

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
            is_active=True,
            is_email_verified=True,
            **validated_data,
        )
        user.set_password(password)
        user.save()

        major = Major.objects.get(id=major_id)
        StudentProfile.objects.create(user=user, major=major, year_of_study=year)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = CustomUser.objects.normalize_email(attrs['email']).strip()
        password = attrs['password']

        user = CustomUser.objects.filter(email__iexact=email).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            if not user.is_email_verified:
                raise serializers.ValidationError('Account not verified. Please check your email and click the verification link.')
            raise serializers.ValidationError('Account is not active. Please contact an administrator.')
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
    student_name = serializers.CharField(source='user.get_full_name', read_only=True)
    student_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'student_name', 'student_email',
            'major', 'major_name', 'major_code',
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
            'phone_number', 'is_active', 'is_email_verified', 'force_password_change',
            'profile_picture_url', 'created_at', 'student_profile', 'professor_profile',
        ]
        read_only_fields = ['id', 'email', 'role', 'is_active', 'is_email_verified', 'created_at']

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
    """Admin-only: create a professor account with a manually assigned password."""
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    major_ids = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)

    def validate_email(self, value):
        email = CustomUser.objects.normalize_email(value).strip()
        if CustomUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def validate_major_ids(self, value):
        from apps.pedagogique.models import Major
        existing = set(Major.objects.filter(id__in=value).values_list('id', flat=True))
        missing = [str(item) for item in value if item not in existing]
        if missing:
            raise serializers.ValidationError(
                f'Unknown major id(s): {", ".join(missing)}'
            )
        return value


class CompleteProfileSerializer(serializers.Serializer):
    """Collect missing fields after Google OAuth signup."""
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    year_of_study = serializers.IntegerField(min_value=1, max_value=5)
    major_id = serializers.UUIDField()
    agree_terms = serializers.BooleanField()

    def validate_agree_terms(self, value):
        if not value:
            raise serializers.ValidationError('You must agree to the terms.')
        return value

    def validate_major_id(self, value):
        from apps.pedagogique.models import Major
        if not Major.objects.filter(id=value).exists():
            raise serializers.ValidationError('Major not found.')
        return value
