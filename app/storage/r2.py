"""
Cloudflare R2 storage implementation.

Uses boto3 (S3-compatible API) to store images in Cloudflare R2.
Provides unlimited storage with pay-as-you-go pricing.

SETUP REQUIREMENTS:
===================
1. Create Cloudflare R2 bucket (e.g., 'fitness-brand-images')
2. Generate API token with R2 permissions
3. Set environment variables:
   - R2_ACCESS_KEY: API token key
   - R2_SECRET_KEY: API token secret
   - R2_BUCKET_NAME: Bucket name
   - R2_ENDPOINT_URL: R2 endpoint (e.g., https://xxx.r2.cloudflarestorage.com)
   - R2_PUBLIC_URL: Public URL (e.g., https://images.example.com)

WHEN TO USE R2:
===============
- Database becomes bottleneck for local file storage
- High-traffic site needing CDN caching
- Multi-region deployment
- Automatic backups and versioning needed
- Need to scale beyond single server

SEAMLESS MIGRATION:
===================
1. Set STORAGE_BACKEND=r2 in environment
2. New uploads automatically go to R2
3. Old local files still accessible (gradually migrate or keep backup)
4. No code changes needed
5. No database schema changes

COST CONSIDERATIONS:
====================
- R2 provides 10GB free storage per month
- $0.015 per GB for storage over 10GB
- $0.20 per million read requests
- $0.04 per million write requests
- Outbound is FREE (unlike AWS S3)

Better than AWS S3 for image serving.
"""

import os
import uuid
from werkzeug.datastructures import FileStorage
from flask import current_app

from app.storage.base import BaseStorage
from app.utils.image_processor import process_image


class R2Storage(BaseStorage):
    """
    Cloudflare R2 storage backend using boto3.

    Uploads processed images to R2 bucket with unique filenames.
    Returns public URLs for accessing uploaded files.

    REQUIRES:
    - boto3 library (pip install boto3)
    - Valid R2 credentials in environment
    """

    def __init__(self):
        """
        Initialize R2Storage with credentials.

        Credentials loaded from environment variables:
        - R2_ACCESS_KEY
        - R2_SECRET_KEY
        - R2_BUCKET_NAME
        - R2_ENDPOINT_URL
        - R2_PUBLIC_URL

        LAZY INITIALIZATION:
        boto3 client not created until first upload (safe for imports).
        """
        self.access_key = os.getenv('R2_ACCESS_KEY')
        self.secret_key = os.getenv('R2_SECRET_KEY')
        self.bucket_name = os.getenv('R2_BUCKET_NAME')
        self.endpoint_url = os.getenv('R2_ENDPOINT_URL')
        self.public_url = os.getenv('R2_PUBLIC_URL')

        self.s3_client = None  # Lazy init
        self._validated = False

    def _get_client(self):
        """
        Get or create boto3 S3 client for R2.

        Returns:
            boto3.client: S3 client configured for R2

        NOTES:
        - Creates client on first call
        - Credentials from environment
        - Uses R2 endpoint (S3-compatible API)
        """
        if self.s3_client is None:
            try:
                import boto3
            except ImportError:
                raise RuntimeError(
                    'boto3 is required for R2 storage. '
                    'Install with: pip install boto3'
                )

            is_valid, error = self.validate_config()
            if not is_valid:
                raise RuntimeError(f'R2 configuration invalid: {error}')

            self.s3_client = boto3.client(
                's3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name='auto'  # Cloudflare auto-detects region
            )

        return self.s3_client

    def upload(self, file_obj: FileStorage, filename: str) -> dict:
        """
        Upload processed image to R2 bucket.

        Args:
            file_obj (FileStorage): Processed file (pre-resized)
            filename (str): UUID-based filename with extension

        Returns:
            dict: {
                'success': bool,
                'error': str,
                'url': str (public R2 URL),
                'storage_path': str (bucket path for deletion)
            }

        FLOW:
        1. Process image (resize, convert to WebP)
        2. Upload original to R2: products/original/{uuid}.webp
        3. Upload thumbnail to R2: products/thumbnails/{uuid}.webp
        4. Return public URLs
        5. Store bucket paths for deletion
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

            client = self._get_client()

            # Upload original image
            original_key = f'products/original/{final_filename}'
            self._upload_image_to_r2(client, original_image, original_key)

            # Upload thumbnail
            thumbnail_key = f'products/thumbnails/{final_filename}'
            self._upload_image_to_r2(client, thumbnail_image, thumbnail_key)

            # Construct public URL
            # public_url format: https://r2bucket.example.com
            public_url = f'{self.public_url}/{original_key}'

            return {
                'success': True,
                'error': None,
                'url': public_url,
                'storage_path': original_key  # Store key for deletion
            }

        except Exception as e:
            error_msg = f'R2 upload failed: {str(e)}'
            current_app.logger.error(f'R2Storage upload error: {error_msg}')
            return {
                'success': False,
                'error': error_msg,
                'url': None,
                'storage_path': None
            }

    def _upload_image_to_r2(self, client, image, key: str):
        """
        Upload PIL Image to R2 bucket.

        Args:
            client: boto3 S3 client
            image: PIL Image object
            key (str): S3 object key (path in bucket)

        NOTES:
        - Converts image to bytes in memory
        - Sets appropriate content type
        - Uses WEBP format
        """
        import io

        # Convert PIL Image to bytes
        image_bytes = io.BytesIO()
        image.save(image_bytes, 'WEBP', quality=80, method=6)
        image_bytes.seek(0)

        # Upload to R2
        client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=image_bytes,
            ContentType='image/webp',
            CacheControl='public, max-age=31536000'  # Cache 1 year
        )

    def delete(self, storage_path: str) -> dict:
        """
        Delete image from R2 bucket.

        Args:
            storage_path (str): Bucket key returned by upload()

        Returns:
            dict: {'success': bool, 'error': str}

        NOTES:
        - Deletes original image
        - Also deletes thumbnail version
        """
        try:
            client = self._get_client()
            filename = storage_path.split('/')[-1]

            # Delete original
            original_key = f'products/original/{filename}'
            client.delete_object(Bucket=self.bucket_name, Key=original_key)

            # Delete thumbnail
            thumbnail_key = f'products/thumbnails/{filename}'
            client.delete_object(Bucket=self.bucket_name, Key=thumbnail_key)

            return {'success': True, 'error': None}

        except Exception as e:
            error_msg = f'R2 delete failed: {str(e)}'
            current_app.logger.error(f'R2Storage delete error: {error_msg}')
            return {'success': False, 'error': error_msg}

    def get_url(self, storage_path: str) -> str:
        """
        Get public URL for R2 object.

        Args:
            storage_path (str): Bucket key

        Returns:
            str: Public URL

        NOTES:
        - Constructs public URL from public_url + storage_path
        """
        return f'{self.public_url}/{storage_path}'

    def validate_config(self) -> tuple:
        """
        Validate R2 configuration.

        Returns:
            tuple: (is_valid: bool, error_message: str)

        CHECKS:
        - All required environment variables present
        - Credentials not empty
        - Bucket name set
        """
        if not self.access_key:
            return False, 'R2_ACCESS_KEY not set'

        if not self.secret_key:
            return False, 'R2_SECRET_KEY not set'

        if not self.bucket_name:
            return False, 'R2_BUCKET_NAME not set'

        if not self.endpoint_url:
            return False, 'R2_ENDPOINT_URL not set'

        if not self.public_url:
            return False, 'R2_PUBLIC_URL not set'

        return True, ""
