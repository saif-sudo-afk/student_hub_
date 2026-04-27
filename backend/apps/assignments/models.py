"""
Assignment, Submission, ProjectGroup, and related file models.
"""

import uuid
from django.db import models
from cloudinary_storage.storage import RawMediaCloudinaryStorage


class Assignment(models.Model):
    TP = 'TP'
    TD = 'TD'
    PROJECT = 'PROJECT'
    TYPE_CHOICES = [
        (TP, 'TP (Travaux Pratiques)'),
        (TD, 'TD (Travaux Dirigés)'),
        (PROJECT, 'Project'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=300)
    description = models.TextField()
    deadline = models.DateTimeField()
    professor = models.ForeignKey(
        'users.ProfessorProfile',
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    course = models.ForeignKey(
        'pedagogique.Course',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignments',
    )
    majors = models.ManyToManyField('pedagogique.Major', related_name='assignments')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TD)
    is_group_work = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.type})'


class AssignmentFile(models.Model):
    PDF = 'pdf'
    EXCEL = 'excel'
    PPTX = 'pptx'
    ZIP = 'zip'
    FILE_TYPE_CHOICES = [
        (PDF, 'PDF'), (EXCEL, 'Excel'), (PPTX, 'PowerPoint'), (ZIP, 'ZIP'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name='files'
    )
    file = models.FileField(
        upload_to='assignment_files/',
        storage=RawMediaCloudinaryStorage(),
    )
    original_filename = models.CharField(max_length=255, default='file')
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    file_size = models.PositiveBigIntegerField(default=0)  # bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'File for {self.assignment.title}'


class ProjectGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name='groups'
    )
    name = models.CharField(max_length=200)
    leader = models.ForeignKey(
        'users.StudentProfile',
        on_delete=models.SET_NULL,
        null=True,
        related_name='led_groups',
    )
    members = models.ManyToManyField(
        'users.StudentProfile',
        related_name='project_groups',
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} — {self.assignment.title}'


class Submission(models.Model):
    PENDING = 'PENDING'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name='submissions'
    )
    # For individual submissions
    student = models.ForeignKey(
        'users.StudentProfile',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='submissions',
    )
    # For group submissions
    group = models.ForeignKey(
        ProjectGroup,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='submissions',
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    grade = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True, null=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'users.ProfessorProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_submissions',
    )

    class Meta:
        ordering = ['-submitted_at']
        # A student can only submit once per assignment
        unique_together = [('assignment', 'student')]

    def __str__(self):
        submitter = self.student or self.group
        return f'Submission by {submitter} for {self.assignment.title}'


class SubmissionFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(
        Submission, on_delete=models.CASCADE, related_name='files'
    )
    file = models.FileField(
        upload_to='submission_files/',
        storage=RawMediaCloudinaryStorage(),
        null=True,
        blank=True,
    )
    original_filename = models.CharField(max_length=255, default='file')
    file_type = models.CharField(max_length=10, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    # For group project link submissions (GitHub/Drive)
    link_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f'File for submission {self.submission.id}'


class StudentNotice(models.Model):
    """A one-way notice from a professor to a specific student."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professor = models.ForeignKey(
        'users.ProfessorProfile',
        on_delete=models.CASCADE,
        related_name='sent_notices',
    )
    student = models.ForeignKey(
        'users.StudentProfile',
        on_delete=models.CASCADE,
        related_name='received_notices',
    )
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Notice to {self.student} from {self.professor}'
