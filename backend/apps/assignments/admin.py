from django.contrib import admin
from .models import Assignment, AssignmentFile, Submission, SubmissionFile, ProjectGroup, StudentNotice

admin.site.register(Assignment)
admin.site.register(AssignmentFile)
admin.site.register(Submission)
admin.site.register(SubmissionFile)
admin.site.register(ProjectGroup)
admin.site.register(StudentNotice)
