"""
Root URL configuration for Student Hub backend.
All API routes are prefixed with /api/v1/.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),

    # Auth endpoints
    path('api/v1/auth/', include('apps.users.urls')),

    # Admin API
    path('api/v1/admin/', include('apps.users.admin_urls')),

    # Pedagogique (Majors, Courses, Semesters)
    path('api/v1/pedagogique/', include('apps.pedagogique.urls')),

    # Academics (Calendar)
    path('api/v1/academics/', include('apps.academics.urls')),

    # Announcements
    path('api/v1/announcements/', include('apps.announcements.urls')),

    # Assignments
    path('api/v1/assignments/', include('apps.assignments.urls')),

    # Notifications
    path('api/v1/notifications/', include('apps.notifications.urls')),

    # Google OAuth
    path('api/v1/auth/social/', include('allauth.socialaccount.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
