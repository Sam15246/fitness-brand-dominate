"""
Abstract base class for storage implementations.

Defines the interface that all storage backends must implement.
This ensures LocalStorage and R2Storage have identical method signatures,
making them fully interchangeable.
"""

from abc import ABC, abstractmethod
from werkzeug.datastructures import FileStorage


class BaseStorage(ABC):
    """
    Abstract base storage class.

    All storage implementations (LocalStorage, R2Storage) must inherit from this
    and implement all abstract methods.

    INTERFACE CONTRACTS:
    ====================
    - All methods must handle errors gracefully
    - URLs returned must be accessible to end users
    - Filenames must be unique (use UUID in implementation)
    - No method should store raw filenames or trust user input
    - Image processing always happens before upload (never in storage layer)
    """

    @abstractmethod
    def upload(self, file_obj: FileStorage, filename: str) -> dict:
        """
        Upload a file to storage.

        Args:
            file_obj (FileStorage): Werkzeug FileStorage object from request
            filename (str): UUID-based filename (NOT user-supplied name)

        Returns:
            dict: {
                'success': bool,
                'error': str (if failed),
                'url': str (public URL or relative path),
                'storage_path': str (internal storage path, for deletion)
            }

        IMPLEMENTATION NOTES:
        - LocalStorage: Returns relative path like 'static/uploads/products/uuid.webp'
        - R2Storage: Returns full URL like 'https://r2.example.com/products/uuid.webp'
        - Both must work with HTML <img src="...">
        """
        pass

    @abstractmethod
    def delete(self, storage_path: str) -> dict:
        """
        Delete a file from storage.

        Args:
            storage_path (str): Storage-specific path returned by upload()

        Returns:
            dict: {
                'success': bool,
                'error': str (if failed)
            }

        IMPLEMENTATION NOTES:
        - Should not raise exceptions (return error dict instead)
        - Should handle missing files gracefully
        - Must work for both original and thumbnail versions
        """
        pass

    @abstractmethod
    def get_url(self, storage_path: str) -> str:
        """
        Get public URL for a file in storage.

        Args:
            storage_path (str): Storage-specific path returned by upload()

        Returns:
            str: Public URL accessible to users

        IMPLEMENTATION NOTES:
        - LocalStorage: Returns relative path unchanged
        - R2Storage: Constructs full URL from bucket and filename
        """
        pass

    def validate_config(self) -> tuple[bool, str]:
        """
        Validate that required configuration is present.

        Returns:
            tuple: (is_valid: bool, error_message: str)

        IMPLEMENTATION NOTES:
        - LocalStorage: Always valid (filesystem always available)
        - R2Storage: Check for required environment variables
        """
        return True, ""
