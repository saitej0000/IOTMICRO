"""
Cloud Storage Abstraction Layer for Supabase Storage and Local Development.

Provides a unified interface for storing, retrieving, and safely deleting
deduplicated content blobs using content hash identifiers.
"""

import os
import shutil
from abc import ABC, abstractmethod
from typing import Optional


class StorageProvider(ABC):
    """Abstract Base Class for Content-Addressable Storage Providers."""
    
    @abstractmethod
    def upload_content(self, owner_id: str, md5_hash: str, file_bytes: bytes) -> str:
        """Uploads physical binary content. Returns storage path."""
        pass
        
    @abstractmethod
    def download_content(self, storage_path: str) -> bytes:
        """Downloads and returns raw binary bytes from storage path."""
        pass
        
    @abstractmethod
    def delete_content(self, storage_path: str) -> bool:
        """Deletes physical object from storage. Returns True if deleted."""
        pass
        
    @abstractmethod
    def exists(self, storage_path: str) -> bool:
        """Checks if storage path exists."""
        pass


class SupabaseStorageService(StorageProvider):
    """
    Production Cloud Storage provider using Supabase Storage.
    Stores files inside private bucket under '{owner_id}/{md5_hash}'.
    """
    
    def __init__(self, supabase_client, bucket_name: str = "files"):
        self.supabase = supabase_client
        self.bucket_name = bucket_name
        self.provider_name = "Supabase Cloud Storage"

    def upload_content(self, owner_id: str, md5_hash: str, file_bytes: bytes) -> str:
        storage_path = f"{owner_id}/{md5_hash}"
        try:
            # Upsert is false by default: deduplication guarantees single write
            response = self.supabase.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"cacheControl": "3600", "upsert": "false"}
            )
            return storage_path
        except Exception as e:
            # Check if object already exists in storage
            if "Duplicate" in str(e) or "already exists" in str(e):
                return storage_path
            raise RuntimeError(f"Supabase Storage upload failed: {str(e)}")

    def download_content(self, storage_path: str) -> bytes:
        try:
            res = self.supabase.storage.from_(self.bucket_name).download(storage_path)
            return res
        except Exception as e:
            raise RuntimeError(f"Supabase Storage download failed for '{storage_path}': {str(e)}")

    def delete_content(self, storage_path: str) -> bool:
        try:
            self.supabase.storage.from_(self.bucket_name).remove([storage_path])
            return True
        except Exception as e:
            raise RuntimeError(f"Supabase Storage deletion failed for '{storage_path}': {str(e)}")

    def exists(self, storage_path: str) -> bool:
        try:
            folder, filename = os.path.split(storage_path)
            files = self.supabase.storage.from_(self.bucket_name).list(folder)
            for f in files:
                if f.get("name") == filename:
                    return True
            return False
        except Exception:
            return False


# Backward-compatible alias
CloudStorageService = SupabaseStorageService


class LocalStorageService(StorageProvider):
    """
    Local filesystem storage provider for offline college demonstrations,
    safe unit testing, and environments without active cloud credentials.
    Clearly labeled to prevent false claims of cloud connectivity.
    """
    
    def __init__(self, base_directory: str = "local_storage"):
        self.base_directory = os.path.abspath(base_directory)
        os.makedirs(self.base_directory, exist_ok=True)
        self.provider_name = "Local Demo Storage (Offline Sandbox)"

    def _resolve_path(self, storage_path: str) -> str:
        safe_path = os.path.normpath(os.path.join(self.base_directory, storage_path))
        if not safe_path.startswith(self.base_directory):
            raise ValueError("Path traversal attempt detected.")
        return safe_path

    def upload_content(self, owner_id: str, md5_hash: str, file_bytes: bytes) -> str:
        storage_path = os.path.join(owner_id, md5_hash)
        full_path = self._resolve_path(storage_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        if not os.path.exists(full_path):
            with open(full_path, "wb") as f:
                f.write(file_bytes)
        return storage_path

    def download_content(self, storage_path: str) -> bytes:
        full_path = self._resolve_path(storage_path)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Content not found at path '{storage_path}'")
        with open(full_path, "rb") as f:
            return f.read()

    def delete_content(self, storage_path: str) -> bool:
        full_path = self._resolve_path(storage_path)
        if os.path.exists(full_path):
            os.remove(full_path)
            # Clean up parent directory if empty
            parent = os.path.dirname(full_path)
            if os.path.exists(parent) and not os.listdir(parent):
                os.rmdir(parent)
            return True
        return False

    def exists(self, storage_path: str) -> bool:
        return os.path.exists(self._resolve_path(storage_path))


def get_storage_service(supabase_client=None, bucket_name: str = "files", mode: str = "local") -> StorageProvider:
    """Factory function returning configured storage service."""
    if mode == "cloud" and supabase_client is not None:
        return SupabaseStorageService(supabase_client, bucket_name)
    return LocalStorageService()
