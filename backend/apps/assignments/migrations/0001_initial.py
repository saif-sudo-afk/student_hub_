# Generated manually for the existing Student Hub assignment models.

import uuid
import cloudinary_storage.storage
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('pedagogique', '0002_course'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Assignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=300)),
                ('description', models.TextField()),
                ('deadline', models.DateTimeField()),
                ('type', models.CharField(choices=[('TP', 'TP (Travaux Pratiques)'), ('TD', 'TD (Travaux Dirigés)'), ('PROJECT', 'Project')], default='TD', max_length=10)),
                ('is_group_work', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('course', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assignments', to='pedagogique.course')),
                ('majors', models.ManyToManyField(related_name='assignments', to='pedagogique.major')),
                ('professor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='users.professorprofile')),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='AssignmentFile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file', models.FileField(storage=cloudinary_storage.storage.RawMediaCloudinaryStorage(), upload_to='assignment_files/')),
                ('original_filename', models.CharField(default='file', max_length=255)),
                ('file_type', models.CharField(choices=[('pdf', 'PDF'), ('excel', 'Excel'), ('pptx', 'PowerPoint'), ('zip', 'ZIP')], max_length=10)),
                ('file_size', models.PositiveBigIntegerField(default=0)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='files', to='assignments.assignment')),
            ],
        ),
        migrations.CreateModel(
            name='ProjectGroup',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='groups', to='assignments.assignment')),
                ('leader', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='led_groups', to='users.studentprofile')),
                ('members', models.ManyToManyField(blank=True, related_name='project_groups', to='users.studentprofile')),
            ],
        ),
        migrations.CreateModel(
            name='Submission',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING', max_length=10)),
                ('grade', models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True)),
                ('feedback', models.TextField(blank=True, null=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='assignments.assignment')),
                ('group', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='assignments.projectgroup')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reviewed_submissions', to='users.professorprofile')),
                ('student', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='users.studentprofile')),
            ],
            options={
                'ordering': ['-submitted_at'],
                'unique_together': {('assignment', 'student')},
            },
        ),
        migrations.CreateModel(
            name='SubmissionFile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file', models.FileField(blank=True, null=True, storage=cloudinary_storage.storage.RawMediaCloudinaryStorage(), upload_to='submission_files/')),
                ('original_filename', models.CharField(default='file', max_length=255)),
                ('file_type', models.CharField(blank=True, max_length=10)),
                ('file_size', models.PositiveBigIntegerField(default=0)),
                ('link_url', models.URLField(blank=True, null=True)),
                ('submission', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='files', to='assignments.submission')),
            ],
        ),
        migrations.CreateModel(
            name='StudentNotice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('message', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_read', models.BooleanField(default=False)),
                ('professor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_notices', to='users.professorprofile')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_notices', to='users.studentprofile')),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
