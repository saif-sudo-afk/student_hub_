"""
Authentication and user management views.
"""

from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import CustomUser, EmailVerificationToken, PasswordResetToken
from .serializers import (
    StudentRegisterSerializer,
    LoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def set_auth_cookies(response, tokens):
    """Set JWT tokens as httpOnly cookies."""
    response.set_cookie(
        key=settings.SIMPLE_JWT['AUTH_COOKIE'],
        value=tokens['access'],
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
    )
    response.set_cookie(
        key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
        value=tokens['refresh'],
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register_student(request):
    """Register a new student. Account inactive until email verified."""
    serializer = StudentRegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer.save()

    return Response(
        {'detail': 'Registration successful. You can now log in.'},
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request, token):
    """Activate a student account via tokenized email link."""
    try:
        token_obj = EmailVerificationToken.objects.get(token=token)
    except EmailVerificationToken.DoesNotExist:
        return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

    user = token_obj.user
    user.is_active = True
    user.is_email_verified = True
    user.save()
    token_obj.delete()

    return Response({'detail': 'Email verified successfully. You can now log in.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Login with email + password. Returns JWT in httpOnly cookies + body."""
    serializer = LoginSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data['user']
    tokens = get_tokens_for_user(user)

    response = Response({
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'user': UserSerializer(user).data,
    })
    set_auth_cookies(response, tokens)
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blacklist the refresh token and clear cookies."""
    try:
        refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH']) or \
                        request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except TokenError:
        pass

    response = Response({'detail': 'Logged out successfully.'})
    response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE'])
    response.delete_cookie(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Send a password reset email."""
    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    user = CustomUser.objects.filter(email=email).first()

    # Always return 200 to prevent email enumeration
    if user:
        token_obj = PasswordResetToken.objects.create(user=user)
        reset_url = f"{settings.FRONTEND_URL}/auth/password-reset/confirm/{token_obj.token}"
        ctx = {
            'recipient_name': user.get_full_name(),
            'title': 'Password Reset Request',
            'message': 'Click the button below to reset your password. This link expires in 1 hour.',
            'link': reset_url,
        }
        html = render_to_string('emails/notification.html', ctx)
        send_mail(
            subject='Student Hub — Password Reset',
            message='',
            html_message=html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

    return Response({'detail': 'If an account exists with that email, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Reset password using the token from email."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        token_obj = PasswordResetToken.objects.get(
            token=serializer.validated_data['token'],
            is_used=False,
        )
    except PasswordResetToken.DoesNotExist:
        return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)

    # Token expires after 1 hour
    if timezone.now() > token_obj.created_at + timedelta(hours=1):
        return Response({'detail': 'This reset link has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    user = token_obj.user
    user.set_password(serializer.validated_data['new_password'])
    user.save()
    token_obj.is_used = True
    token_obj.save()

    return Response({'detail': 'Password reset successful. You can now log in.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def password_change(request):
    """Change password for authenticated user (also handles force_password_change flow)."""
    serializer = PasswordChangeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(serializer.validated_data['old_password']):
        return Response({'old_password': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.force_password_change = False
    user.save()

    return Response({'detail': 'Password changed successfully.'})


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get or update the current authenticated user's profile."""
    user = request.user
    if request.method == 'GET':
        return Response(UserSerializer(user).data)

    serializer = UserUpdateSerializer(user, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(UserSerializer(user).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_stats(request):
    """Public landing page statistics — no authentication required."""
    from apps.assignments.models import Assignment
    from apps.pedagogique.models import Major
    return Response({
        'total_students': CustomUser.objects.filter(role='STUDENT', is_active=True).count(),
        'total_professors': CustomUser.objects.filter(role='PROFESSOR', is_active=True).count(),
        'total_assignments': Assignment.objects.count(),
        'total_majors': Major.objects.count(),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """Refresh the access token using the refresh cookie or body token."""
    refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH']) or \
                    request.data.get('refresh')
    if not refresh_token:
        return Response({'detail': 'Refresh token not provided.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        token = RefreshToken(refresh_token)
        access = str(token.access_token)
        response = Response({'access': access})
        response.set_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE'],
            value=access,
            httponly=True,
            secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
            samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        )
        return response
    except TokenError as e:
        return Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
