"""
Local filesystem storage implementation.

Saves images to /app/static/uploads/ directory.
Perfect for immediate launch without external dependencies.

DIRECTORY STRUCTURE:
====================
/app/static/uploads/
├── products/
│   ├── original/
│   │   └── uuid-based-filename.webp
│   └── thumbnails/
│       └── uuid-based-filename.webp

FILES CREATED:
- Original: Full-size image (max 1200px width, WebP format)
- Thumbnail: Small preview (300px width, WebP format)

MIGRATION TO R2:
================
When switching to R2:
1. Set STORAGE_BACKEND=r2
2. New uploads use R2
3. Existing local files can be batch-migrated with a script
4. Relative paths continue working if served by local backup
5. Gradual migration possible without downtime
"""

import os
import uuid
from pathlib import Path
from flask import current_app
from werkzeug.datastructures import FileStorage

from app.storage.base import BaseStorage
from app.utils.image_processor import process_image


class LocalStorage(BaseStorage):
    """
    Local filesystem storage backend.

    Stores images in /app/static/uploads/ with automatic directory creation.
    Relative URLs work out-of-the-box with Flask's static file serving.
    """

    def __init__(self):
        """Initialize LocalStorage with directory paths."""
        self.base_path = self._get_base_path()
        self.uploads_dir = os.path.join(self.base_path, 'static', 'uploads', 'products')
        self.original_dir = os.path.join(self.uploads_dir, 'original')
        self.thumbnail_dir = os.path.join(self.uploads_dir, 'thumbnails')

        # Create directories if they don't exist
        self._ensure_directories()

    @staticmethod
    def _get_base_path() -> str:
        """
        Get Flask app base path.

        Returns:
            str: Absolute path to Flask app directory

        NOTES:
        - Uses current_app.root_path (correct for Flask)
        - Fallback to app directory in project
        - All static files saved under /app/static/
        """
        if current_app:
            return current_app.root_path

        # Fallback for scripts
        return os.path.join(os.getcwd(), 'app')

    def _ensure_directories(self):
        """Create upload directories if they don't exist."""
        os.makedirs(self.original_dir, exist_ok=True)
        os.makedirs(self.thumbnail_dir, exist_ok=True)

    def upload(self, file_obj: FileStorage, filename: str) -> dict:
        """
        Upload and process image to local filesystem.

        Args:
            file_obj (FileStorage): Uploaded file object
            filename (str): UUID-based filename (e.g., 'uuid.webp')

        Returns:
            dict: {
                'success': bool,
                'error': str,
                'url': str (relative path for local storage),
                'storage_path': str (path for deletion)
            }

        FLOW:
        1. Process image (resize, convert to WebP)
        2. Generate thumbnail
        3. Save both to disk
        4. Return relative URLs
        """
        try:
            # Process image (returns PIL Image objects)
            result = process_image(file_obj, filename)

            if not result['success']:
                return {
                    'success': False,
                    'error': result['error'],
                    'url': None,
                    'storage_path': None
                }

            original_image = result['original_image']
            thumbnail_image = result['thumbnail_image']
            final_filename = result['filename']  # WebP filename

            # Save original image
            original_path = os.path.join(self.original_dir, final_filename)
            original_image.save(original_path, 'WEBP', quality=80, method=6)

            # Save thumbnail
            thumbnail_path = os.path.join(self.thumbnail_dir, final_filename)
            thumbnail_image.save(thumbnail_path, 'WEBP', quality=75, method=6)

            # Return relative paths (work with Flask static file serving)
            relative_original = \
                (Path('static') / 'uploads' / 'products' / 'original' / final_filename).as_posix()
            relative_storage = \
                (Path('static') / 'uploads' / 'products' / 'original' / final_filename).as_posix()

            # For CLI/script usage, store full path
            full_url = relative_original

            return {
                'success': True,
                'error': None,
                'url': full_url,  # Relative path - Flask serves from /static/
                'storage_path': relative_storage
            }

        except Exception as e:
            current_app.logger.error(f'LocalStorage upload error: {str(e)}')
            return {
                'success': False,
                'error': f'Failed to save image: {str(e)}',
                'url': None,
                'storage_path': None
            }

    def delete(self, storage_path: str) -> dict:
        """
        Delete image files from filesystem.

        Args:
            storage_path (str): Relative path returned by upload()

        Returns:
            dict: {'success': bool, 'error': str}

        NOTES:
        - Silently ignores missing files (safe for retries)
        - Tries to delete both original and thumbnail
        """
        try:
            base_path = self._get_base_path()

            # Extract filename from relative path
            # e.g., 'static/uploads/products/original/uuid.webp' → 'uuid.webp'
            filename = Path(storage_path).name

            original_path = os.path.join(self.original_dir, filename)
            thumbnail_path = os.path.join(self.thumbnail_dir, filename)

            # Delete if files exist (no error if missing)
            if os.path.exists(original_path):
                os.remove(original_path)

            if os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)

            return {'success': True, 'error': None}

        except Exception as e:
            error_msg = f'Failed to delete image: {str(e)}'
            current_app.logger.error(f'LocalStorage delete error: {error_msg}')
            return {'success': False, 'error': error_msg}

    def get_url(self, storage_path: str) -> str:
        """
        Get public URL for a file.

        Args:
            storage_path (str): Relative path returned by upload()

        Returns:
            str: URL accessible to browser

        NOTES:
        - For LocalStorage, just returns the path unchanged
        - Flask automatically serves /static/ URLs
        """
        return storage_path

    def validate_config(self) -> tuple:
        """
        Validate LocalStorage configuration.

        Returns:
            tuple: (True, "") - LocalStorage is always valid

        NOTES:
        - LocalStorage doesn't require any configuration
        - Filesystem access is always available in Flask app
        - Only R2Storage needs credential validation
        """
        return True, ""
