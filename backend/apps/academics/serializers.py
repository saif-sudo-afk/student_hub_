from rest_framework import serializers
from .models import AcademicEvent

PRIORITY_COLOR_MAP = {
    'LOW': '#3b82f6',
    'MEDIUM': '#eab308',
    'HIGH': '#f97316',
    'URGENT': '#ef4444',
}


class AcademicEventSerializer(serializers.ModelSerializer):
    color = serializers.SerializerMethodField()
    major_name = serializers.CharField(source='major.name', read_only=True, default=None)

    class Meta:
        model = AcademicEvent
        fields = [
            'id', 'title', 'description', 'event_date',
            'priority', 'major', 'major_name', 'color',
            'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'color']

    def get_color(self, obj):
        return PRIORITY_COLOR_MAP.get(obj.priority, '#3b82f6')

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
