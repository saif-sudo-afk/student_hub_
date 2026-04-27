# Generated manually for Course after user/profile models exist.

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pedagogique', '0001_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Course',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('code', models.CharField(max_length=20, unique=True)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('majors', models.ManyToManyField(blank=True, related_name='courses', to='pedagogique.major')),
                ('professors', models.ManyToManyField(blank=True, related_name='courses', to='users.professorprofile')),
            ],
            options={'ordering': ['name']},
        ),
    ]
