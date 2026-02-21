"""
Image upload and processing utilities for product images.

ARCHITECTURE:
=============
This module handles local filesystem storage. It's designed to be swappable
with cloud storage (S3/R2) without changing the database schema or routes.

MIGRATION PATH TO S3/R2:
=======================
1. Create new ImageStorageS3 class with same interface
2. Update create_image_upload() to check config and instantiate appropriate class
3. Database remains unchanged (image_path can store full URL)
4. No route changes needed
5. Gradual migration of existing images

USAGE:
======
from app.utils.image_handler import ImageUploadHandler

handler = ImageUploadHandler()
result = handler.save_upload(file_obj, product_id)
if result['success']:
    # Access result['original_path'] and result['thumbnail_path']
    pass

DEPRECATION NOTE:
=================
This module is now superseded by app/storage/ (pluggable storage system).
Kept for backwards compatibility. New code should use:
    from app.storage import get_storage
    storage = get_storage()
    result = storage.upload(file_obj, filename)
"""

import os
import uuid
from pathlib import Path
from PIL import Image
from werkzeug.utils import secure_filename
from flask import current_app

# Configuration
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'}
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_IMAGE_WIDTH = 1000
THUMBNAIL_WIDTH = 300


def _register_heif_support():
    """Register HEIF/HEIC support for Pillow (lazy import)."""
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener()
    except ImportError:
        pass  # pillow-heif not installed, HEIF won't work but other formats do



class ImageUploadError(Exception):
    """Custom exception for image upload errors."""
    pass


