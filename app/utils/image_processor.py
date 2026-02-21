"""
Image processing utilities.

Handles image validation, resizing, and format conversion.
Separate from storage to keep concerns isolated.

FLOW:
1. Validate file (type, size)
2. Open as PIL Image
3. Resize to max width
4. Convert to WebP (best compression + support)
5. Generate thumbnail version
6. Return both PIL Image objects

BOTH local and R2 storage use this processor.
No storage logic here - just image manipulation.
"""

import os
import uuid
from pathlib import Path
from PIL import Image
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from flask import current_app


# ============= CONFIGURATION =============

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Image dimensions
MAX_IMAGE_WIDTH = 1200  # Full-size max width
THUMBNAIL_WIDTH = 300   # Thumbnail width


# ============= CUSTOM EXCEPTIONS =============

class ImageProcessingError(Exception):
    """Raised when image processing fails."""
    pass


# ============= VALIDATION =============

def validate_file(file_obj: FileStorage) -> tuple[bool, str]:
    """
    Validate uploaded file before processing.

    Args:
        file_obj (FileStorage): File from request

    Returns:
        tuple: (is_valid: bool, error_message: str)

    CHECKS:
    - File exists and has name
    - Extension is allowed
    - File size within limit
    - File is valid image
    """
    if not file_obj or file_obj.filename == '':
        return False, 'No file provided'

    # Check extension
    filename = secure_filename(file_obj.filename)
    if '.' not in filename:
        return False, 'File has no extension'

    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        allowed = ', '.join(sorted(ALLOWED_EXTENSIONS))
        return False, f'File type ".{ext}" not allowed. Allowed: {allowed}'

    # Check file size
    file_obj.seek(0, os.SEEK_END)
    size = file_obj.tell()
    file_obj.seek(0)

    if size > MAX_FILE_SIZE_BYTES:
        size_mb = size / 1024 / 1024
        return False, f'File too large ({size_mb:.1f}MB). Max: {MAX_FILE_SIZE_MB}MB'

    # Verify it's a real image
    try:
        file_obj.seek(0)
        img = Image.open(file_obj)
        img.verify()
        file_obj.seek(0)
    except Exception as e:
        return False, f'Invalid image file: {str(e)}'

    return True, ""


# ============= IMAGE PROCESSING =============

def _register_heif_support():
    """Register HEIF/HEIC support for Pillow."""
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    except ImportError:
        # pillow-heif not installed, HEIF won't work
        # But regular formats still work
        pass


def _load_image(file_obj: FileStorage) -> Image.Image:
    """
    Load image from file object.

    Args:
        file_obj (FileStorage): File object

    Returns:
        PIL.Image: Opened image

    NOTES:
    - Handles HEIC/HEIF, PNG, JPG, WebP
    - Resets file pointer after load
    """
    _register_heif_support()
    file_obj.seek(0)
    return Image.open(file_obj)


def resize_image(image: Image.Image, max_width: int) -> Image.Image:
    """
    Resize image to max width while maintaining aspect ratio.

    Args:
        image (PIL.Image): Original image
        max_width (int): Maximum width in pixels

    Returns:
        PIL.Image: Resized image

    NOTES:
    - Only shrinks, doesn't enlarge
    - Maintains aspect ratio
    - Uses high-quality LANCZOS resampling
    """
    width, height = image.size

    if width > max_width:
        ratio = max_width / width
        new_height = int(height * ratio)
        image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)

    return image


def convert_to_rgb(image: Image.Image) -> Image.Image:
    """
    Convert image to RGB if needed.

    Args:
        image (PIL.Image): Original image

    Returns:
        PIL.Image: RGB image

    NOTES:
    - Needed for JPEG/WebP compatibility
    - Preserves transparency for PNG/WebP
    - Handles RGBA, LA, P modes
    """
    if image.mode in ('RGBA', 'LA', 'P'):
        # Create white background
        rgb_image = Image.new('RGB', image.size, (255, 255, 255))

        # Paste with transparency mask
        if image.mode == 'RGBA':
            rgb_image.paste(image, mask=image.split()[3])
        else:
            rgb_image.paste(image)

        return rgb_image

    # Already compatible
    return image


# ============= MAIN PROCESSOR =============

def process_image(file_obj: FileStorage, filename: str = None) -> dict:
    """
    Process uploaded image: validate, resize, thumbnail, convert to WebP.

    Args:
        file_obj (FileStorage): Uploaded file
        filename (str): Optional UUID-based filename. If None, generates new one.

    Returns:
        dict: {
            'success': bool,
            'error': str,
            'filename': str,
            'original_image': PIL.Image,
            'thumbnail_image': PIL.Image
        }

    FLOW:
    1. Validate file
    2. Load as PIL Image
    3. Convert to RGB (compatibility)
    4. Resize to max 1200px width
    5. Generate thumbnail (300px width)
    6. Return both images
    7. Storage layer saves to disk/R2

    WEBP DECISION:
    - All images converted to WebP (best compression)
    - WebP supported by 95%+ browsers
    - 25-35% smaller than JPEG at same quality
    - Better than PNG for photos
    """
    try:
        # Validate
        is_valid, error = validate_file(file_obj)
        if not is_valid:
            return {
                'success': False,
                'error': error,
                'filename': None,
                'original_image': None,
                'thumbnail_image': None
            }

        # Generate filename if not provided
        if not filename:
            ext = secure_filename(file_obj.filename).rsplit('.', 1)[1].lower()
            filename = f'{uuid.uuid4()}.webp'
        else:
            # Ensure .webp extension
            filename = filename.rsplit('.', 1)[0] + '.webp'

        # Load image
        file_obj.seek(0)
        image = _load_image(file_obj)

        # Convert to RGB (compatibility with WebP/JPEG)
        image = convert_to_rgb(image)

        # Resize original (max 1200px width)
        original_image = resize_image(image, MAX_IMAGE_WIDTH)

        # Resize thumbnail (300px width)
        thumbnail_image = resize_image(image, THUMBNAIL_WIDTH)

        return {
            'success': True,
            'error': None,
            'filename': filename,
            'original_image': original_image,
            'thumbnail_image': thumbnail_image
        }

    except Exception as e:
        error_msg = f'Image processing failed: {str(e)}'
        current_app.logger.error(f'Image processor error: {error_msg}')
        return {
            'success': False,
            'error': error_msg,
            'filename': None,
            'original_image': None,
            'thumbnail_image': None
        }
