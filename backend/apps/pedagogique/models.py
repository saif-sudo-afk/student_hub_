"""
Pedagogique models: Major, Course, Semester.
"""

import uuid
from django.db import models


class Major(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.code} — {self.name}'


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    majors = models.ManyToManyField(Major, related_name='courses', blank=True)
    professors = models.ManyToManyField(
        'users.ProfessorProfile', related_name='courses', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.code} — {self.name}'


class Semester(models.Model):
    SEMESTER_CHOICES = [(1, 'Semester 1'), (2, 'Semester 2')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # e.g. "S1 2024-2025"
    school_year = models.CharField(max_length=20)  # e.g. "2024-2025"
    semester_number = models.PositiveSmallIntegerField(choices=SEMESTER_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['-school_year', 'semester_number']
        # Max 2 semesters per school year enforced at model level
        unique_together = [('school_year', 'semester_number')]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Deactivate all others when setting one active
        if self.is_active:
            Semester.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
