"""
Storage abstraction layer for image uploads.

ARCHITECTURE:
=============
This module provides a pluggable storage system that supports:
- LocalStorage: Save files to /static/uploads/ (immediate launch)
- R2Storage: Save files to Cloudflare R2 (future migration)

SWITCHING BETWEEN STORAGE:
==========================
Set STORAGE_BACKEND environment variable:
- STORAGE_BACKEND=local (default)
- STORAGE_BACKEND=r2 (when R2 credentials are configured)

NO CODE CHANGES REQUIRED when switching backends.
The factory function get_storage() returns the appropriate implementation.

MIGRATION PATH:
===============
1. Launch with local storage (no R2 setup required)
2. When ready to scale, set up Cloudflare R2 bucket and credentials
3. Change STORAGE_BACKEND=r2 in environment
4. New uploads go to R2 automatically
5. Create migration script to batch upload existing images to R2
6. Update database URLs to point to R2 (or R2 URLs work from anywhere)
"""

from app.storage.base import BaseStorage
from app.storage.local import LocalStorage
from app.storage.r2 import R2Storage


def get_storage() -> BaseStorage:
    """
    Factory function to get appropriate storage implementation.

    Returns:
        BaseStorage: Storage instance (LocalStorage or R2Storage)

    ENVIRONMENT VARIABLES:
        STORAGE_BACKEND: 'local' (default) or 'r2'

    SELECTION LOGIC:
        - If STORAGE_BACKEND='r2' and R2 credentials present → R2Storage
        - Otherwise → LocalStorage (safe default)
    """
    from flask import current_app

    backend = current_app.config.get('STORAGE_BACKEND', 'local').lower()

    if backend == 'r2':
        return R2Storage()
    else:
        return LocalStorage()


__all__ = ['BaseStorage', 'LocalStorage', 'R2Storage', 'get_storage']
