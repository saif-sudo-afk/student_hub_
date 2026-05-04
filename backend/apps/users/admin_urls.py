from django.urls import path
from . import admin_views

urlpatterns = [
    path('users/', admin_views.list_users, name='admin_list_users'),
    path('users/<uuid:pk>/', admin_views.user_detail, name='admin_user_detail'),
    path('email-diagnostics/', admin_views.email_diagnostics, name='admin_email_diagnostics'),
    path('professors/create/', admin_views.create_professor, name='admin_create_professor'),
    path('student-profiles/', admin_views.student_profiles, name='admin_student_profiles'),
    path('student-profiles/<uuid:pk>/', admin_views.student_profile_detail, name='admin_student_profile_detail'),
    path('professor-activity/', admin_views.professor_activity, name='admin_professor_activity'),
    path('dashboard-stats/', admin_views.admin_dashboard_stats, name='admin_dashboard_stats'),
]
