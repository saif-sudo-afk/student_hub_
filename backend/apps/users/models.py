"""
Custom user models for Student Hub.
All PKs are UUIDs. CustomUser uses email as the username field.
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from cloudinary_storage.storage import RawMediaCloudinaryStorage


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', CustomUser.ADMIN)
        extra_fields.setdefault('is_email_verified', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    ADMIN = 'ADMIN'
    PROFESSOR = 'PROFESSOR'
    STUDENT = 'STUDENT'
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (PROFESSOR, 'Professor'),
        (STUDENT, 'Student'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=STUDENT)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    # Forces professors to change their temp password on first login
    force_password_change = models.BooleanField(default=False)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        storage=RawMediaCloudinaryStorage(),
        blank=True,
        null=True,
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'User'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_full_name()} ({self.role})'

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_admin(self):
        return self.role == self.ADMIN

    @property
    def is_professor(self):
        return self.role == self.PROFESSOR

    @property
    def is_student(self):
        return self.role == self.STUDENT


class EmailVerificationToken(models.Model):
    """Token sent to students to verify their email address."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='email_token')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Token for {self.user.email}'


class PasswordResetToken(models.Model):
    """Token used for password reset flow."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Reset token for {self.user.email}'


class StudentProfile(models.Model):
    """Extended profile for students."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='student_profile'
    )
    # major set via FK from pedagogique app (to avoid circular import, use string ref)
    major = models.ForeignKey(
        'pedagogique.Major',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
    )
    year_of_study = models.PositiveSmallIntegerField(default=1)
    # Computed and stored on each submission status change
    submission_rate = models.FloatField(default=0.0)
    approval_rate = models.FloatField(default=0.0)
    grade_average = models.FloatField(default=0.0)
    activity_score = models.FloatField(default=0.0)

    class Meta:
        verbose_name = 'Student Profile'

    def __str__(self):
        return f'Student: {self.user.get_full_name()}'

    def recalculate_scores(self):
        """
        Recalculates activity metrics and persists them.
        Called server-side after every submission status change.
        """
        from apps.assignments.models import Submission

        # All assignments in this student's major
        total_assignments = 0
        if self.major:
            from apps.assignments.models import Assignment
            total_assignments = Assignment.objects.filter(
                majors=self.major, is_group_work=False
            ).count()

        submissions = Submission.objects.filter(student=self)
        submitted_count = submissions.count()
        approved = submissions.filter(status='APPROVED')
        approved_count = approved.count()

        grades = [s.grade for s in approved if s.grade is not None]
        grade_avg = (sum(grades) / len(grades)) if grades else 0.0

        sub_rate = (submitted_count / total_assignments * 100) if total_assignments else 0.0
        appr_rate = (approved_count / submitted_count * 100) if submitted_count else 0.0

        # Activity score formula
        activity = (sub_rate * 0.4) + (appr_rate * 0.4) + ((grade_avg / 20) * 100 * 0.2)

        self.submission_rate = round(sub_rate, 2)
        self.approval_rate = round(appr_rate, 2)
        self.grade_average = round(grade_avg, 2)
        self.activity_score = round(min(activity, 100), 2)
        self.save()


class ProfessorProfile(models.Model):
    """Extended profile for professors."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='professor_profile'
    )
    majors = models.ManyToManyField(
        'pedagogique.Major',
        related_name='professors',
        blank=True,
    )
    bio = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Professor Profile'

    def __str__(self):
        return f'Professor: {self.user.get_full_name()}'
