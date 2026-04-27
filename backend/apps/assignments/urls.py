from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssignmentViewSet, ProjectGroupViewSet, send_student_notice, received_notices
from .export_views import export_grades

router = DefaultRouter()
router.register('', AssignmentViewSet, basename='assignment')
router.register('groups', ProjectGroupViewSet, basename='group')

urlpatterns = [
    path('', include(router.urls)),
    path('notices/', send_student_notice, name='send_notice'),
    path('notices/received/', received_notices, name='received_notices'),
    path('export/grades/', export_grades, name='export_grades'),
]
