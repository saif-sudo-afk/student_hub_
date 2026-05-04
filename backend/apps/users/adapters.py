"""
Custom django-allauth hooks for Student Hub social login.
"""

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


def _truthy(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes'}
    return bool(value)


class StudentHubSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Trust verified Google emails as verified Student Hub emails.

    Google already verifies email ownership before returning a verified email
    claim. When allauth authenticates a matching local account by email, this
    adapter activates that account and marks it email-verified before JWTs are
    minted in the post-login redirect view.
    """

    def _is_verified_google_login(self, sociallogin):
        account = getattr(sociallogin, 'account', None)
        if getattr(account, 'provider', None) != 'google':
            return False

        if any(getattr(email, 'verified', False) for email in sociallogin.email_addresses):
            return True

        extra_data = getattr(account, 'extra_data', None) or {}
        return _truthy(extra_data.get('email_verified')) or _truthy(extra_data.get('verified_email'))

    def _mark_verified(self, user, *, save):
        updates = []
        if not user.is_active:
            user.is_active = True
            updates.append('is_active')
        if not user.is_email_verified:
            user.is_email_verified = True
            updates.append('is_email_verified')
        if updates and save and user.pk:
            user.save(update_fields=updates)

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        if self._is_verified_google_login(sociallogin):
            self._mark_verified(user, save=False)
        return user

    def pre_social_login(self, request, sociallogin):
        super().pre_social_login(request, sociallogin)
        if self._is_verified_google_login(sociallogin) and sociallogin.user.pk:
            self._mark_verified(sociallogin.user, save=True)
