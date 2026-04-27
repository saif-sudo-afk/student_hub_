"""
In-app notification model. Triggers also send emails via signals.
"""

import uuid
from django.db import models


class Notification(models.Model):
    # Notification type constants
    ASSIGNMENT_POSTED = 'ASSIGNMENT_POSTED'
    DEADLINE_REMINDER = 'DEADLINE_REMINDER'
    SUBMISSION_APPROVED = 'SUBMISSION_APPROVED'
    SUBMISSION_REJECTED = 'SUBMISSION_REJECTED'
    ANNOUNCEMENT_PUBLISHED = 'ANNOUNCEMENT_PUBLISHED'
    NOTICE_RECEIVED = 'NOTICE_RECEIVED'
    GRADE_POSTED = 'GRADE_POSTED'
    GROUP_ASSIGNED = 'GROUP_ASSIGNED'
    ANNOUNCEMENT_REQUEST_STATUS = 'ANNOUNCEMENT_REQUEST_STATUS'
    WELCOME = 'WELCOME'

    TYPE_CHOICES = [
        (ASSIGNMENT_POSTED, 'Assignment Posted'),
        (DEADLINE_REMINDER, 'Deadline Reminder'),
        (SUBMISSION_APPROVED, 'Submission Approved'),
        (SUBMISSION_REJECTED, 'Submission Rejected'),
        (ANNOUNCEMENT_PUBLISHED, 'Announcement Published'),
        (NOTICE_RECEIVED, 'Notice Received'),
        (GRADE_POSTED, 'Grade Posted'),
        (GROUP_ASSIGNED, 'Group Assigned'),
        (ANNOUNCEMENT_REQUEST_STATUS, 'Announcement Request Status'),
        (WELCOME, 'Welcome'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    title = models.CharField(max_length=300)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    # Optional deep-link for navigation on frontend
    link = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type} → {self.recipient.email}'