class ImageUploadHandler:
    """
    Local filesystem image upload handler.
    
    Handles:
    - File validation (type, size)
    - Image resizing (max 1000px width)
    - Thumbnail generation (300px width)
    - UUID-based unique filenames
    - Directory management
    
    Cloud Migration Notes:
    - Replace this class with ImageUploadHandlerS3
    - Keep the same method signatures and return format
    - Database queries remain unchanged
    """
    
    def __init__(self):
        """Initialize image handler."""
        _register_heif_support()
        self.base_path = self._get_base_path()
        self.original_dir = os.path.join(self.base_path, 'static', 'images', 'original')
        self.thumbnail_dir = os.path.join(self.base_path, 'static', 'images', 'thumbnails')
        self._ensure_directories()
    
    @staticmethod
    def _get_base_path():
        """Get base path for image storage."""
        # For Flask app, use the app root so files are saved under app/static
        if current_app:
            return current_app.root_path
        # Fallback: assume script is run from project root and static lives in app/
        return os.path.join(os.getcwd(), 'app')
    
    def _ensure_directories(self):
        """Create image directories if they don't exist."""
        os.makedirs(self.original_dir, exist_ok=True)
        os.makedirs(self.thumbnail_dir, exist_ok=True)
    
    def _validate_file(self, file_obj):
        """
        Validate uploaded file.
        
        Args:
            file_obj: File object from request
            
        Raises:
            ImageUploadError: If validation fails
        """
        if not file_obj or file_obj.filename == '':
            raise ImageUploadError('No file provided')
        
        # Check file extension
        filename = secure_filename(file_obj.filename)
        if '.' not in filename:
            raise ImageUploadError('File has no extension')
        
        ext = filename.rsplit('.', 1)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ImageUploadError(f'Invalid file type: {ext}. Allowed: {", ".join(ALLOWED_EXTENSIONS)}')
        
        # Check file size (before reading fully)
        file_obj.seek(0, os.SEEK_END)
        size = file_obj.tell()
        file_obj.seek(0)
        
        if size > MAX_FILE_SIZE_BYTES:
            raise ImageUploadError(f'File too large: {size / 1024 / 1024:.1f}MB. Maximum: {MAX_FILE_SIZE_MB}MB')
        
        # Try to open as image to validate it's actually an image
        try:
            img = Image.open(file_obj)
            img.verify()
            file_obj.seek(0)  # Reset after verify
        except Exception as e:
            raise ImageUploadError(f'Invalid image file: {str(e)}')
    
    def _resize_image(self, image, max_width):
        """
        Resize image to max width while maintaining aspect ratio.
        
        Args:
            image: PIL Image object
            max_width: Maximum width in pixels
            
        Returns:
            PIL Image object (resized)
        """
        width, height = image.size
        
        if width > max_width:
            # Calculate new height maintaining aspect ratio
            ratio = max_width / width
            new_height = int(height * ratio)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        
        return image
    
    def save_upload(self, file_obj, product_id):
        """
        Save uploaded file as original and generate thumbnail.
        
        Args:
            file_obj: FileStorage object from request
            product_id: Product ID for reference
            
        Returns:
            dict: {
                'success': bool,
                'error': str (if failed),
                'original_path': str (relative path from project root),
                'thumbnail_path': str (relative path from project root),
                'filename': str (uuid-based filename)
            }
        """
        try:
            # Validate file
            self._validate_file(file_obj)
            
            # Generate unique filename
            file_ext = secure_filename(file_obj.filename).rsplit('.', 1)[1].lower()
            unique_filename = f'{uuid.uuid4()}.{file_ext}'
            
            # Open and process image
            file_obj.seek(0)
            image = Image.open(file_obj)
            
            # Convert RGBA to RGB if necessary (for JPEG compatibility)
            if image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = rgb_image
            
            # Save original (resized to max 1000px)
            original_image = self._resize_image(image, MAX_IMAGE_WIDTH)
            original_path = os.path.join(self.original_dir, unique_filename)
            original_image.save(original_path, quality=85, optimize=True)
            
            # Generate and save thumbnail (300px)
            thumbnail_image = self._resize_image(image, THUMBNAIL_WIDTH)
            thumbnail_path = os.path.join(self.thumbnail_dir, unique_filename)
            thumbnail_image.save(thumbnail_path, quality=80, optimize=True)
            
            # Return relative paths from project root (use POSIX separators)
            original_relative = (Path('static') / 'images' / 'original' / unique_filename).as_posix()
            thumbnail_relative = (Path('static') / 'images' / 'thumbnails' / unique_filename).as_posix()
            
            return {
                'success': True,
                'error': None,
                'original_path': original_relative,
                'thumbnail_path': thumbnail_relative,
                'filename': unique_filename
            }
        
        except ImageUploadError as e:
            return {
                'success': False,
                'error': str(e),
                'original_path': None,
                'thumbnail_path': None,
                'filename': None
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'original_path': None,
                'thumbnail_path': None,
                'filename': None
            }
    
    @staticmethod
    def delete_image_files(original_path, thumbnail_path):
        """
        Delete image files from filesystem.
        
        Safe deletion - ignores errors if files don't exist.
        
        Args:
            original_path: Relative path to original image
            thumbnail_path: Relative path to thumbnail
            
        Returns:
            tuple: (success, error_message)
        """
        base_path = ImageUploadHandler._get_base_path()
        
        # Convert relative paths to absolute
        original_full = os.path.join(base_path, original_path)
        thumbnail_full = os.path.join(base_path, thumbnail_path)
        
        try:
            if os.path.exists(original_full):
                os.remove(original_full)
            if os.path.exists(thumbnail_full):
                os.remove(thumbnail_full)
            return True, None
        except Exception as e:
            return False, str(e)


def create_image_upload():
    """
    Factory function to create appropriate image handler.
    
    FUTURE: This is where we'd check config and return S3Handler
    
    EXAMPLE FUTURE USAGE:
    =====================
    if current_app.config.get('USE_S3'):
        return ImageUploadHandlerS3(
            bucket=current_app.config['S3_BUCKET'],
            region=current_app.config['S3_REGION'],
            access_key=current_app.config['AWS_ACCESS_KEY_ID'],
            secret_key=current_app.config['AWS_SECRET_ACCESS_KEY']
        )
    
    Returns:
        ImageUploadHandler: Image handler instance
    """
    # For now, always use local filesystem
    return ImageUploadHandler()
