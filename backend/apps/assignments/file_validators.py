"""
File validation utilities — enforced on all uploads (assignment and submission files).
"""

import os
from django.conf import settings
from rest_framework.exceptions import ValidationError

MAX_SIZE = 10 * 1024 * 1024  # 10 MB (Cloudinary free plan limit)

EXTENSION_TO_TYPE = {
    '.pdf': 'pdf',
    '.xlsx': 'excel',
    '.xls': 'excel',
    '.pptx': 'pptx',
    '.zip': 'zip',
}


def validate_uploaded_file(uploaded_file):
    """
    Validates a file by extension and size.
    Returns the normalized file_type string or raises ValidationError.
    """
    name = uploaded_file.name.lower()
    ext = os.path.splitext(name)[1]

    if ext not in EXTENSION_TO_TYPE:
        raise ValidationError(
            f'File type "{ext}" is not allowed. Allowed: PDF, XLSX, XLS, PPTX, ZIP.'
        )

    content_type = (getattr(uploaded_file, 'content_type', '') or '').lower()
    allowed_mime_types = [m.lower() for m in getattr(settings, 'ALLOWED_MIME_TYPES', [])]
    # application/octet-stream is the generic binary type reported by some browsers/OS
    # combinations (e.g. Chrome on Windows for .zip and .xlsx).  Extension check above
    # is already sufficient; rejecting this type would block valid uploads.
    if content_type and allowed_mime_types and content_type not in allowed_mime_types and content_type != 'application/octet-stream':
        raise ValidationError(
            f'MIME type "{content_type}" is not allowed for uploaded files.'
        )

    if uploaded_file.size > MAX_SIZE:
        raise ValidationError('File size exceeds the 10 MB limit.')

    return EXTENSION_TO_TYPE[ext]
