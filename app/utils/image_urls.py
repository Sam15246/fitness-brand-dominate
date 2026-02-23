"""
Image URL helpers for storage-agnostic templates.

Resolves local /static paths and full cloud URLs consistently.
"""

from flask import url_for


def _normalize_path(path: str) -> str:
    return path.replace('\\', '/').strip()


def resolve_image_url(path: str, size: str = 'original') -> str | None:
    """
    Resolve a product image path into a browser-accessible URL.

    Supports:
    - Full URLs (R2/CDN)
    - Local paths under /static

    Args:
        path: Stored image path or URL
        size: 'original' or 'thumbnail'

    Returns:
        Resolved URL string or None if path is empty
    """
    if not path:
        return None

    normalized = _normalize_path(path)

    if size == 'thumbnail':
        normalized = normalized.replace('/original/', '/thumbnails/')
        normalized = normalized.replace('/original', '/thumbnails')

    if normalized.startswith('http://') or normalized.startswith('https://'):
        return normalized

    normalized = normalized.lstrip('/')
    if normalized.startswith('static/'):
        normalized = normalized[len('static/'):]

    return url_for('static', filename=normalized)


def resolve_image_thumbnail_url(path: str) -> str | None:
    """Convenience wrapper for thumbnail URLs."""
    return resolve_image_url(path, size='thumbnail')
