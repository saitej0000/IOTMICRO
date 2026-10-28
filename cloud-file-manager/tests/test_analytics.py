"""
Unit tests for Storage Analytics calculations.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.analytics import AnalyticsService


class TestAnalytics(unittest.TestCase):
    """Verifies storage metrics calculation formulas and edge conditions."""

    def test_empty_files_returns_zeros(self):
        metrics = AnalyticsService.calculate_storage_metrics([])
        self.assertEqual(metrics["total_files"], 0)
        self.assertEqual(metrics["logical_bytes"], 0)
        self.assertEqual(metrics["physical_bytes"], 0)
        self.assertEqual(metrics["saved_bytes"], 0)
        self.assertEqual(metrics["optimization_pct"], 0.0)

    def test_single_file_no_deduplication(self):
        user_files = [
            {"content_id": "c1", "md5_hash": "hash1", "file_size": 1000, "original_filename": "f1.pdf"}
        ]
        m = AnalyticsService.calculate_storage_metrics(user_files)
        self.assertEqual(m["total_files"], 1)
        self.assertEqual(m["unique_contents"], 1)
        self.assertEqual(m["duplicates_count"], 0)
        self.assertEqual(m["logical_bytes"], 1000)
        self.assertEqual(m["physical_bytes"], 1000)
        self.assertEqual(m["saved_bytes"], 0)
        self.assertEqual(m["optimization_pct"], 0.0)

    def test_exact_deduplication_savings_math(self):
        # 3 copies of content A (500 bytes each) = 1500 logical, 500 physical
        # 2 copies of content B (1000 bytes each) = 2000 logical, 1000 physical
        # Total logical = 3500 bytes
        # Total physical = 1500 bytes
        # Saved = 2000 bytes
        # Optimization = (2000 / 3500) * 100 = 57.14%
        user_files = [
            {"content_id": "cA", "md5_hash": "hashA", "file_size": 500, "original_filename": "a1.txt"},
            {"content_id": "cA", "md5_hash": "hashA", "file_size": 500, "original_filename": "a2.txt"},
            {"content_id": "cA", "md5_hash": "hashA", "file_size": 500, "original_filename": "a3.txt"},
            {"content_id": "cB", "md5_hash": "hashB", "file_size": 1000, "original_filename": "b1.bin"},
            {"content_id": "cB", "md5_hash": "hashB", "file_size": 1000, "original_filename": "b2.bin"},
        ]
        m = AnalyticsService.calculate_storage_metrics(user_files)
        self.assertEqual(m["total_files"], 5)
        self.assertEqual(m["unique_contents"], 2)
        self.assertEqual(m["duplicates_count"], 3)
        self.assertEqual(m["logical_bytes"], 3500)
        self.assertEqual(m["physical_bytes"], 1500)
        self.assertEqual(m["saved_bytes"], 2000)
        self.assertEqual(m["optimization_pct"], 57.14)
        self.assertEqual(m["deduplication_ratio"], 2.33)


if __name__ == "__main__":
    unittest.main()
