from django.apps import AppConfig


class AssignmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assignments'
    label = 'assignments'

    def ready(self):
        import apps.assignments.signals  # noqa: F401
