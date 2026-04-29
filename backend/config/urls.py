"""
Root URL configuration for Student Hub backend.

Vercel Services strips the backend service routePrefix (/api) before the
request reaches Django, so production requests to /api/v1/... arrive here as
/v1/.... Keep /api/v1/... as a local/backwards-compatible alias.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),

    # Production routes behind Vercel Services routePrefix=/api
    path('v1/auth/', include('apps.users.urls')),
    path('v1/admin/', include('apps.users.admin_urls')),
    path('v1/pedagogique/', include('apps.pedagogique.urls')),
    path('v1/academics/', include('apps.academics.urls')),
    path('v1/announcements/', include('apps.announcements.urls')),
    path('v1/assignments/', include('apps.assignments.urls')),
    path('v1/notifications/', include('apps.notifications.urls')),
    path('v1/auth/social/', include('allauth.socialaccount.urls')),

    # Local and backwards-compatible API routes
    path('api/v1/auth/', include('apps.users.urls')),
    path('api/v1/admin/', include('apps.users.admin_urls')),
    path('api/v1/pedagogique/', include('apps.pedagogique.urls')),
    path('api/v1/academics/', include('apps.academics.urls')),
    path('api/v1/announcements/', include('apps.announcements.urls')),
    path('api/v1/assignments/', include('apps.assignments.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/auth/social/', include('allauth.socialaccount.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
