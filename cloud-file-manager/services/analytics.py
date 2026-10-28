"""
Storage Optimization & Deduplication Analytics Service.

Calculates:
- Logical storage (sum of all user file sizes)
- Physical content storage (sum of unique stored content blobs)
- Storage saved (bytes saved via single-instance storage)
- Storage optimization percentage
- Format and duplicate frequency breakdowns
"""

from typing import Dict, Any, List


class AnalyticsService:
    """Computes verifiable storage metrics from database records."""

    @staticmethod
    def calculate_storage_metrics(user_files: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Computes accurate deduplication metrics from active user file references.
        
        Args:
            user_files: List of file reference dictionaries containing 'content_id', 'file_size', etc.
            
        Returns:
            Dictionary with logical_bytes, physical_bytes, saved_bytes, optimization_ratio_pct, etc.
        """
        total_registered = len(user_files)
        if total_registered == 0:
            return {
                "total_files": 0,
                "unique_contents": 0,
                "duplicates_count": 0,
                "logical_bytes": 0,
                "physical_bytes": 0,
                "saved_bytes": 0,
                "optimization_pct": 0.0,
                "deduplication_ratio": 1.0,
                "format_breakdown": {},
                "top_duplicated": []
            }

        # Logical storage = sum of sizes of all active user files
        logical_bytes = sum(f.get("file_size", 0) for f in user_files)

        # Unique content objects (group by content_id or md5_hash)
        unique_contents = {}
        duplicates_count = 0
        format_breakdown = {}
        content_ref_counts = {}

        for f in user_files:
            cid = f.get("content_id") or f.get("md5_hash")
            size = f.get("file_size", 0)
            
            # Count unique contents
            if cid not in unique_contents:
                unique_contents[cid] = size
                content_ref_counts[cid] = {"hash": f.get("md5_hash", ""), "name": f.get("original_filename", ""), "size": size, "count": 1}
            else:
                duplicates_count += 1
                content_ref_counts[cid]["count"] += 1

            # Format breakdown
            ext = f.get("original_filename", "").split(".")[-1].lower() if "." in f.get("original_filename", "") else "other"
            format_breakdown[ext] = format_breakdown.get(ext, 0) + 1

        # Physical content storage = sum of unique content sizes
        physical_bytes = sum(unique_contents.values())

        # Storage saved = logical - physical
        saved_bytes = max(0, logical_bytes - physical_bytes)

        # Storage optimization percentage = (saved / logical) * 100
        optimization_pct = (saved_bytes / logical_bytes * 100.0) if logical_bytes > 0 else 0.0

        # Deduplication ratio = logical / physical
        dedup_ratio = (logical_bytes / physical_bytes) if physical_bytes > 0 else 1.0

        # Top duplicated contents
        top_duplicated = sorted(
            [v for v in content_ref_counts.values() if v["count"] > 1],
            key=lambda x: x["count"],
            reverse=True
        )[:5]

        return {
            "total_files": total_registered,
            "unique_contents": len(unique_contents),
            "duplicates_count": duplicates_count,
            "logical_bytes": logical_bytes,
            "physical_bytes": physical_bytes,
            "saved_bytes": saved_bytes,
            "optimization_pct": round(optimization_pct, 2),
            "deduplication_ratio": round(dedup_ratio, 2),
            "format_breakdown": format_breakdown,
            "top_duplicated": top_duplicated
        }

    @staticmethod
    def format_bytes(byte_count: int) -> str:
        """Formats byte count into human-readable string (KB, MB, GB)."""
        if byte_count < 1024:
            return f"{byte_count} B"
        elif byte_count < 1024 * 1024:
            return f"{byte_count / 1024:.2f} KB"
        elif byte_count < 1024 * 1024 * 1024:
            return f"{byte_count / (1024 * 1024):.2f} MB"
        else:
            return f"{byte_count / (1024 * 1024 * 1024):.2f} GB"
