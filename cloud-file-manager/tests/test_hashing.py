"""
Unit tests for MD5 and SHA-256 Hashing service.
Verifies hashing consistency, difference sensitivity, byte equality, and edge cases.
"""

import unittest
import sys
import os

# Add parent directory to path so services can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.hashing import (
    calculate_md5,
    calculate_sha256,
    verify_content_match,
    get_content_fingerprint,
)


class TestHashingService(unittest.TestCase):
    """Test suite verifying hash computation accuracy and invariants."""

    def test_identical_bytes_produce_identical_md5(self):
        """1. Identical file bytes must produce identical MD5 hashes."""
        payload1 = b"B.Tech IoT & Cloud Virtualization Micro Project 2026"
        payload2 = b"B.Tech IoT & Cloud Virtualization Micro Project 2026"
        
        hash1 = calculate_md5(payload1)
        hash2 = calculate_md5(payload2)
        
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 32)
        # Verify hex characters only
        int(hash1, 16)

    def test_different_contents_produce_different_hashes(self):
        """2. Different file contents produce different hashes."""
        payload_a = b"File Alpha version 1.0"
        payload_b = b"File Alpha version 1.1"
        
        hash_a = calculate_md5(payload_a)
        hash_b = calculate_md5(payload_b)
        
        self.assertNotEqual(hash_a, hash_b)

    def test_byte_verification_match(self):
        """Test exact byte comparison for zero false-positive collision check."""
        b1 = b"Sample Sensor Payload Data"
        b2 = b"Sample Sensor Payload Data"
        b3 = b"Sample Sensor Payload Data Diff"
        
        self.assertTrue(verify_content_match(b1, b2))
        self.assertFalse(verify_content_match(b1, b3))

    def test_sha256_dual_integrity(self):
        """Test optional SHA-256 fingerprint for collision-resistant architectures."""
        sample = b"Edge gateway node payload"
        fp = get_content_fingerprint(sample, include_sha256=True)
        
        self.assertIn("md5_hash", fp)
        self.assertIn("sha256_hash", fp)
        self.assertEqual(len(fp["sha256_hash"]), 64)
        self.assertEqual(fp["file_size"], len(sample))

    def test_invalid_types_raise_error(self):
        """Test that non-byte inputs raise ValueError."""
        with self.assertRaises(ValueError):
            calculate_md5("string instead of bytes") # type: ignore


if __name__ == "__main__":
    unittest.main()
