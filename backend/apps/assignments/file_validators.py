"""
File validation utilities — enforced on all uploads (assignment and submission files).
"""

import os
from django.conf import settings
from rest_framework.exceptions import ValidationError

MAX_SIZE = 40 * 1024 * 1024  # 40 MB

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

    if uploaded_file.size > MAX_SIZE:
        raise ValidationError('File size exceeds the 40 MB limit.')

    return EXTENSION_TO_TYPE[ext]
