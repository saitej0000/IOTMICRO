"""
Unit tests for File Management: Download, Rename, Delete Reference, and Last-Reference Cleanup.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.file_service import FileManagementService
from services.cloud_storage import LocalStorageService
from services.database_service import LocalDatabaseService


class TestFileManagement(unittest.TestCase):
    """Verifies lifecycle actions: rename, download, multi-reference delete, and final cleanup."""

    def setUp(self):
        self.db = LocalDatabaseService()
        self.storage = LocalStorageService(base_directory="local_storage_mgmt_test")
        self.service = FileManagementService(self.db, self.storage)
        self.user_a = "user-alice-01"
        self.user_b = "user-bob-02"

    def tearDown(self):
        if os.path.exists("local_storage_mgmt_test"):
            import shutil
            shutil.rmtree("local_storage_mgmt_test", ignore_errors=True)

    def test_download_returns_original_bytes(self):
        """Download must return exact original bytes."""
        original = b"CONFIDENTIAL_IOT_LAB_TEST_METRICS_DATA_12345"
        upload_res = self.service.process_file_upload(self.user_a, "lab_notes.txt", original)
        
        downloaded_bytes, filename, mime = self.service.download_file(upload_res["file_id"], self.user_a)
        self.assertEqual(downloaded_bytes, original)
        self.assertEqual(filename, "lab_notes.txt")

    def test_rename_preserves_content_and_hash(self):
        """Renaming a logical file entry must not alter stored content or MD5 hash."""
        original = b"DATA_TO_RENAME_IN_DASHBOARD"
        upload_res = self.service.process_file_upload(self.user_a, "draft.txt", original)
        orig_hash = upload_res["md5_hash"]

        renamed = self.service.rename_file(upload_res["file_id"], self.user_a, "final_report.txt")
        self.assertTrue(renamed)

        # Verify in list
        files = self.db.list_user_files(self.user_a)
        target = next(f for f in files if f["id"] == upload_res["file_id"])
        self.assertEqual(target["original_filename"], "final_report.txt")
        self.assertEqual(target["md5_hash"], orig_hash)

    def test_delete_one_reference_preserves_shared_content(self):
        """Deleting one reference must keep underlying content if other references exist."""
        shared_bytes = b"SHARED_COMPANY_POLICY_DOCUMENT_V1"
        
        # Two references to identical content
        ref1 = self.service.process_file_upload(self.user_a, "policy_hr.pdf", shared_bytes)
        ref2 = self.service.process_file_upload(self.user_a, "policy_engineering.pdf", shared_bytes)

        # Delete ref1
        del_res = self.service.delete_file(ref1["file_id"], self.user_a)
        self.assertTrue(del_res["success"])
        self.assertFalse(del_res["storage_purged"])
        self.assertEqual(del_res["remaining_references"], 1)

        # Ensure content is still intact and downloadable via ref2!
        bytes_from_ref2, _, _ = self.service.download_file(ref2["file_id"], self.user_a)
        self.assertEqual(bytes_from_ref2, shared_bytes)

    def test_deleting_last_reference_purges_storage(self):
        """Deleting the final remaining reference triggers physical content garbage collection."""
        single_bytes = b"TEMPORARY_LOG_REQUIRING_CLEANUP"
        ref = self.service.process_file_upload(self.user_a, "temp.log", single_bytes)

        # Storage object should exist
        storage_path = f"{self.user_a}/{ref['md5_hash']}"
        self.assertTrue(self.storage.exists(storage_path))

        # Delete the only reference
        del_res = self.service.delete_file(ref["file_id"], self.user_a)
        self.assertTrue(del_res["success"])
        self.assertTrue(del_res["storage_purged"])
        self.assertEqual(del_res["remaining_references"], 0)

        # Physical object must now be purged
        self.assertFalse(self.storage.exists(storage_path))

    def test_cross_user_isolation(self):
        """User cannot access or delete files belonging to another user."""
        file_a = self.service.process_file_upload(self.user_a, "alice_secret.txt", b"ALICE_ONLY")

        # Bob tries to download Alice's file
        with self.assertRaises(FileNotFoundError):
            self.service.download_file(file_a["file_id"], self.user_b)

        # Bob tries to delete Alice's file
        with self.assertRaises(FileNotFoundError):
            self.service.delete_file(file_a["file_id"], self.user_b)


if __name__ == "__main__":
    unittest.main()
