from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MajorViewSet, CourseViewSet, SemesterViewSet

router = DefaultRouter()
router.register('majors', MajorViewSet, basename='major')
router.register('courses', CourseViewSet, basename='course')
router.register('semesters', SemesterViewSet, basename='semester')

urlpatterns = [
    path('', include(router.urls)),
]
