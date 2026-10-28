"""
File Service: Core Deduplication and File Management Workflow.

Orchestrates:
1. Hash calculation & validation
2. Duplicate detection decision
3. Content-addressed storage (single-copy persistence)
4. Reference management & safe deletion with garbage collection
"""

import os
import mimetypes
from typing import Dict, Any, Optional, Tuple
from .hashing import calculate_md5, verify_content_match
from .cloud_storage import StorageProvider
from .database_service import DatabaseService, LocalDatabaseService


class FileManagementService:
    """Main business logic controller for deduplication and storage management."""

    def __init__(self, db_service, storage_service: StorageProvider, max_size_mb: int = 50):
        self.db = db_service
        self.storage = storage_service
        self.max_size_bytes = max_size_mb * 1024 * 1024

    def sanitize_filename(self, filename: str) -> str:
        """Removes dangerous path traversal or invalid characters."""
        base = os.path.basename(filename.strip())
        return base if base else "unnamed_file.bin"

    def process_file_upload(
        self,
        owner_id: str,
        filename: str,
        file_bytes: bytes,
        mime_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a file upload with MD5 deduplication.
        
        Workflow:
        1. Input validation (size, null checks).
        2. Compute MD5 from actual server-side raw bytes.
        3. Check database for existing content within owner scope.
        4. If found: reuse storage object, increment reference count, register metadata.
        5. If new: upload to cloud storage, create content record, register metadata.
        6. Audit log the event.
        """
        safe_name = self.sanitize_filename(filename)
        
        # 1. Validation
        if file_bytes is None:
            raise ValueError("File bytes cannot be None.")
            
        file_size = len(file_bytes)
        if file_size == 0:
            raise ValueError("Empty files (0 bytes) cannot be stored.")
            
        if file_size > self.max_size_bytes:
            raise ValueError(f"File size ({file_size / (1024*1024):.2f} MB) exceeds maximum allowed limit ({self.max_size_bytes / (1024*1024)} MB).")

        # Guess mime type if not provided
        if not mime_type:
            guessed, _ = mimetypes.guess_type(safe_name)
            mime_type = guessed or "application/octet-stream"

        # 2. Server-side MD5 calculation
        md5_hash = calculate_md5(file_bytes)

        # 3. Check for existing content within user's scope
        existing_content = self.db.find_content_by_hash(owner_id, md5_hash)

        if existing_content:
            # Duplicate content detected!
            content_id = existing_content["id"]
            
            # Verify file size matches (strong integrity verification)
            if existing_content["file_size"] != file_size:
                raise ValueError("Hash collision or corrupted record detected: size mismatch for identical hash.")

            # Increment reference count in database
            new_ref_count = self.db.increment_content_reference(content_id)

            # Create new user logical file reference pointing to existing content
            user_file = self.db.create_user_file(
                owner_id=owner_id,
                filename=safe_name,
                content_id=content_id,
                mime_type=mime_type,
                is_duplicate=True
            )

            # Audit log
            self.db.log_event(
                owner_id=owner_id,
                filename=safe_name,
                event_type="UPLOAD_DUPLICATE",
                file_size=file_size,
                md5_hash=md5_hash
            )

            return {
                "status": "DUPLICATE_DETECTED",
                "is_duplicate": True,
                "message": f"Duplicate content detected ({md5_hash[:8]}...). Reused existing cloud storage object.",
                "file_id": user_file["id"],
                "filename": safe_name,
                "md5_hash": md5_hash,
                "file_size": file_size,
                "bytes_uploaded_to_cloud": 0,
                "storage_saved_bytes": file_size,
                "reference_count": new_ref_count,
                "content_id": content_id
            }

        else:
            # Brand new unique content: upload to storage
            storage_path = self.storage.upload_content(owner_id, md5_hash, file_bytes)

            # Create physical content database record
            content_rec = self.db.create_content_record(
                owner_id=owner_id,
                md5_hash=md5_hash,
                file_size=file_size,
                storage_path=storage_path
            )

            # Create logical user file reference
            user_file = self.db.create_user_file(
                owner_id=owner_id,
                filename=safe_name,
                content_id=content_rec["id"],
                mime_type=mime_type,
                is_duplicate=False
            )

            # Audit log
            self.db.log_event(
                owner_id=owner_id,
                filename=safe_name,
                event_type="UPLOAD_NEW",
                file_size=file_size,
                md5_hash=md5_hash
            )

            return {
                "status": "NEW_UPLOAD",
                "is_duplicate": False,
                "message": "Unique file uploaded successfully to cloud storage.",
                "file_id": user_file["id"],
                "filename": safe_name,
                "md5_hash": md5_hash,
                "file_size": file_size,
                "bytes_uploaded_to_cloud": file_size,
                "storage_saved_bytes": 0,
                "reference_count": 1,
                "content_id": content_rec["id"]
            }

    def download_file(self, user_file_id: str, owner_id: str) -> Tuple[bytes, str, str]:
        """
        Retrieves original file content bytes, filename, and mime type.
        Returns: (file_bytes, filename, mime_type)
        """
        files = self.db.list_user_files(owner_id)
        target = next((f for f in files if f["id"] == user_file_id), None)
        if not target:
            raise FileNotFoundError("File not found or unauthorized access.")

        storage_path = target.get("storage_path") or f"{owner_id}/{target['md5_hash']}"
        file_bytes = self.storage.download_content(storage_path)

        # Integrity double-check: verify MD5 of downloaded bytes
        downloaded_hash = calculate_md5(file_bytes)
        if downloaded_hash != target["md5_hash"]:
            raise RuntimeError("Cloud storage data integrity failure: downloaded bytes hash mismatch.")

        return file_bytes, target["original_filename"], target["mime_type"]

    def rename_file(self, user_file_id: str, owner_id: str, new_filename: str) -> bool:
        """
        Renames a user file reference without modifying the underlying storage object or hash.
        """
        safe_name = self.sanitize_filename(new_filename)
        success = self.db.rename_user_file(user_file_id, owner_id, safe_name)
        if success:
            self.db.log_event(
                owner_id=owner_id,
                filename=safe_name,
                event_type="FILE_RENAMED",
                file_size=0,
                md5_hash=""
            )
        return success

    def delete_file(self, user_file_id: str, owner_id: str) -> Dict[str, Any]:
        """
        Safely deletes a user file reference.
        If this was the last reference to the stored content, purges physical storage object.
        """
        deleted_file, remaining_ref_count, content_rec = self.db.delete_user_file(user_file_id, owner_id)
        if not deleted_file:
            raise FileNotFoundError("File not found or unauthorized access.")

        filename = deleted_file.get("original_filename", "unknown")
        md5_hash = deleted_file.get("md5_hash", "")
        file_size = deleted_file.get("file_size", 0)

        self.db.log_event(
            owner_id=owner_id,
            filename=filename,
            event_type="FILE_DELETED",
            file_size=file_size,
            md5_hash=md5_hash
        )

        purged_storage = False
        if remaining_ref_count == 0 and content_rec:
            # Safe physical cleanup
            storage_path = content_rec.get("storage_path") or f"{owner_id}/{content_rec['md5_hash']}"
            try:
                self.storage.delete_content(storage_path)
                purged_storage = True
                self.db.log_event(
                    owner_id=owner_id,
                    filename=filename,
                    event_type="CONTENT_PURGED",
                    file_size=file_size,
                    md5_hash=md5_hash
                )
            except Exception as e:
                # Log storage cleanup issue without failing the user reference deletion
                purged_storage = False

        return {
            "success": True,
            "filename": filename,
            "remaining_references": remaining_ref_count,
            "storage_purged": purged_storage,
            "message": "File reference deleted." + (" Storage object purged (last reference)." if purged_storage else f" Content kept ({remaining_ref_count} other reference(s) remain).")
        }
