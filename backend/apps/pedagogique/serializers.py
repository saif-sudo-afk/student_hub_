from rest_framework import serializers
from .models import Major, Course, Semester


class MajorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Major
        fields = ['id', 'name', 'code', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class CourseSerializer(serializers.ModelSerializer):
    major_names = serializers.SerializerMethodField()
    professor_names = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'name', 'code', 'description',
            'majors', 'major_names',
            'professors', 'professor_names',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_major_names(self, obj):
        return [m.name for m in obj.majors.all()]

    def get_professor_names(self, obj):
        return [p.user.get_full_name() for p in obj.professors.all()]


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = [
            'id', 'name', 'school_year', 'semester_number',
            'start_date', 'end_date', 'is_active',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        school_year = attrs.get('school_year', getattr(self.instance, 'school_year', None))
        sem_num = attrs.get('semester_number', getattr(self.instance, 'semester_number', None))

        qs = Semester.objects.filter(school_year=school_year, semester_number=sem_num)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                f'Semester {sem_num} for {school_year} already exists.'
            )
        return attrs
