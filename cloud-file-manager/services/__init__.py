"""
Services module for Cloud-Based File Handling and Duplication Removal Using MD5.
"""

from .hashing import calculate_md5, calculate_sha256, verify_content_match, get_content_fingerprint
from .cloud_storage import SupabaseStorageService, CloudStorageService, LocalStorageService, get_storage_service
from .database_service import DatabaseService, LocalDatabaseService, get_database_service
from .file_service import FileManagementService
from .analytics import AnalyticsService
from .auth_service import AuthService

__all__ = [
    "calculate_md5",
    "calculate_sha256",
    "verify_content_match",
    "get_content_fingerprint",
    "SupabaseStorageService",
    "CloudStorageService",
    "LocalStorageService",
    "get_storage_service",
    "DatabaseService",
    "LocalDatabaseService",
    "get_database_service",
    "FileManagementService",
    "AnalyticsService",
    "AuthService",
]
