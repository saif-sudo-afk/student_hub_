# Generated manually for the existing Student Hub announcement model.

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('pedagogique', '0001_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Announcement',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=300)),
                ('description', models.TextField()),
                ('author_role', models.CharField(blank=True, max_length=20)),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('PENDING', 'Pending Approval'), ('APPROVED', 'Approved / Published'), ('REJECTED', 'Rejected')], default='DRAFT', max_length=10)),
                ('rejection_reason', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('author', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='announcements', to='users.customuser')),
                ('major', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='announcements', to='pedagogique.major')),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
