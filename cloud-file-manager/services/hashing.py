"""
MD5 and SHA-256 Hashing Service for Content Deduplication.

Objective:
- Server-side cryptographic hash calculation from uploaded raw bytes.
- Never trust client-provided hashes.
- Detect duplicates even when filenames, extensions, or upload times differ.
- Provide SHA-256 dual verification option to guard against MD5 hash collisions.
"""

import hashlib
from typing import Dict, Any


def calculate_md5(file_bytes: bytes) -> str:
    """
    Computes standard 128-bit MD5 hex digest from raw file byte content.
    
    Args:
        file_bytes: Raw binary content of the uploaded file.
        
    Returns:
        32-character hexadecimal MD5 hash string.
        
    Raises:
        ValueError: If file_bytes is None or not bytes.
    """
    if not isinstance(file_bytes, (bytes, bytearray)):
        raise ValueError("Input must be binary bytes or bytearray.")
    return hashlib.md5(file_bytes).hexdigest().lower()


def calculate_sha256(file_bytes: bytes) -> str:
    """
    Computes 256-bit SHA-256 hex digest for cryptographic integrity verification.
    Used for collision avoidance and high-security file verification.
    """
    if not isinstance(file_bytes, (bytes, bytearray)):
        raise ValueError("Input must be binary bytes or bytearray.")
    return hashlib.sha256(file_bytes).hexdigest().lower()


def verify_content_match(bytes_a: bytes, bytes_b: bytes) -> bool:
    """
    Performs byte-by-byte direct equality check between two byte sequences.
    Ensures zero collision false-positives before reusing an existing storage object.
    """
    if len(bytes_a) != len(bytes_b):
        return False
    return bytes_a == bytes_b


def get_content_fingerprint(file_bytes: bytes, include_sha256: bool = False) -> Dict[str, Any]:
    """
    Generates a structured content fingerprint containing size, MD5, and optional SHA-256.
    """
    if not isinstance(file_bytes, (bytes, bytearray)):
        raise ValueError("Input must be binary bytes or bytearray.")
        
    size = len(file_bytes)
    md5 = calculate_md5(file_bytes)
    
    result = {
        "md5_hash": md5,
        "file_size": size,
        "is_empty": size == 0,
    }
    
    if include_sha256:
        result["sha256_hash"] = calculate_sha256(file_bytes)
        
    return result
