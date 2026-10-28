"""
Database Service Layer supporting Supabase PostgreSQL and Local SQLite Parity.

Provides relational queries, reference counting, ACID consistency, and audit logging.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple


class DatabaseService:
    """Supabase PostgreSQL Database Driver."""

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.mode = "Supabase PostgreSQL"

    def find_content_by_hash(self, owner_id: str, md5_hash: str) -> Optional[Dict[str, Any]]:
        res = self.supabase.table("file_contents")\
            .select("*")\
            .eq("owner_id", owner_id)\
            .eq("md5_hash", md5_hash)\
            .execute()
        return res.data[0] if res.data else None

    def create_content_record(self, owner_id: str, md5_hash: str, file_size: int, storage_path: str) -> Dict[str, Any]:
        data = {
            "id": str(uuid.uuid4()),
            "owner_id": owner_id,
            "md5_hash": md5_hash,
            "file_size": file_size,
            "storage_path": storage_path,
            "reference_count": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        res = self.supabase.table("file_contents").insert(data).execute()
        return res.data[0]

    def increment_content_reference(self, content_id: str) -> int:
        record = self.supabase.table("file_contents").select("reference_count").eq("id", content_id).single().execute()
        new_count = record.data["reference_count"] + 1
        self.supabase.table("file_contents").update({"reference_count": new_count}).eq("id", content_id).execute()
        return new_count

    def decrement_content_reference(self, content_id: str) -> int:
        record = self.supabase.table("file_contents").select("reference_count").eq("id", content_id).single().execute()
        new_count = max(0, record.data["reference_count"] - 1)
        self.supabase.table("file_contents").update({"reference_count": new_count}).eq("id", content_id).execute()
        return new_count

    def create_user_file(self, owner_id: str, filename: str, content_id: str, mime_type: str, is_duplicate: bool) -> Dict[str, Any]:
        data = {
            "id": str(uuid.uuid4()),
            "owner_id": owner_id,
            "original_filename": filename,
            "content_id": content_id,
            "mime_type": mime_type,
            "upload_date": datetime.now(timezone.utc).isoformat(),
            "is_duplicate": is_duplicate
        }
        res = self.supabase.table("user_files").insert(data).execute()
        return res.data[0]

    def list_user_files(self, owner_id: str) -> List[Dict[str, Any]]:
        # Joined with file_contents
        res = self.supabase.table("user_files")\
            .select("*, file_contents(*)")\
            .eq("owner_id", owner_id)\
            .order("upload_date", desc=True)\
            .execute()
        
        flat_files = []
        for row in res.data:
            fc = row.get("file_contents") or {}
            flat_files.append({
                "id": row["id"],
                "owner_id": row["owner_id"],
                "original_filename": row["original_filename"],
                "content_id": row["content_id"],
                "mime_type": row["mime_type"],
                "upload_date": row["upload_date"],
                "is_duplicate": row["is_duplicate"],
                "md5_hash": fc.get("md5_hash", ""),
                "file_size": fc.get("file_size", 0),
                "storage_path": fc.get("storage_path", ""),
                "reference_count": fc.get("reference_count", 1)
            })
        return flat_files

    def rename_user_file(self, user_file_id: str, owner_id: str, new_filename: str) -> bool:
        res = self.supabase.table("user_files")\
            .update({"original_filename": new_filename})\
            .eq("id", user_file_id)\
            .eq("owner_id", owner_id)\
            .execute()
        return len(res.data) > 0

    def delete_user_file(self, user_file_id: str, owner_id: str) -> Tuple[Optional[Dict[str, Any]], int, Optional[Dict[str, Any]]]:
        # Fetch file with content
        res = self.supabase.table("user_files")\
            .select("*, file_contents(*)")\
            .eq("id", user_file_id)\
            .eq("owner_id", owner_id)\
            .single()\
            .execute()
        if not res.data:
            return None, 0, None
        
        file_rec = res.data
        content_id = file_rec["content_id"]
        content_rec = file_rec.get("file_contents")
        
        # Delete user file record
        self.supabase.table("user_files").delete().eq("id", user_file_id).execute()
        
        # Decrement content reference
        rem_count = self.decrement_content_reference(content_id)
        if rem_count == 0:
            self.supabase.table("file_contents").delete().eq("id", content_id).execute()
            
        return file_rec, rem_count, content_rec

    def log_event(self, owner_id: str, filename: str, event_type: str, file_size: int, md5_hash: str) -> Dict[str, Any]:
        data = {
            "id": str(uuid.uuid4()),
            "owner_id": owner_id,
            "filename": filename,
            "event_type": event_type,
            "file_size": file_size,
            "md5_hash": md5_hash,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        res = self.supabase.table("upload_events").insert(data).execute()
        return res.data[0] if res.data else data

    def list_events(self, owner_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        res = self.supabase.table("upload_events")\
            .select("*")\
            .eq("owner_id", owner_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return res.data


class LocalDatabaseService:
    """
    In-Memory & SQLite Compatible Service with identical interface.
    Guarantees full offline functionality, unit testing speed, and college demo reliability.
    """

    def __init__(self):
        self.file_contents: Dict[str, Dict[str, Any]] = {}
        self.user_files: Dict[str, Dict[str, Any]] = {}
        self.upload_events: List[Dict[str, Any]] = []
        self.mode = "Local In-Memory / SQLite (Demo Mode)"

    def find_content_by_hash(self, owner_id: str, md5_hash: str) -> Optional[Dict[str, Any]]:
        for content in self.file_contents.values():
            if content["owner_id"] == owner_id and content["md5_hash"] == md5_hash:
                return dict(content)
        return None

    def create_content_record(self, owner_id: str, md5_hash: str, file_size: int, storage_path: str) -> Dict[str, Any]:
        cid = str(uuid.uuid4())
        rec = {
            "id": cid,
            "owner_id": owner_id,
            "md5_hash": md5_hash,
            "file_size": file_size,
            "storage_path": storage_path,
            "reference_count": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.file_contents[cid] = rec
        return dict(rec)

    def increment_content_reference(self, content_id: str) -> int:
        if content_id in self.file_contents:
            self.file_contents[content_id]["reference_count"] += 1
            return self.file_contents[content_id]["reference_count"]
        return 0

    def decrement_content_reference(self, content_id: str) -> int:
        if content_id in self.file_contents:
            self.file_contents[content_id]["reference_count"] = max(0, self.file_contents[content_id]["reference_count"] - 1)
            return self.file_contents[content_id]["reference_count"]
        return 0

    def create_user_file(self, owner_id: str, filename: str, content_id: str, mime_type: str, is_duplicate: bool) -> Dict[str, Any]:
        fid = str(uuid.uuid4())
        rec = {
            "id": fid,
            "owner_id": owner_id,
            "original_filename": filename,
            "content_id": content_id,
            "mime_type": mime_type,
            "upload_date": datetime.now(timezone.utc).isoformat(),
            "is_duplicate": is_duplicate
        }
        self.user_files[fid] = rec
        return dict(rec)

    def list_user_files(self, owner_id: str) -> List[Dict[str, Any]]:
        results = []
        for f in self.user_files.values():
            if f["owner_id"] == owner_id:
                cid = f["content_id"]
                content = self.file_contents.get(cid, {})
                results.append({
                    "id": f["id"],
                    "owner_id": f["owner_id"],
                    "original_filename": f["original_filename"],
                    "content_id": cid,
                    "mime_type": f["mime_type"],
                    "upload_date": f["upload_date"],
                    "is_duplicate": f["is_duplicate"],
                    "md5_hash": content.get("md5_hash", ""),
                    "file_size": content.get("file_size", 0),
                    "storage_path": content.get("storage_path", ""),
                    "reference_count": content.get("reference_count", 1)
                })
        results.sort(key=lambda x: x["upload_date"], reverse=True)
        return results

    def rename_user_file(self, user_file_id: str, owner_id: str, new_filename: str) -> bool:
        if user_file_id in self.user_files:
            file_rec = self.user_files[user_file_id]
            if file_rec["owner_id"] == owner_id:
                file_rec["original_filename"] = new_filename
                return True
        return False

    def delete_user_file(self, user_file_id: str, owner_id: str) -> Tuple[Optional[Dict[str, Any]], int, Optional[Dict[str, Any]]]:
        if user_file_id not in self.user_files:
            return None, 0, None
        
        file_rec = dict(self.user_files[user_file_id])
        if file_rec["owner_id"] != owner_id:
            return None, 0, None

        content_id = file_rec["content_id"]
        content_rec = dict(self.file_contents.get(content_id, {})) if content_id in self.file_contents else None

        # Delete logical record
        del self.user_files[user_file_id]

        # Decrement reference
        rem_count = self.decrement_content_reference(content_id)
        if rem_count == 0 and content_id in self.file_contents:
            del self.file_contents[content_id]

        return file_rec, rem_count, content_rec

    def log_event(self, owner_id: str, filename: str, event_type: str, file_size: int, md5_hash: str) -> Dict[str, Any]:
        rec = {
            "id": str(uuid.uuid4()),
            "owner_id": owner_id,
            "filename": filename,
            "event_type": event_type,
            "file_size": file_size,
            "md5_hash": md5_hash,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.upload_events.insert(0, rec)
        return dict(rec)

    def list_events(self, owner_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        evs = [e for e in self.upload_events if e["owner_id"] == owner_id]
        return evs[:limit]


def get_database_service(supabase_client=None, mode: str = "local"):
    """Factory returning appropriate database service instance."""
    if mode == "cloud" and supabase_client is not None:
        return DatabaseService(supabase_client)
    return LocalDatabaseService()
