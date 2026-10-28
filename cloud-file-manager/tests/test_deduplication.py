"""
Unit tests for MD5 Deduplication Engine and Reference Counting.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.file_service import FileManagementService
from services.cloud_storage import LocalStorageService
from services.database_service import LocalDatabaseService


class TestDeduplication(unittest.TestCase):
    """Verifies single-instance persistence, duplicate detection, and reference counts."""

    def setUp(self):
        self.db = LocalDatabaseService()
        self.storage = LocalStorageService(base_directory="local_storage_test")
        self.service = FileManagementService(self.db, self.storage)
        self.owner_id = "user-test-owner-01"

    def tearDown(self):
        # Cleanup test directory
        if os.path.exists("local_storage_test"):
            import shutil
            shutil.rmtree("local_storage_test", ignore_errors=True)

    def test_repeated_upload_creates_single_stored_copy(self):
        """The same content uploaded repeatedly must not create additional stored copies."""
        content = b"IDENTICAL_FILE_PAYLOAD_CONTENT_FOR_TESTING"
        
        # 1st upload
        res1 = self.service.process_file_upload(self.owner_id, "doc1.txt", content)
        self.assertEqual(res1["status"], "NEW_UPLOAD")
        self.assertFalse(res1["is_duplicate"])
        self.assertEqual(res1["reference_count"], 1)
        self.assertEqual(len(self.db.file_contents), 1)

        # 2nd upload (same content, different filename)
        res2 = self.service.process_file_upload(self.owner_id, "doc1_copy.txt", content)
        self.assertEqual(res2["status"], "DUPLICATE_DETECTED")
        self.assertTrue(res2["is_duplicate"])
        self.assertEqual(res2["reference_count"], 2)
        # Database physical content table still has only 1 entry!
        self.assertEqual(len(self.db.file_contents), 1)
        # User logical files table has 2 references!
        self.assertEqual(len(self.db.user_files), 2)
        # Content IDs match
        self.assertEqual(res1["content_id"], res2["content_id"])

        # 3rd upload (same content again)
        res3 = self.service.process_file_upload(self.owner_id, "doc1_renamed.pdf", content)
        self.assertEqual(res3["status"], "DUPLICATE_DETECTED")
        self.assertEqual(res3["reference_count"], 3)
        self.assertEqual(len(self.db.file_contents), 1)
        self.assertEqual(len(self.db.user_files), 3)

    def test_different_content_creates_separate_stored_object(self):
        """Different content creates a separate stored object."""
        c1 = b"FIRST_FILE_CONTENT"
        c2 = b"SECOND_DIFFERENT_FILE_CONTENT"

        res1 = self.service.process_file_upload(self.owner_id, "file1.txt", c1)
        res2 = self.service.process_file_upload(self.owner_id, "file2.txt", c2)

        self.assertEqual(res1["status"], "NEW_UPLOAD")
        self.assertEqual(res2["status"], "NEW_UPLOAD")
        self.assertNotEqual(res1["content_id"], res2["content_id"])
        self.assertEqual(len(self.db.file_contents), 2)

    def test_empty_files_rejected(self):
        """Empty files (0 bytes) must be rejected with ValueError."""
        with self.assertRaises(ValueError):
            self.service.process_file_upload(self.owner_id, "empty.txt", b"")

    def test_oversized_file_rejected(self):
        """Files exceeding max size limit must be rejected."""
        strict_service = FileManagementService(self.db, self.storage, max_size_mb=1)
        big_content = b"X" * (2 * 1024 * 1024) # 2 MB
        with self.assertRaises(ValueError):
            strict_service.process_file_upload(self.owner_id, "big.bin", big_content)


if __name__ == "__main__":
    unittest.main()
