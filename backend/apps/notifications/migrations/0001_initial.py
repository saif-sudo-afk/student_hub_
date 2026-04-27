# Generated manually for the existing Student Hub notification model.

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('type', models.CharField(choices=[('ASSIGNMENT_POSTED', 'Assignment Posted'), ('DEADLINE_REMINDER', 'Deadline Reminder'), ('SUBMISSION_APPROVED', 'Submission Approved'), ('SUBMISSION_REJECTED', 'Submission Rejected'), ('ANNOUNCEMENT_PUBLISHED', 'Announcement Published'), ('NOTICE_RECEIVED', 'Notice Received'), ('GRADE_POSTED', 'Grade Posted'), ('GROUP_ASSIGNED', 'Group Assigned'), ('ANNOUNCEMENT_REQUEST_STATUS', 'Announcement Request Status'), ('WELCOME', 'Welcome')], max_length=40)),
                ('title', models.CharField(max_length=300)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('link', models.CharField(blank=True, max_length=500, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='users.customuser')),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
