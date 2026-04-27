from django.urls import path
from .views import list_notifications, mark_read, mark_all_read

urlpatterns = [
    path('', list_notifications, name='notifications_list'),
    path('<uuid:pk>/read/', mark_read, name='notification_read'),
    path('read-all/', mark_all_read, name='notifications_read_all'),
]
