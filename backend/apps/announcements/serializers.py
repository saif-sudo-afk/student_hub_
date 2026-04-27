from rest_framework import serializers
from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    major_name = serializers.CharField(source='major.name', read_only=True, default=None)

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'description', 'major', 'major_name',
            'author', 'author_name', 'author_role', 'status',
            'rejection_reason', 'created_at', 'published_at',
        ]
        read_only_fields = [
            'id', 'author', 'author_role', 'status', 'rejection_reason',
            'created_at', 'published_at',
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else 'Unknown'
