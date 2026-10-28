"""
Automated Test Runner for Cloud-Based File Handling and Duplication Removal Using MD5.
Runs all unit and integration test suites using Python's standard unittest framework.
"""

import unittest
import sys
import os

if __name__ == "__main__":
    test_dir = os.path.dirname(__file__)
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=test_dir, pattern="test_*.py")
    
    runner = unittest.TextTestRunner(verbosity=2)
    print("=" * 75)
    print("RUNNING AUTOMATED TEST SUITE: MD5 CLOUD FILE DEDUPLICATION SYSTEM")
    print("=" * 75)
    result = runner.run(suite)
    
    print("-" * 75)
    print(f"Total Tests Run: {result.testsRun}")
    print(f"Errors: {len(result.errors)}")
    print(f"Failures: {len(result.failures)}")
    if result.wasSuccessful():
        print("ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)")
        sys.exit(0)
    else:
        print("TESTS COMPLETED WITH FAILURES.")
        sys.exit(1)
